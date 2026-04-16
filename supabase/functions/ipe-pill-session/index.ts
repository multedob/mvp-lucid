// ============================================================
// ipe-pill-session/index.ts
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.0, §4 + §6.1
//        PILL_I–VI_Prototipo v0.3
// Responsabilidade: persiste cada momento da Pill (M1→M5).
//   Sem chamadas LLM — apenas persistência de estado.
//   Após M4: dispara ipe-scoring de forma assíncrona.
//   Valida estrutura M3/M4 por Pill antes de persistir.
//   M1: registra tempo de pausa (passivo — medido pela UI).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateM3,
  validateM4,
  type PillId,
  type PillMoment,
  type M2CalSignals,
} from "../_shared/ipe_types.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const VALID_PILLS:   PillId[]    = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];
const VALID_MOMENTS: PillMoment[] = ["M1", "M2", "M3", "M4", "M5"];
const ALL_PILLS:     PillId[]    = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];

// C5 — Validação de sequência de momentos
// Regra: cada momento só pode ser enviado se o anterior já está registrado.
// M1 → sempre aceito (primeiro momento)
// M2 → requer M1 (m1_tempo_segundos não nulo)
// M3 → requer M2 (m2_resposta não nulo)
// M4 → requer M3 (m3_respostas não nulo)
// M5 → requer M4 (completed_at não nulo = M4 persistido)
function validateMomentSequence(
  moment: PillMoment,
  existing: Record<string, unknown> | null
): string | null {
  if (moment === "M1") return null; // sempre aceito
  if (!existing) return `Momento ${moment} requer momento anterior — pill_response não iniciada`;

  if (moment === "M2" && existing.m1_tempo_segundos == null)
    return "M2 requer M1 registrado (m1_tempo_segundos ausente)";
  if (moment === "M3" && !existing.m2_resposta)
    return "M3 requer M2 registrado (m2_resposta ausente)";
  if (moment === "M4" && !existing.m3_respostas)
    return "M4 requer M3 registrado (m3_respostas ausente)";
  if (moment === "M5" && !existing.completed_at)
    return "M5 requer M4 registrado (completed_at ausente)";

  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST")    return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "UNAUTHORIZED", message: "Missing authorization" }, 401);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400); }

  if (typeof body.ipe_cycle_id !== "string")
    return json({ error: "INVALID_INPUT", message: "ipe_cycle_id required" }, 400);
  if (!VALID_PILLS.includes(body.pill_id as PillId))
    return json({ error: "INVALID_INPUT", message: "pill_id inválido" }, 400);
  if (!VALID_MOMENTS.includes(body.moment as PillMoment))
    return json({ error: "INVALID_INPUT", message: "moment inválido" }, 400);
  if (!body.payload || typeof body.payload !== "object")
    return json({ error: "INVALID_INPUT", message: "payload required" }, 400);

  const ipe_cycle_id = body.ipe_cycle_id as string;
  const pill_id      = body.pill_id as PillId;
  const moment       = body.moment as PillMoment;
  const payload      = body.payload as Record<string, unknown>;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);

  const { data: cycle, error: cycleErr } = await supabase
    .from("ipe_cycles")
    .select("id, status, pills_completed, prompt_version")
    .eq("id", ipe_cycle_id)
    .eq("user_id", user.id)
    .single();

  if (cycleErr || !cycle) return json({ error: "NOT_FOUND", message: "Cycle not found" }, 404);
  if (cycle.status === "complete" || cycle.status === "abandoned") {
    return json({ error: "INVALID_INPUT", message: `Cycle is ${cycle.status}` }, 400);
  }

  const { data: existing } = await supabase
    .from("pill_responses")
    .select("id, m1_tempo_segundos, m2_resposta, m3_respostas, m4_resposta, completed_at")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .eq("pill_id", pill_id)
    .maybeSingle();

  // C5 — Validação de sequência de momentos
  // Garante que momentos dependentes só sejam aceitos após os anteriores estarem registrados.
  // Sem isso, M4 pode ser enviado sem M3, corrompendo o corpus de scoring.
  const sequenceError = validateMomentSequence(moment, existing ?? null);
  if (sequenceError) {
    return json({ error: "INVALID_INPUT", message: sequenceError }, 400);
  }

  const pill_response_id: string = existing?.id ?? crypto.randomUUID();

  let update: Record<string, unknown> = {};
  let next_moment: PillMoment | null  = null;
  let scoring_triggered               = false;

  switch (moment) {
    case "M1": {
      // M1: tempo de pausa medido passivamente pela UI
      // Pausa >= 8s = sinal de ressonância alta (PROTOCOLO §8.1)
      const tempo = payload.tempo_segundos;
      if (typeof tempo !== "number" || tempo < 0) {
        return json({ error: "INVALID_INPUT", message: "M1 requires tempo_segundos: number >= 0" }, 400);
      }
      // variation_key: tracks which content variation was shown to the user
      // Optional for backward compatibility (null = legacy/V1 hardcoded content)
      const variation_key = (body.variation_key as string) ?? null;
      // Reset all subsequent fields when re-starting a pill
      update = {
        m1_tempo_segundos: tempo,
        ...(variation_key ? { variation_key } : {}),
        m2_resposta: null,
        m2_cal_signals: null,
        m2_audio_url: null,
        m2_transcription_live: null,
        m2_transcription_final: null,
        m2_audio_duration_ms: null,
        m3_respostas: null,
        m4_resposta: null,
        m4_audio_url: null,
        m4_transcription_live: null,
        m4_transcription_final: null,
        m4_audio_duration_ms: null,
        completed_at: null,
        eco_text: null,
      };
      next_moment = "M2";
      break;
    }

    case "M2": {
      const resposta = payload.resposta;
      if (typeof resposta !== "string" || !resposta.trim()) {
        return json({ error: "INVALID_INPUT", message: "M2 requires resposta: string" }, 400);
      }
      // Optional audio metadata (present when user used the mic).
      // All four fields are nullable — text-only responses leave them null.
      const audioUrl        = typeof payload.audio_url === "string" ? payload.audio_url : null;
      const transcLive      = typeof payload.transcription_live === "string" ? payload.transcription_live : null;
      const transcFinal     = typeof payload.transcription_final === "string" ? payload.transcription_final : null;
      const audioDurationMs = typeof payload.audio_duration_ms === "number" ? payload.audio_duration_ms : null;
      update = {
        m2_resposta:             resposta,
        m2_cal_signals:          (payload.cal_signals as M2CalSignals) ?? null,
        m2_audio_url:            audioUrl,
        m2_transcription_live:   transcLive,
        m2_transcription_final:  transcFinal,
        m2_audio_duration_ms:    audioDurationMs,
      };
      next_moment = "M3";
      break;
    }

    case "M3": {
      // Validação estrutural M3 por Pill
      // Fonte: PILL_I–VI_Prototipo v0.3 — chaves M3_1_regua, M3_2_escolha, M3_3_inventario
      // com subchaves Pill-específicas em M3_3_inventario
      const m3 = payload as Record<string, unknown>;
      const m3Error = validateM3(pill_id, m3);
      if (m3Error) {
        return json({ error: "INVALID_INPUT", message: `M3 inválido para ${pill_id}: ${m3Error}` }, 400);
      }
      update      = { m3_respostas: m3 };
      next_moment = "M4";
      break;
    }

    case "M4": {
      // M4 é JSONB com subchaves Pill-específicas
      // PI:  { percepcao, presenca_deslocamento } → L4.4 corpus primário
      // PV:  { percepcao, conhecimento_em_campo, presenca_para_outros } → L4.3 corpus primário
      // outros: { percepcao, presenca_para_outros } → L4.4 corpus_transversal
      const m4 = payload.m4 as Record<string, unknown> | undefined;
      if (!m4 || typeof m4 !== "object") {
        return json({ error: "INVALID_INPUT", message: "M4 requires payload.m4: object" }, 400);
      }
      const m4Error = validateM4(pill_id, m4);
      if (m4Error) {
        return json({ error: "INVALID_INPUT", message: `M4 inválido para ${pill_id}: ${m4Error}` }, 400);
      }
      // Optional audio metadata (same pattern as M2).
      const audioUrl        = typeof payload.audio_url === "string" ? payload.audio_url : null;
      const transcLive      = typeof payload.transcription_live === "string" ? payload.transcription_live : null;
      const transcFinal     = typeof payload.transcription_final === "string" ? payload.transcription_final : null;
      const audioDurationMs = typeof payload.audio_duration_ms === "number" ? payload.audio_duration_ms : null;
      update = {
        m4_resposta:             m4,
        completed_at:            new Date().toISOString(),
        m4_audio_url:            audioUrl,
        m4_transcription_live:   transcLive,
        m4_transcription_final:  transcFinal,
        m4_audio_duration_ms:    audioDurationMs,
      };
      next_moment       = "M5";
      scoring_triggered = true;
      break;
    }

    case "M5": {
      // M5: usuário visualizou o Eco
      // eco_text: enviado pela UI após receber o texto de ipe-eco
      // Se não vier no payload, ficará null até ipe-eco persistir diretamente
      const eco_text = payload.eco_text as string | undefined;
      if (eco_text) update = { eco_text };
      next_moment = null;
      break;
    }
  }

  const { error: upsertErr } = await supabase
    .from("pill_responses")
    .upsert(
      { id: pill_response_id, ipe_cycle_id, pill_id, ...update },
      { onConflict: "ipe_cycle_id,pill_id" }
    );

  if (upsertErr) {
    console.error("PILL_RESPONSE_UPSERT_ERROR:", upsertErr);
    return json({ error: "INTERNAL_ERROR", message: "Failed to persist pill response" }, 500);
  }

  // ─── M1 re-start: limpar ciclo e scoring antigo
  if (moment === "M1") {
    const completedSet = new Set<string>(cycle.pills_completed ?? []);
    if (completedSet.has(pill_id)) {
      completedSet.delete(pill_id);
      await supabase.from("ipe_cycles").update({
        pills_completed: Array.from(completedSet),
        status: "pills",
      }).eq("id", ipe_cycle_id);
    }
    // Clear old scoring data for this pill
    await supabase.from("pill_scoring")
      .delete()
      .eq("ipe_cycle_id", ipe_cycle_id)
      .eq("pill_id", pill_id);
  }

  if (moment === "M4") {
    const completedSet = new Set<string>(cycle.pills_completed ?? []);
    completedSet.add(pill_id);
    const allDone = ALL_PILLS.every((p) => completedSet.has(p));

    // Registrar prompt_version no ciclo para rastreabilidade (PIPELINE §4.4)
    let promptVersion = cycle.prompt_version;
    if (!promptVersion) {
      const { data: pv } = await supabase
        .from("prompt_versions")
        .select("version")
        .eq("component", `scoring_pill_${pill_id}`)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      promptVersion = pv?.version ?? null;
    }

    const { error: cycleUpdateErr } = await supabase
      .from("ipe_cycles")
      .update({
        pills_completed: Array.from(completedSet),
        status:          allDone ? "questionnaire" : "pills",
        ...(promptVersion ? { prompt_version: promptVersion } : {}),
      })
      .eq("id", ipe_cycle_id);

    if (cycleUpdateErr) {
      console.error("CYCLE_UPDATE_ERROR:", cycleUpdateErr, { ipe_cycle_id, pill_id, completedSet: Array.from(completedSet) });
      return json({ error: "CYCLE_UPDATE_FAILED", message: "pills_completed update failed" }, 500);
    }
  }

  // ─── Disparar ipe-scoring (fire-and-forget após M4)
  // scoring_triggered = true: UI deve aguardar eco antes de avançar para M5
  // Implementação: polling em pill_scoring.scored_at OU Supabase Realtime subscription
  if (scoring_triggered) {
    const scoringUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ipe-scoring`;
    fetch(scoringUrl, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ ipe_cycle_id, pill_id }),
    }).catch((err) => console.error("IPE_SCORING_TRIGGER_ERROR:", err));
  }

  return json({ pill_response_id, next_moment, scoring_triggered }, 200);
});
