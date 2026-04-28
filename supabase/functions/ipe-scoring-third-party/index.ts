// supabase/functions/ipe-scoring-third-party/index.ts
// ============================================================
// W20.6 — Scoring de respostas de terceiros.
// Recebe invite_id, mapeia question_id → linhas (α/β), chama Sonnet
// por linha pra determinar faixa A/B/C/D, salva em third_party_scoring.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const DEPLOY_FINGERPRINT = "w20.6-scoring-third-party-v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

// Mapeamento question_id → linhas cobertas, por question_set
const LINE_MAPS: Record<"alpha" | "beta", Record<string, string[]>> = {
  alpha: {
    q1: ["L1.1", "L1.2"],
    q2: ["L2.1", "L2.4"],
    q3: ["L3.1", "L3.4"],
    q4: ["L4.1"],
    q5: ["L4.3"],
  },
  beta: {
    q1: ["L1.3", "L1.4"],
    q2: ["L2.2", "L2.3"],
    q3: ["L3.2", "L3.3"],
    q4: ["L4.2"],
    q5: ["L4.4"],
  },
};

interface ScoreOutput {
  il_numerico: number;
  faixa: "A" | "B" | "C" | "D";
  confianca: number;
  evidencia: string;
}

function parseScoreJson(raw: string): ScoreOutput | null {
  if (!raw) return null;
  let candidate = raw.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) candidate = fence[1].trim();
  const obj = candidate.match(/\{[\s\S]*\}/);
  if (obj) candidate = obj[0];
  try {
    const parsed = JSON.parse(candidate);
    if (
      typeof parsed?.il_numerico === "number" &&
      ["A", "B", "C", "D"].includes(parsed?.faixa) &&
      typeof parsed?.confianca === "number"
    ) {
      return {
        il_numerico: parsed.il_numerico,
        faixa: parsed.faixa,
        confianca: parsed.confianca,
        evidencia: typeof parsed.evidencia === "string" ? parsed.evidencia : "",
      };
    }
  } catch {}
  return null;
}

async function scoreLineWithLLM(
  anthropic: Anthropic,
  promptText: string,
  line: string,
  scale_value: number | null,
  episode_text: string | null,
  open_text: string | null
): Promise<ScoreOutput | null> {
  const userContent = `LINHA: ${line}
ESCALA: ${scale_value ?? "(não respondida)"}
EPISÓDIO: ${episode_text ?? "(vazio)"}
COMENTÁRIO: ${open_text ?? "(vazio)"}

Avalie e retorne JSON conforme instruído.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 300,
      temperature: 0.2,
      system: promptText,
      messages: [{ role: "user", content: userContent }],
    });
    const c = response.content[0];
    if (!c || !("text" in c)) return null;
    return parseScoreJson(c.text.trim());
  } catch (err: any) {
    console.error("[ipe-scoring-third-party] LLM error:", err.message);
    return null;
  }
}

Deno.serve(async (req) => {
  console.log(`[${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const { invite_id } = body;
  if (!invite_id) return json({ error: "Missing invite_id" }, 400);

  const supabase_url = Deno.env.get("SUPABASE_URL");
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500);

  const admin = createClient(supabase_url, service_role);

  // Busca invite
  const { data: invite, error: invErr } = await admin
    .from("third_party_invites")
    .select("id, ipe_cycle_id, status, question_set")
    .eq("id", invite_id)
    .single();
  if (invErr || !invite) return json({ error: "Invite not found" }, 404);
  if (invite.status !== "submitted") return json({ error: "Invite not submitted yet" }, 400);

  const set = (invite.question_set === "beta" ? "beta" : "alpha") as "alpha" | "beta";
  const lineMap = LINE_MAPS[set];

  // Busca responses
  const { data: responses, error: respErr } = await admin
    .from("third_party_responses")
    .select("question_id, scale_value, open_text, episode_text")
    .eq("invite_id", invite_id);
  if (respErr) return json({ error: "Fetch responses failed", detail: respErr.message }, 500);
  if (!responses || responses.length === 0) {
    return json({ error: "No responses to score" }, 400);
  }

  // Busca prompt
  const { data: promptRow } = await admin
    .from("prompt_versions")
    .select("prompt_text, version")
    .eq("component", "scoring_third_party_generic")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!promptRow?.prompt_text) {
    return json({ error: "Prompt not found" }, 500);
  }

  const anthropic_key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropic_key) return json({ error: "Missing ANTHROPIC_API_KEY" }, 500);
  const anthropic = new Anthropic({ apiKey: anthropic_key });

  // Pra cada question_id, identifica linhas cobertas, scora cada linha
  const corpus_linhas: Record<string, any> = {};
  const lineScoringTasks: Array<Promise<{ line: string; output: ScoreOutput | null; sourceQid: string }>> = [];

  for (const r of responses) {
    if (r.question_id === "calibration" || r.question_id === "__contact__") continue;
    const lines = lineMap[r.question_id] ?? [];
    if (lines.length === 0) continue;
    for (const line of lines) {
      lineScoringTasks.push(
        scoreLineWithLLM(
          anthropic,
          promptRow.prompt_text,
          line,
          r.scale_value,
          r.episode_text,
          r.open_text
        ).then(output => ({ line, output, sourceQid: r.question_id }))
      );
    }
  }

  // Roda em paralelo (8 calls)
  const results = await Promise.all(lineScoringTasks);

  for (const { line, output, sourceQid } of results) {
    if (!output) {
      // fallback: status incompleto pra essa linha
      corpus_linhas[line] = {
        IL_sinal: { numerico: 4.0, faixa: "C", cortes: {} },
        FD_linha: 0.5,
        status_sinal: "incompleto",
        source_question_id: sourceQid,
        scoring_failed: true,
      };
      continue;
    }
    corpus_linhas[line] = {
      IL_sinal: {
        numerico: output.il_numerico,
        faixa: output.faixa,
        cortes: {},
      },
      FD_linha: output.confianca,
      status_sinal: "completo",
      source_question_id: sourceQid,
      evidencia: output.evidencia,
    };
  }

  // Persiste em third_party_scoring (UPSERT por invite_id)
  const { error: upErr } = await admin
    .from("third_party_scoring")
    .upsert([{
      ipe_cycle_id: invite.ipe_cycle_id,
      invite_id: invite.id,
      corpus_linhas,
      question_set: set,
      prompt_version_used: promptRow.version,
      computed_at: new Date().toISOString(),
    }], { onConflict: "invite_id" });
  if (upErr) {
    return json({ error: "Persist failed", detail: upErr.message }, 500);
  }

  return json({
    ok: true,
    invite_id,
    question_set: set,
    lines_scored: Object.keys(corpus_linhas).length,
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
});
