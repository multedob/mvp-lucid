// ============================================================
// ipe-eco/index.ts
// v2.0 — Eco rewrite: grounded, specific, no templates
// Changes from v1.2:
//   - Corpus rebuilt as narrative with clear hierarchy (M4 > M3_3 > M3_2 > M3_1)
//   - M2 removed from main corpus (fictional character contamination)
//   - System prompt rewritten: strong positive instruction, zero literal examples
//   - Temperature lowered 0.7 → 0.45 (grounded but not robotic)
//   - Name instruction simplified (no example phrases to parrot)
//
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1 §4.6 + §6.1
// PILL_I–VI_Prototipo v0.3 — estrutura do Eco M5
//
// Responsabilidade: geração do Eco M5 por Pill
// Input:  { ipe_cycle_id, pill_id }
// Output: { eco_text, scoring_audit_id }
// LLM: 1 chamada (Sonnet, temp 0.45)
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
const ECO_TEMPERATURE = 0.45;
const MAX_RETRIES = 1;
const EMBEDDED_PROMPT_VERSION = "embedded-v2.0";

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
// CORPUS BUILDER v2.0 — narrative hierarchy
// Priority: M4 (self-observation) > M3_3 (alignment) > M3_2 (choice) > M3_1 (scale)
// M2 excluded from main corpus (fictional character → contamination risk)
// M2 kept only for language detection
// ─────────────────────────────────────────
function buildEcoCorpus(
  pillId: PillId,
  pillResponse: Record<string, unknown>
): { corpus: string; m2Text: string; m4Text: string } {
  const sections: string[] = [];
  let m2Text = "";
  let m4Text = "";

  // ── TIER 1: M4 — the person's own words about themselves ──
  if (pillResponse.m4_resposta) {
    const m4 = pillResponse.m4_resposta as Record<string, unknown>;
    const m4Parts: string[] = [];

    if (m4.percepcao) {
      const v = String(m4.percepcao);
      m4Text = v;
      m4Parts.push(`What the person said about themselves after the exercise:\n"${v}"`);
    }
    if (pillId === "PI" && m4.presenca_deslocamento) {
      m4Parts.push(`On the cost of displacement:\n"${String(m4.presenca_deslocamento)}"`);
    }
    if (m4.presenca_para_outros) {
      m4Parts.push(`On how they show up for others:\n"${String(m4.presenca_para_outros)}"`);
    }
    if (pillId === "PV" && m4.conhecimento_em_campo) {
      m4Parts.push(`On knowledge in practice:\n"${String(m4.conhecimento_em_campo)}"`);
    }

    if (m4Parts.length) {
      sections.push(`=== WHAT THE PERSON SHARED (primary — use their exact words) ===\n${m4Parts.join("\n")}`);
    }
  }

  // ── TIER 2: M3_3 — alignment moment (narrative + condition) ──
  if (pillResponse.m3_respostas) {
    const m3 = pillResponse.m3_respostas as Record<string, unknown>;
    const inv = m3.M3_3_inventario as Record<string, unknown> | undefined;
    if (inv) {
      const invParts: string[] = [];
      if (inv.narrativa) invParts.push(`When asked about a moment of alignment, they wrote:\n"${String(inv.narrativa)}"`);
      if (inv.condicao) invParts.push(`What made that moment possible:\n"${String(inv.condicao)}"`);
      if (invParts.length) {
        sections.push(`=== ALIGNMENT MOMENT (secondary — supports the echo) ===\n${invParts.join("\n")}`);
      }
    }

    // ── TIER 3: M3_2 — impossible choice ──
    const escolha = m3.M3_2_escolha as Record<string, unknown> | undefined;
    if (escolha) {
      const chParts: string[] = [];
      if (escolha.opcao) chParts.push(`Chose option: ${String(escolha.opcao)}`);
      if (escolha.abre_mao) chParts.push(`What they gave up: "${String(escolha.abre_mao)}"`);
      if (escolha.followup_C) chParts.push(`Follow-up reflection: "${String(escolha.followup_C)}"`);
      if (escolha.followup_D) chParts.push(`Follow-up reflection: "${String(escolha.followup_D)}"`);
      if (chParts.length) {
        sections.push(`=== IMPOSSIBLE CHOICE (context only — do not echo directly) ===\n${chParts.join("\n")}`);
      }
    }

    // ── TIER 4: M3_1 — scale position (structural, lowest priority) ──
    const regua = m3.M3_1_regua as Record<string, unknown> | undefined;
    if (regua) {
      const rParts: string[] = [];
      if (regua.duas_palavras) rParts.push(`Two words for where they are: "${String(regua.duas_palavras)}"`);
      if (regua.situacao_oposta) rParts.push(`Opposite situation: "${String(regua.situacao_oposta)}"`);
      if (rParts.length) {
        sections.push(`=== SCALE POSITION (background only) ===\n${rParts.join("\n")}`);
      }
    }
  }

  // ── M2 — NOT included in corpus (fictional character observation) ──
  // Kept only for language detection
  if (pillResponse.m2_resposta) {
    m2Text = String(pillResponse.m2_resposta);
  }

  return { corpus: sections.join("\n\n"), m2Text, m4Text };
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
// SYSTEM PROMPT v2.0 — grounded, specific, no templates
// ─────────────────────────────────────────
function buildEmbeddedSystemPrompt(pillId: PillId): string {
  const meta = PILL_META[pillId];

  return `You write the echo — a closing moment after someone completes a self-knowledge exercise (pill) in an app called rdwth.

LANGUAGE: Write in the same language the person used. If they wrote in Portuguese, respond in Portuguese. If English, English.

PILL TENSION: ${meta.tensao}
${meta.instrucao_especial}

YOUR TASK — step by step:

1. Read the corpus. Find the ONE specific thing the person named that carries weight — a word, an image, a contradiction, a quiet admission. It will almost always be in the section marked "WHAT THE PERSON SHARED". That section contains their actual words about themselves.

2. Write 2-3 sentences that place that specific thing back in front of them — not interpreted, not reframed, not praised. Reflected. Use their exact vocabulary. If they said "travada", you say "travada" — not "bloqueada", not "presa", not "paralisada".

3. The last sentence should leave something slightly open — a tension unnamed, a question implied but not asked. The person should finish reading and feel there's something left to think about. Do NOT write a generic forward-looking phrase. The opening must come from the specific material they gave you.

WHAT MAKES A GOOD ECO:
- It contains at least one word or phrase the person actually used
- It names something specific, not a category ("the part where you stayed quiet" vs "your way of dealing with things")
- It makes the person feel heard, not analyzed
- It's short enough to remember, specific enough to sting a little

WHAT KILLS AN ECO:
- Generic acknowledgment that could apply to anyone
- Paraphrasing their words into cleaner, more "therapeutic" language
- Closing with a cliché opening ("there's more here", "worth exploring")
- Interpreting what they said ("when you say X, it seems like Y")
- Reassurance or praise ("that took courage", "that's powerful")
- Abstract vocabulary: "padrão", "trajetória", "mecanismo", "estrutura", "modo de ser"
- Generalizing words: "sempre", "costuma", "tende a", "geralmente"
${meta.proibicoes}

The corpus has clear priority labels. Trust them: "WHAT THE PERSON SHARED" is your primary source. "ALIGNMENT MOMENT" supports. "IMPOSSIBLE CHOICE" and "SCALE POSITION" are background — use them only if they deepen what's already in the primary material.

LENGTH: 2-3 short sentences. No more.

Return ONLY the echo text. No preamble, no labels, no quotes around the text.`;
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

  const hasMinCorpus = corpus.includes("WHAT THE PERSON SHARED") || corpus.includes("ALIGNMENT MOMENT");
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
    ? `\nThe person's name is "${user_name}". You may use it once at the start, naturally — no forced phrasing.\n\n`
    : "\n\n";

  const userMessage =
    `${nivelInstrucao(nivel)}${nameInstruction}` +
    `Here is everything this person shared during the pill. Read it, find the one thing that carries weight, and write the echo.\n\n` +
    `${corpus}\n\n` +
    `Echo:`;

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
