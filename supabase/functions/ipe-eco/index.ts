// ============================================================
// ipe-eco/index.ts
// v1.2 — Eco rewrite: lighter, warmer, bridge to Reed
// Changes from v1.1:
//   - Luce → Reed in all prompts
//   - Simplified structure: 1 echo sentence + 1 bridge to Reed
//   - Removed forced 3-element structure (espelho + observação + pergunta)
//   - Eco is now a brief, warm acknowledgment that invites deeper conversation
//   - Kept: pill-specific tensions, vocabulary anchoring, language detection
//
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1 §4.6 + §6.1
// PILL_I–VI_Prototipo v0.3 — estrutura do Eco M5
//
// Responsabilidade: geração do Eco M5 por Pill
// Input:  { ipe_cycle_id, pill_id }
// Output: { eco_text, scoring_audit_id }
// LLM: 1 chamada (Sonnet, temp 0.7)
// Persiste: pill_responses.eco_text + scoring_audit
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";
import {
  type PillId,
  detectStubPersona,
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

const ECO_MODEL = "claude-sonnet-4-20250514";
const ECO_TEMPERATURE = 0.7;
const MAX_RETRIES = 1;
const EMBEDDED_PROMPT_VERSION = "embedded-v1.2";

type NivelPersona = "B" | "M" | "A";

function detectNivelPersona(ipe_cycle_id: string): NivelPersona {
  const persona = detectStubPersona(ipe_cycle_id);
  if (persona === "P2-B" || persona === "P5-B") return "B";
  if (persona === "P7-A") return "A";
  return "M";
}

// ─────────────────────────────────────────
// PILL METADATA
// ─────────────────────────────────────────
const PILL_META: Record<PillId, {
  tensao: string;
  proibicoes: string;
  instrucao_especial: string;
}> = {
  PI: {
    tensao: "I ↔ Belonging",
    proibicoes: `Proibido: "pertencimento", "você sempre foi", "quem você é", "você pertence", "lugar de origem". Não resolve a tensão — honra o custo real do deslocamento.`,
    instrucao_especial: `PI: tensão entre eu e pertencimento.`,
  },
  PII: {
    tensao: "I ↔ Role",
    proibicoes: `Proibido: "papel", "função", "missão", "propósito profissional", "sua vocação". Não define o papel correto.`,
    instrucao_especial: `PII: tensão entre eu e papel exercido.`,
  },
  PIII: {
    tensao: "Presence ↔ Distance",
    proibicoes: `Proibido: "agora você sabe", "a lição que fica", "você cresceu", "tudo faz sentido", "valeu a pena", "superou". Nunca fecha a retrospectiva.`,
    instrucao_especial: `PIII: tensão entre presença e distância.`,
  },
  PIV: {
    tensao: "Clarity ↔ Action",
    proibicoes: `Proibido: "agora é hora de agir", "você sabe o que fazer", "o caminho está claro", "basta executar". Não prescreve movimento.`,
    instrucao_especial: `PIV: tensão entre clareza e ação.`,
  },
  PV: {
    tensao: "Inside ↔ Outside",
    proibicoes: `Proibido: "o que você busca é", "a resposta pode estar em", "você está pronto para", "seu propósito", "sua missão". A abertura é a condição — não a preenche.`,
    instrucao_especial: `PV: tensão entre dentro e fora.`,
  },
  PVI: {
    tensao: "Movement ↔ Pause",
    proibicoes: `Proibido: "você precisa descansar", "o ritmo está te consumindo", "pare antes que seja tarde", "você está construindo algo grandioso". Não julga o ritmo.`,
    instrucao_especial: `PVI: tensão entre movimento e pausa.`,
  },
};

// ─────────────────────────────────────────
// CORPUS BUILDER (same as v1.1)
// ─────────────────────────────────────────
function buildEcoCorpus(
  pillId: PillId,
  pillResponse: Record<string, unknown>
): { corpus: string; m2Text: string; m4Text: string } {
  const parts: string[] = [];
  let m2Text = "";
  let m4Text = "";

  if (pillResponse.m4_resposta) {
    const m4 = pillResponse.m4_resposta as Record<string, unknown>;
    if (m4.percepcao) {
      const v = String(m4.percepcao);
      m4Text = v;
      parts.push(`M4_percepcao: ${JSON.stringify(v)}`);
    }
    if (pillId === "PI" && m4.presenca_deslocamento) {
      parts.push(`M4_presenca_deslocamento: ${JSON.stringify(String(m4.presenca_deslocamento))}`);
    }
    if (pillId === "PV") {
      if (m4.conhecimento_em_campo) {
        parts.push(`M4_conhecimento_em_campo: ${JSON.stringify(String(m4.conhecimento_em_campo))}`);
      }
      if (m4.presenca_para_outros) {
        parts.push(`M4_presenca_para_outros: ${JSON.stringify(String(m4.presenca_para_outros))}`);
      }
    } else if (m4.presenca_para_outros) {
      parts.push(`M4_presenca_para_outros: ${JSON.stringify(String(m4.presenca_para_outros))}`);
    }
  }

  if (pillResponse.m3_respostas) {
    const m3 = pillResponse.m3_respostas as Record<string, unknown>;
    const inv = m3.M3_3_inventario as Record<string, unknown> | undefined;
    if (inv) {
      if (inv.narrativa) parts.push(`M3_3_narrativa: ${JSON.stringify(String(inv.narrativa))}`);
      if (inv.condicao) parts.push(`M3_3_condicao_possibilidade: ${JSON.stringify(String(inv.condicao))}`);
    }
    const escolha = m3.M3_2_escolha as Record<string, unknown> | undefined;
    if (escolha) {
      if (escolha.opcao) parts.push(`M3_2_opcao_escolhida: ${JSON.stringify(String(escolha.opcao))}`);
      if (escolha.abre_mao) parts.push(`M3_2_o_que_abre_mao: ${JSON.stringify(String(escolha.abre_mao))}`);
      if (escolha.followup_C) parts.push(`M3_2_followup: ${JSON.stringify(String(escolha.followup_C))}`);
      if (escolha.followup_D) parts.push(`M3_2_followup: ${JSON.stringify(String(escolha.followup_D))}`);
    }
    const regua = m3.M3_1_regua as Record<string, unknown> | undefined;
    if (regua) {
      if (regua.duas_palavras) parts.push(`M3_1_duas_palavras: ${JSON.stringify(String(regua.duas_palavras))}`);
      if (regua.situacao_oposta) parts.push(`M3_1_situacao_oposta: ${JSON.stringify(String(regua.situacao_oposta))}`);
    }
  }

  if (pillResponse.m2_resposta) {
    const v = String(pillResponse.m2_resposta);
    m2Text = v;
    // IMPORTANT: M2 is the user's observation about a FICTIONAL CHARACTER in a narrative
    // they read, NOT about themselves. Label it explicitly to prevent the Eco LLM from
    // treating it as autobiographical.
    parts.push(`M2_observation_about_fictional_character: ${JSON.stringify(v)}`);
  }

  if (pillResponse.m2_cal_signals) {
    const cal = pillResponse.m2_cal_signals as Record<string, unknown>;
    const calParts: string[] = [];
    if (cal.localizacao) calParts.push(`localizacao:${cal.localizacao}`);
    if (cal.custo) calParts.push(`custo:${cal.custo}`);
    if (cal.foco) calParts.push(`foco:${cal.foco}`);
    if (cal.horizonte) calParts.push(`horizonte:${cal.horizonte}`);
    if (calParts.length) parts.push(`CAL_signals: ${calParts.join(", ")}`);
  }

  return { corpus: parts.join("\n"), m2Text, m4Text };
}

// ─────────────────────────────────────────
// LANGUAGE DETECTION (same as v1.1)
// ─────────────────────────────────────────
function detectLanguage(m2Text: string, m4Text: string): "pt" | "en" {
  const freeText = `${m2Text} ${m4Text}`.trim();
  if (!freeText) return "pt";
  const enScore = (freeText.match(/\b(I|my|we|you|the|and|was|were|have|had|felt|it's|didn't|don't|that|this|when|they|there)\b/gi) || []).length;
  const ptScore = (freeText.match(/\b(eu|meu|minha|você|nós|que|com|para|mas|não|uma|esse|isso|quando|ela|ele|havia|fui|foi|tinha|estou|estava)\b/gi) || []).length;
  return enScore > ptScore ? "en" : "pt";
}

// ─────────────────────────────────────────
// SYSTEM PROMPT v1.2 — lighter, bridge to Reed
// ─────────────────────────────────────────
function buildEmbeddedSystemPrompt(pillId: PillId): string {
  const meta = PILL_META[pillId];

  return `You are generating a brief echo at the end of a reading exercise (pill) inside a self-knowledge app called rdwth.

The echo is a short, warm acknowledgment of what the person just shared. It's NOT a therapy session, NOT an analysis, NOT a report. It's more like a friend who was listening and says one thing that lands.

LANGUAGE: Always respond in the same language the person wrote in. If Portuguese, write in Portuguese. If English, write in English.

TENSION OF THIS PILL: ${meta.tensao}
${meta.instrucao_especial}

CRITICAL — REFERENT RULE:
The corpus may contain a field labeled "M2_observation_about_fictional_character". That field contains what the USER observed about a FICTIONAL CHARACTER in a narrative they read — it is NOT about the user themselves. Never paraphrase M2 content as if it were autobiographical. The echo must reflect the USER's own experience, grounded primarily in their M3 responses (scale choices, impossible choice, alignment moment) and M4 self-observation. You may use M2 only as secondary context about how the user projects/reads others, but never attribute M2 content to the user as their own story.

WHAT TO DO:
- Write 1-2 short sentences that acknowledge what the person shared. Use THEIR words — if they said "travada", say "travada", not "bloqueada" or "presa".
- Then, one brief closing line that points forward — something that makes the person want to explore this further. This could be an observation that opens a door, or a simple sentence like "isso rende conversa" or "tem mais coisa aí."
- The echo should feel like a bookmark, not a conclusion. It marks something worth returning to.

WHAT NOT TO DO:
- Do NOT analyze or interpret what the person said
- Do NOT present two options and ask them to choose
- Do NOT use the structure "when you say X, it seems like Y"
- Do NOT offer reassurance ("que coragem", "isso é muito forte")
- Do NOT use words like "padrão", "sempre", "costuma", "tende a", "geralmente"
- Do NOT use: "modo de ser", "mecanismo interno", "trajetória", "estrutura"
${meta.proibicoes}

TONE: Warm, simple, brief. Like someone who heard you and said one true thing.

LENGTH: Maximum 2-3 short sentences. Less is more. Every word must earn its place.

Return ONLY the echo text. No preamble, no metadata, no quotes.`;
}

// ─────────────────────────────────────────
// NIVEL PERSONA (same as v1.1)
// ─────────────────────────────────────────
function nivelInstrucao(nivel: NivelPersona): string {
  if (nivel === "B") return "Nível da persona: B. Prefira frases curtas, uma ideia por frase.";
  if (nivel === "A") return "Nível da persona: A. Mantenha complexidade sintática quando serve a uma distinção real.";
  return "Nível da persona: M. Duas camadas permitidas, cada uma em frase própria.";
}

// ─────────────────────────────────────────
// FALLBACK
// ─────────────────────────────────────────
function getFallbackEco(lang: "pt" | "en"): string {
  return lang === "en"
    ? "Something stayed with you here — even if it's hard to name yet. That's worth coming back to."
    : "Alguma coisa ficou aqui — mesmo que ainda seja difícil de nomear. Vale voltar nisso.";
}

// ─────────────────────────────────────────
// PERSISTENCE (same as v1.1)
// ─────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function persistAudit(
  supabase: any,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("scoring_audit").insert(payload);
  if (error) console.error("ECO_AUDIT_INSERT_ERROR:", error);
}

// deno-lint-ignore no-explicit-any
async function persistEcoText(
  supabase: any,
  ipe_cycle_id: string,
  pill_id: string,
  eco_text: string
): Promise<void> {
  const { error } = await supabase
    .from("pill_responses")
    .update({ eco_text })
    .eq("ipe_cycle_id", ipe_cycle_id)
    .eq("pill_id", pill_id);
  if (error) console.error("ECO_TEXT_PERSIST_ERROR:", error);
}

// ─────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "UNAUTHORIZED", message: "Missing authorization" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400);
  }

  const { ipe_cycle_id, pill_id } = body;
  if (typeof ipe_cycle_id !== "string" || typeof pill_id !== "string") {
    return json({ error: "INVALID_INPUT", message: "ipe_cycle_id and pill_id required" }, 400);
  }

  // Optional: user name for personalized eco
  const user_name = typeof body.user_name === "string" && body.user_name.trim() ? body.user_name.trim() : null;

  const VALID_PILLS: PillId[] = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];
  if (!VALID_PILLS.includes(pill_id as PillId)) {
    return json({ error: "INVALID_INPUT", message: "pill_id inválido" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);

  const { data: cycleCheck, error: cycleCheckErr } = await supabase
    .from("ipe_cycles")
    .select("id, status")
    .eq("id", ipe_cycle_id)
    .eq("user_id", user.id)
    .single();

  if (cycleCheckErr || !cycleCheck) {
    return json({ error: "NOT_FOUND", message: "Cycle not found" }, 404);
  }
  if (cycleCheck.status === "abandoned") {
    return json({ error: "INVALID_INPUT", message: "Cycle is abandoned" }, 400);
  }

  const { data: pillResponse, error: prErr } = await supabase
    .from("pill_responses")
    .select("*")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .eq("pill_id", pill_id)
    .maybeSingle();

  if (prErr || !pillResponse) {
    return json({ error: "NOT_FOUND", message: "Pill response not found" }, 404);
  }
  if (!pillResponse.completed_at) {
    return json({ error: "INVALID_INPUT", message: "Pill M4 not yet completed" }, 400);
  }

  // Idempotência
  if (pillResponse.eco_text) {
    return json({ eco_text: pillResponse.eco_text, scoring_audit_id: "", cached: true }, 200);
  }

  const component = `eco_${pill_id}`;
  const { data: promptRow } = await supabase
    .from("prompt_versions")
    .select("id, version, prompt_text")
    .eq("component", component)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let systemPrompt: string;
  let promptVersion: string;

  if (promptRow?.prompt_text) {
    systemPrompt = promptRow.prompt_text;
    promptVersion = promptRow.version;
  } else {
    systemPrompt = buildEmbeddedSystemPrompt(pill_id as PillId);
    promptVersion = EMBEDDED_PROMPT_VERSION;
    console.warn(`ECO_PROMPT_FALLBACK: no active prompt for ${component}, using ${promptVersion}`);
  }

  const { corpus, m2Text, m4Text } = buildEcoCorpus(
    pill_id as PillId,
    pillResponse as Record<string, unknown>
  );
  const lang = detectLanguage(m2Text, m4Text);
  const nivel = detectNivelPersona(ipe_cycle_id);

  const hasMinCorpus = corpus.includes("M4_percepcao") || corpus.includes("M3_3_narrativa");
  const auditId = crypto.randomUUID();

  if (!hasMinCorpus) {
    const fallback = getFallbackEco(lang);
    await persistAudit(supabase, {
      id: auditId, ipe_cycle_id, component,
      prompt_version: promptVersion, input_tokens: 0, output_tokens: 0,
      raw_output: "[corpus_insuficiente — fallback]",
      parsed_output: { eco_text: fallback, reason: "corpus_insuficiente" },
      parse_success: false, retry_count: 0, model: "FALLBACK",
    });
    await persistEcoText(supabase, ipe_cycle_id, pill_id, fallback);
    return json({ eco_text: fallback, scoring_audit_id: auditId, fallback: true }, 200);
  }

  const nameInstruction = user_name
    ? `\nThe person's name is "${user_name}". You may use their name ONCE at the start of the echo — naturally, like a friend would. Example: "${user_name}, o que ficou aqui é..." Do NOT overuse it.\n\n`
    : "\n\n";

  const userMessage =
    `${nivelInstrucao(nivel)}${nameInstruction}` +
    `Generate the echo for this person based on the corpus below.\n\n` +
    `===CORPUS===\n${corpus}\n\n` +
    `Return only the echo text. Nothing else.`;

  let ecoText = "";
  let success = false;
  let input_tokens = 0;
  let output_tokens = 0;
  let last_raw = "";
  let retry_count = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retry_count = attempt;
    try {
      const response = await anthropic.messages.create({
        model: ECO_MODEL,
        max_tokens: 256, // reduced from 512 — eco should be shorter
        temperature: ECO_TEMPERATURE,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      input_tokens = response.usage?.input_tokens ?? 0;
      output_tokens = response.usage?.output_tokens ?? 0;
      last_raw = (response.content[0] as { type: string; text: string }).text.trim();

      if (last_raw.length < 10) {
        console.warn(`ECO_TOO_SHORT attempt=${attempt}`);
        continue;
      }

      ecoText = last_raw;
      success = true;
      break;
    } catch (err) {
      console.error(`ECO_LLM_ERROR attempt=${attempt}:`, err);
      last_raw = `[error: ${err instanceof Error ? err.message : String(err)}]`;
    }
  }

  if (!success || !ecoText) {
    ecoText = getFallbackEco(lang);
  }

  await persistAudit(supabase, {
    id: auditId, ipe_cycle_id, component,
    prompt_version: promptVersion, input_tokens, output_tokens,
    raw_output: last_raw,
    parsed_output: { eco_text: ecoText },
    parse_success: success, retry_count,
    model: success ? ECO_MODEL : "FALLBACK",
  });
  await persistEcoText(supabase, ipe_cycle_id, pill_id, ecoText);

  return json({ eco_text: ecoText, scoring_audit_id: auditId }, 200);
});
