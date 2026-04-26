import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";
import { detectPatternLLM, HINT_TO_OPERATOR } from "../_shared/eco/llm-detector.ts";
import type { DetectorOutput } from "../_shared/eco/llm-detector.ts";

// ============================================================
// V2.C.2 — ARQUITETURA HIBRIDA
// 1. Detector LLM (Haiku) identifica operator_hint
// 2. Renderer LLM (Sonnet) gera eco-CONVITE com padrão pré-detectado
// 3. Backend sorteia CTA contextual da tabela reed_ctas (anti-repetição)
// 4. Frontend renderiza eco_lines como prosa contínua + CTA no botão
// ============================================================

const VALID_HINTS = [
  "cost", "weight", "paradox", "silence", "temporal_shift",
  "inversion", "cycle", "repetition", "absence", "contradiction",
] as const;

type OperatorHint = typeof VALID_HINTS[number];

interface EcoStructured {
  eco_lines: string[];
  microtitle: string | null;
  operator_hint: OperatorHint;
  node_resonance_used: boolean;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  // Wave 12 — adicionado 'apikey' (supabase-js cliente envia por padrão; sem isso preflight CORS falha → "Failed to fetch")
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const PILL_META: Record<string, { tensao: string; proibicoes: string }> = {
  PI:   { tensao: "I ↔ Belonging",        proibicoes: `"pertencimento", "você sempre foi", "lugar de origem".` },
  PII:  { tensao: "I ↔ Role",             proibicoes: `"papel", "função", "missão", "vocação".` },
  PIII: { tensao: "Presence ↔ Distance",  proibicoes: `"agora você sabe", "valeu a pena", "superou".` },
  PIV:  { tensao: "Clarity ↔ Action",     proibicoes: `"agora é hora de agir", "basta executar".` },
  PV:   { tensao: "Inside ↔ Outside",     proibicoes: `"sua missão", "seu propósito".` },
  PVI:  { tensao: "Movement ↔ Pause",     proibicoes: `"você precisa descansar", "se cuide", "tire um tempo".` },
};

interface PillResponse {
  ipe_cycle_id: string;
  pill_id: string;
  m2_resposta?: string;
  m3_respostas?: Record<string, string>;
  m4_resposta?: Record<string, unknown>;
  eco_text?: string;
}

// ─── Parse JSON do Sonnet ─────────────────────────────────────────

// Wave 12 — normaliza string pra comparação semântica (lower + trim + sem pontuação final)
function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[.…!?]+\s*$/u, "").trim();
}

function parseEcoJsonV2c2(raw: string): EcoStructured | null {
  if (!raw) return null;
  let candidate = raw.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) candidate = fence[1].trim();
  const obj = candidate.match(/\{[\s\S]*\}/);
  if (obj) candidate = obj[0];

  let parsed: any;
  try { parsed = JSON.parse(candidate); }
  catch { return null; }

  if (!Array.isArray(parsed?.eco_lines) || parsed.eco_lines.length === 0) return null;
  if (!parsed.eco_lines.every((l: any) => typeof l === "string")) return null;
  if (parsed.eco_lines.length > 6) return null;
  if (!VALID_HINTS.includes(parsed.operator_hint)) return null;

  // Wave 12 — pós-processamento anti-repetição (LLM não respeita prompt sozinho)
  let eco_lines: string[] = parsed.eco_lines.map((l: string) => l.trim());
  let microtitle: string | null =
    typeof parsed.microtitle === "string" && parsed.microtitle.trim()
      ? parsed.microtitle.trim().toLowerCase()
      : null;

  // 1. Remove eco_lines duplicadas consecutivas (ex: ["recusa.", "recusa.", ...])
  const dedup_lines: string[] = [];
  for (const line of eco_lines) {
    const prev = dedup_lines[dedup_lines.length - 1];
    if (prev === undefined || normalizeForCompare(prev) !== normalizeForCompare(line)) {
      dedup_lines.push(line);
    } else {
      console.warn("[eco] removed consecutive duplicate line:", line);
    }
  }
  eco_lines = dedup_lines;

  // 2. Se microtitle == primeira linha (após normalização), zera microtitle
  // (sistema renderiza microtitle ANTES de eco_lines — repetir gera "X / X / ...")
  if (microtitle && eco_lines.length > 0
      && normalizeForCompare(microtitle) === normalizeForCompare(eco_lines[0])) {
    console.warn("[eco] microtitle == first line, dropping microtitle:", microtitle);
    microtitle = null;
  }

  // 3. Sanidade: precisa sobrar pelo menos 1 linha após dedupe
  if (eco_lines.length === 0) return null;

  return {
    eco_lines,
    microtitle,
    operator_hint: parsed.operator_hint,
    node_resonance_used: parsed.node_resonance_used === true,
  };
}

function ecoLinesToText(s: EcoStructured): string {
  const parts: string[] = [];
  if (s.microtitle) parts.push(s.microtitle);
  parts.push(...s.eco_lines);
  return parts.join("\n");
}

// ─── Sorteio CTA contextual com anti-repetição ────────────────────

async function pickContextualCTA(
  supabase: any,
  hint: string,
  ipe_cycle_id: string,
): Promise<string> {
  try {
    const { data: ctas, error } = await supabase
      .from("reed_ctas")
      .select("text_pt_br")
      .eq("hint", hint)
      .eq("active", true);

    if (error || !ctas || ctas.length === 0) {
      return "conversar com reed →"; // fallback genérico
    }

    // Anti-repetição: pega últimos CTAs usados no ciclo
    const { data: recent } = await supabase
      .from("pill_eco_events")
      .select("raw_payload")
      .eq("ipe_cycle_id", ipe_cycle_id)
      .order("rendered_at", { ascending: false })
      .limit(5);

    const recent_ctas = new Set<string>(
      (recent ?? [])
        .map((r: any) => r.raw_payload?.cta_text)
        .filter((c: any): c is string => typeof c === "string"),
    );

    const candidates = ctas.filter((c: any) => !recent_ctas.has(c.text_pt_br));
    const pool = candidates.length > 0 ? candidates : ctas;
    return pool[Math.floor(Math.random() * pool.length)].text_pt_br;
  } catch (err) {
    console.error("[pickContextualCTA] error:", err);
    return "conversar com reed →";
  }
}

// ─── Persistência ────────────────────────────────────────────────

async function persistEcoEvent(
  supabase: any,
  ipe_cycle_id: string,
  pill_id: string,
  operator_id: string,
  is_fallback: boolean,
  latency_ms: number,
  eco: EcoStructured | null,
  cta_text: string,
  detector_output: DetectorOutput | null,
  prompt_version: string,
): Promise<void> {
  try {
    await supabase.from("pill_eco_events").insert([{
      ipe_cycle_id,
      pill_id,
      operator: operator_id,
      variation: "V0",
      is_fallback,
      latency_ms: Math.round(latency_ms),
      locale: "pt-BR",
      rendered_at: new Date().toISOString(),
      raw_payload: {
        eco_lines: eco?.eco_lines ?? [],
        microtitle: eco?.microtitle ?? null,
        cta_text,
        detector: detector_output,
        prompt_version,
      },
      node_resonance_used: eco?.node_resonance_used ?? false,
    }]);
  } catch (err) {
    console.error("[persistEcoEvent] error:", err);
  }
}

async function persistEcoText(
  ipe_cycle_id: string,
  pill_id: string,
  eco_text: string,
  prompt_version_used: string,
) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await admin
    .from("pill_responses")
    .update({ eco_text, completed_at: new Date().toISOString(), prompt_version_used })
    .eq("ipe_cycle_id", ipe_cycle_id)
    .eq("pill_id", pill_id);
  if (error) console.error("[persistEcoText] error:", JSON.stringify(error));
}

// Wave 12 — extrai recursivamente strings não-vazias de qualquer estrutura aninhada
// Bug fix: m3_respostas no formato novo é objeto aninhado (M3_1_regua, M3_2_escolha, M3_3_inventario).
// Object.values() retornava esses objetos; .join() virava "[object Object]" e detector recebia lixo.
function extractStringsRecursive(obj: unknown, acc: string[] = []): string[] {
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    if (trimmed.length > 0) acc.push(trimmed);
  } else if (Array.isArray(obj)) {
    obj.forEach(v => extractStringsRecursive(v, acc));
  } else if (obj && typeof obj === "object") {
    Object.values(obj).forEach(v => extractStringsRecursive(v, acc));
  }
  return acc;
}

// Wave 12 — extrai strings com path (pra renderer ver "M3.M3_1_regua.duas_palavras: ...")
function flattenStringsWithPath(obj: unknown, prefix: string, acc: string[] = []): string[] {
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    if (trimmed.length > 0) acc.push(`${prefix}: ${trimmed}`);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => flattenStringsWithPath(v, `${prefix}[${i}]`, acc));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      flattenStringsWithPath(v, prefix ? `${prefix}.${k}` : k, acc);
    }
  }
  return acc;
}

// ─── Corpus pro Sonnet com detector_output injetado ──────────────

function buildCorpusForRenderer(
  pill_response: PillResponse,
  detector: DetectorOutput,
  node_text: string | null,
): string {
  let corpus = "";

  corpus += "=== PADRÃO DETECTADO ===\n";
  corpus += `operator_hint: ${detector.operator_hint}\n`;
  corpus += `theme: ${detector.theme}\n`;
  corpus += `fragments: ${JSON.stringify(detector.fragments)}\n`;
  corpus += `reasoning: ${detector.reasoning}\n`;
  corpus += `confidence: ${detector.confidence.toFixed(2)}\n\n`;

  corpus += "=== O QUE A PESSOA DISSE ===\n";
  if (pill_response.m2_resposta) corpus += `M2: ${pill_response.m2_resposta}\n`;
  // Wave 12 — flatten recursivo: cobre formato NOVO (M3_1_regua/M3_2_escolha/M3_3_inventario aninhado)
  // e formato ANTIGO (chaves flat). Sem isso, objetos viravam "[object Object]".
  if (pill_response.m3_respostas) {
    for (const line of flattenStringsWithPath(pill_response.m3_respostas, "M3")) {
      corpus += `${line}\n`;
    }
  }
  if (pill_response.m4_resposta) {
    for (const line of flattenStringsWithPath(pill_response.m4_resposta, "M4")) {
      corpus += `${line}\n`;
    }
  }

  if (node_text) {
    corpus += "\n=== CONCEPTUAL RESONANCE (node) ===\n";
    corpus += node_text + "\n";
  }

  const meta = PILL_META[pill_response.pill_id];
  if (meta) {
    corpus += "\n=== TENSÃO E PROIBIÇÕES ===\n";
    corpus += `tensão: ${meta.tensao}\n`;
    corpus += `proibições: ${meta.proibicoes}\n`;
  }

  return corpus;
}

// ─── Node selector (mantido do v2.c.1) ────────────────────────────

const selectEcoNode = async (supabase: any, cgg: number | null): Promise<string | null> => {
  try {
    const stage = cgg ?? 1.0;
    const { data, error } = await supabase
      .from("rag_corpus")
      .select("node_id, content_text, stage_min, stage_max, scores")
      .lte("stage_min", stage)
      .gte("stage_max", stage)
      .eq("density_class", 1)
      .order("node_id");
    if (error || !data || data.length === 0) return null;

    const safe = data.filter((n: any) => {
      const s = n.scores;
      if (!s) return true;
      return (s.teleology_score ?? 0) === 0 && (s.prescriptive_score ?? 0) === 0 && (s.normative_score ?? 0) === 0;
    });
    const pool = safe.length > 0 ? safe : data;
    return pool[Math.floor(Math.random() * pool.length)].content_text || null;
  } catch (err) {
    console.error("selectEcoNode error:", err);
    return null;
  }
};

const fetchCgg = async (supabase: any, user_id: string): Promise<number | null> => {
  try {
    const { data: cycle } = await supabase
      .from("cycles").select("id").eq("user_id", user_id).order("id", { ascending: false }).limit(1).single();
    if (!cycle) return null;
    const { data: snap } = await supabase
      .from("structural_snapshots").select("snapshot_json").eq("cycle_id", cycle.id).single();
    return snap?.snapshot_json?.cgg ? parseFloat(snap.snapshot_json.cgg) : null;
  } catch { return null; }
};

// ─── Handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const auth_header = req.headers.get("Authorization");
  if (!auth_header) return json({ error: "Missing authorization" }, 401);

  const token = auth_header.replace("Bearer ", "");
  const supabase_url = Deno.env.get("SUPABASE_URL");
  const supabase_key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabase_url || !supabase_key) return json({ error: "Missing config" }, 500);

  const supabase = createClient(supabase_url, supabase_key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: auth_data, error: auth_error } = await supabase.auth.getUser(token);
  if (auth_error || !auth_data.user) return json({ error: "Unauthorized" }, 401);
  const user_id = auth_data.user.id;

  const body = await req.json().catch(() => ({}));
  const { ipe_cycle_id, pill_id } = body;
  const force_regenerate = body?.force_regenerate === true;
  if (!ipe_cycle_id || !pill_id) return json({ error: "Missing ipe_cycle_id or pill_id" }, 400);

  const { data: cycle_data, error: cycle_error } = await supabase
    .from("ipe_cycles").select("id, user_id").eq("id", ipe_cycle_id).single();
  if (cycle_error || !cycle_data || cycle_data.user_id !== user_id) {
    return json({ error: "Cycle not found or unauthorized" }, 404);
  }

  const { data: pill_response_data, error: pill_error } = await supabase
    .from("pill_responses").select("*").eq("ipe_cycle_id", ipe_cycle_id).eq("pill_id", pill_id).single();
  if (pill_error || !pill_response_data) return json({ error: "Pill response not found" }, 404);

  const pill_response: PillResponse = pill_response_data;
  const component = `eco_${pill_id}`;

  // Idempotência — busca último hint detectado pra sortear CTA contextual
  if (pill_response.eco_text && !force_regenerate) {
    let cached_hint = "cost";
    try {
      const { data: lastEvt } = await supabase
        .from("pill_eco_events")
        .select("raw_payload")
        .eq("ipe_cycle_id", ipe_cycle_id)
        .eq("pill_id", pill_id)
        .order("rendered_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastHint = lastEvt?.raw_payload?.detector?.operator_hint;
      if (typeof lastHint === "string" && VALID_HINTS.includes(lastHint as OperatorHint)) {
        cached_hint = lastHint;
      }
    } catch (err) {
      console.error("[cached path hint lookup] error:", err);
    }
    const cached_cta = await pickContextualCTA(supabase, cached_hint, ipe_cycle_id);
    return json({
      eco_text: pill_response.eco_text,
      eco_lines: pill_response.eco_text.split("\n").filter(Boolean),
      microtitle: null,
      operator_hint: cached_hint,
      cta_text: cached_cta,
      cached: true,
    });
  }

  const anthropic_key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropic_key) return json({ error: "missing ANTHROPIC_API_KEY" }, 500);
  const anthropic = new Anthropic({ apiKey: anthropic_key });

  const t0 = Date.now();

  // ─── ETAPA 1: DETECTOR (Haiku) ──────────────────────────────
  // Wave 12 — flatten recursivo: m3_respostas/m4_resposta aninhados (formato novo)
  // tinham Object.values() retornando objetos, virando "[object Object]" no .join()
  const corpus_for_detector = [
    pill_response.m2_resposta ?? "",
    ...(pill_response.m3_respostas ? extractStringsRecursive(pill_response.m3_respostas) : []),
    ...(pill_response.m4_resposta ? extractStringsRecursive(pill_response.m4_resposta) : []),
  ].filter(Boolean).join("\n\n");

  const detector = await detectPatternLLM(corpus_for_detector, pill_id, anthropic);

  if (!detector) {
    // detector falhou → fallback genérico
    const fallback_text = "tem coisa pedindo atenção aqui.\nfica — vamos olhar juntos.";
    const cta = await pickContextualCTA(supabase, "silence", ipe_cycle_id);
    await persistEcoText(ipe_cycle_id, pill_id, fallback_text, "v2.c.2-detector-fail");
    await persistEcoEvent(supabase, ipe_cycle_id, pill_id, "OP09", true, Date.now() - t0, null, cta, null, "v2.c.2-detector-fail");
    return json({
      eco_text: fallback_text,
      eco_lines: ["tem coisa pedindo atenção aqui.", "fica — vamos olhar juntos."],
      microtitle: null,
      operator_hint: "silence",
      cta_text: cta,
      cached: false,
      deterministic: false,
    });
  }

  // ─── ETAPA 2: NODE selector ─────────────────────────────────
  const cgg = await fetchCgg(supabase, user_id);
  const eco_node = await selectEcoNode(supabase, cgg);

  // ─── ETAPA 3: RENDERER (Sonnet com prompt v2.c.2) ───────────
  const corpus_for_renderer = buildCorpusForRenderer(pill_response, detector, eco_node);

  let prompt_text = "";
  let prompt_version_label = "v2.c.2";
  const { data: prompt_row } = await supabase
    .from("prompt_versions")
    .select("prompt_text, version")
    .eq("component", component).eq("active", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (prompt_row?.prompt_text) {
    prompt_text = prompt_row.prompt_text;
    prompt_version_label = prompt_row.version ?? prompt_version_label;
  } else {
    return json({ error: `prompt eco_${pill_id} not found in DB` }, 500);
  }

  let eco: EcoStructured | null = null;
  let retry_count = 0;
  let raw_output = "";

  while (retry_count <= 2 && !eco) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        temperature: 0.55,
        system: prompt_text,
        messages: [{
          role: "user",
          content: `${corpus_for_renderer}\n\nRenderize agora o eco-convite. JSON puro.`,
        }],
      });
      const c = response.content[0];
      if (c && "text" in c) {
        raw_output = c.text.trim();
        eco = parseEcoJsonV2c2(raw_output);
        if (!eco) {
          console.warn("[renderer] JSON inválido tentativa", retry_count, "raw:", raw_output.slice(0, 300));
        }
      }
    } catch (err: any) {
      console.error("[renderer] error:", err.message);
    }
    if (!eco) retry_count++;
    if (!eco && retry_count <= 2) await new Promise(r => setTimeout(r, 800));
  }

  if (!eco) {
    // fallback final
    const fb_lines = ["tem mais aqui — não chegou nas palavras ainda.", "fica. a gente continua."];
    const cta = await pickContextualCTA(supabase, detector.operator_hint, ipe_cycle_id);
    const fb_text = fb_lines.join("\n");
    await persistEcoText(ipe_cycle_id, pill_id, fb_text, "v2.c.2-renderer-fail");
    await persistEcoEvent(supabase, ipe_cycle_id, pill_id,
      HINT_TO_OPERATOR[detector.operator_hint] ?? "OP01",
      true, Date.now() - t0, null, cta, detector, "v2.c.2-renderer-fail");
    return json({
      eco_text: fb_text,
      eco_lines: fb_lines,
      microtitle: null,
      operator_hint: detector.operator_hint,
      cta_text: cta,
      cached: false,
      deterministic: false,
    });
  }

  // ─── ETAPA 4: CTA contextual ────────────────────────────────
  const cta_text = await pickContextualCTA(supabase, eco.operator_hint, ipe_cycle_id);

  // ─── ETAPA 5: Persistência ──────────────────────────────────
  const eco_text = ecoLinesToText(eco);
  const operator_id = HINT_TO_OPERATOR[eco.operator_hint] ?? "OP01";
  const total_latency = Date.now() - t0;

  await persistEcoText(ipe_cycle_id, pill_id, eco_text, prompt_version_label);
  await persistEcoEvent(supabase, ipe_cycle_id, pill_id, operator_id, false, total_latency, eco, cta_text, detector, prompt_version_label);

  return json({
    eco_text,
    eco_lines: eco.eco_lines,
    microtitle: eco.microtitle,
    operator_hint: eco.operator_hint,
    cta_text,
    cached: false,
    deterministic: false,
    prompt_version_used: prompt_version_label,
  });
});
