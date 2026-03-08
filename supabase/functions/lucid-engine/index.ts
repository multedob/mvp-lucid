// ============================================================
// index.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1,
//        HTTP_EDGE_UNIFIED_CONTRACT_v1.4.1,
//        CORE_RUNTIME_REGISTRY_SPEC_v1.2
// Fases: PHASE 0 → PHASE 10
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

import type { RadarInput, InputClassification, EdgeResponse, RagNode } from "./types.ts";
import { CONTRACT_VERSION, STRUCTURAL_MODEL_VERSION, STRUCTURAL_MODELS } from "./types.ts";

import {
  resolveStructuralModelVersion,
  resolveSnapshot,
  resolvePreviousNode,
  resolveHistoricalMemory,
  resolvePreviousHagoState,
  resolvePreviousLines,
  resolvePreviousCycleHash,
  VersionConflictError,
} from "./resolvers.ts";

import { executeStructuralCore } from "./core.ts";
import { executePostCore } from "./post-core.ts";
import { persistCycle } from "./persistence.ts";
import { computeCycleIntegrityHash, computeLlmConfigHash } from "./hash.ts";

// ─────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────

const API_VERSION = "1.0";
// SUPPORTED_MODEL removido — verificação agora via STRUCTURAL_MODELS map (B2.1, B2.4)

// LLM Binding — MVP hardcoded (Anthropic claude-3-5-haiku)
// Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 4
// Produção: resolver de runtime_llm_registry (não implementado no MVP)
const LLM_PROVIDER = "anthropic";
const LLM_MODEL_ID = "claude-haiku-4-5-20251001";
const LLM_TEMPERATURE = 0.7; // classificação usa 0, linguagem usa este valor

// ─────────────────────────────────────────
// CORS
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// PHASE 4.5 — INPUT CLASSIFICATION
// Fase 1: regras fortes determinísticas (C7, C5, C6)
// Fase 2: LLM com temperatura=0 (C1, C2, C3, C4)
// Fonte: INPUT_CLASSIFICATION_SPEC_v1.1, seções 5–6
// Proibido: acesso a snapshot, previous_node, histórico, hago_state
// ─────────────────────────────────────────

async function classifyInput(user_text: string, anthropic: Anthropic): Promise<InputClassification> {
  // ─── Fase 1: regras fortes (determinísticas)
  // Ordem de precedência: C7 > C5 > C6
  // Fonte: INPUT_CLASSIFICATION_SPEC_v1.1, seção 5

  const text = user_text.toLowerCase();

  // C7_RISCO_HUMANO: risco físico, autolesão, violência iminente
  if (/\b(suicid|me matar|me machucar|me ferir|violência|matar|morrer|acabar com|me jogar)\b/.test(text)) {
    return "C7_RISCO_HUMANO";
  }

  // C5_PEDIDO_PRESCRITIVO: pedido direto de orientação prática
  if (
    /\b(me diz(a|e) o que fazer|o que (eu )?devo|como (eu )?devo|como (eu )?(fa[cç]o|posso|consigo) para|preciso saber como|me ensina|me explica como|qual o passo|o que fazer|como (ser|ficar|me tornar)|como melhorar)\b/.test(
      text,
    )
  ) {
    return "C5_PEDIDO_PRESCRITIVO";
  }

  // C6_VALIDACAO_IDENTITARIA: busca de definição identitária
  if (
    /\b(quem (eu )?sou|minha identidade|sou (uma pessoa|alguém)|isso define|isso me define|isso faz de mim)\b/.test(
      text,
    )
  ) {
    return "C6_VALIDACAO_IDENTITARIA";
  }

  // ─── Fase 2: LLM com temperatura=0
  // Fonte: INPUT_CLASSIFICATION_SPEC_v1.1, seção 6.2
  const prompt = `You are a semantic classifier. Classify the user input into exactly one category based on the PRIMARY INTENT and EMOTIONAL OBJECT of the message — not just the surface words.

Categories:
- C1_CONFUSAO_CONCEITUAL: confusion about an idea, concept, or how something works (cognitive, not emotional)
- C2_AMBIVALENCIA_INTERNA: internal conflict between two feelings, desires, or directions
- C3_SOFREIMENTO_EMOCIONAL: emotional suffering, pain, sadness, distress, or confusion about one's own feelings
- C4_CURIOSIDADE_ESTRUTURAL: genuine curiosity or exploratory question about a topic

Key distinction:
- "I'm confused about a concept" → C1
- "I'm confused about what I'm feeling" → C3 (the object of confusion is emotional)
- "I don't know if I should do X or Y" → C2
- "I wonder how X works" → C4

Rules:
- Output ONLY the category code (e.g. C3_SOFREIMENTO_EMOCIONAL)
- No explanation, no punctuation, no other text

User input: "${user_text}"`;

  const response = await anthropic.messages.create({
    model: LLM_MODEL_ID,
    max_tokens: 20,
    temperature: 0, // temperatura=0 obrigatório para classificação
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (response.content[0] as { type: string; text: string }).text.trim().toUpperCase();

  const valid: InputClassification[] = [
    "C1_CONFUSAO_CONCEITUAL",
    "C2_AMBIVALENCIA_INTERNA",
    "C3_SOFREIMENTO_EMOCIONAL",
    "C4_CURIOSIDADE_ESTRUTURAL",
  ];

  if (valid.includes(raw as InputClassification)) {
    return raw as InputClassification;
  }

  // Fallback seguro: C1 se resposta inesperada
  return "C1_CONFUSAO_CONCEITUAL";
}

// ─────────────────────────────────────────
// PHASE 9 — LANGUAGE EXECUTION
// PATCH v1 — 5 fixes aplicados:
//   Fix 1: node_texts inclui source_author e source_work
//   Fix 2: instrução de uso do node reformulada
//   Fix 3: proibição de abertura padrão "Você está..."
//   Fix 4: limite de comprimento explícito
//   Fix 5: perguntas apenas em M7
// ─────────────────────────────────────────

async function executeLlmLanguage(
  anthropic: Anthropic,
  structural_model: string,
  snapshot: Record<string, unknown>,
  node_selection: Array<Record<string, unknown>>,
  hago_state: string,
  response_type: string,
  movement_primary: string,
  movement_secondary: string | null,
  nodes_corpus: RagNode[],
  user_text: string,
): Promise<string> {
  // FIX 1 — node_texts inclui source_author e source_work
  const node_texts = node_selection
    .map((n) => {
      const full = nodes_corpus.find((c) => c.node_id === n.node_id);
      return full
        ? `[${n.node_type} / density ${n.density_class} — ${full.source_author}, ${full.source_work}]\n${full.content_text}`
        : "";
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  const system = `You are Luce.

Your role is to help the user see more clearly what they are experiencing — not to analyze, not to teach, not to fix.

VOICE
- Clear, calm, slightly warm
- Reflective, not analytical
- Never diagnostic, never superior
- Never prescriptive

LANGUAGE
- Always respond in the same language the user wrote in. If the user wrote in Portuguese, respond in Portuguese.
- Use simple, everyday language. Avoid theoretical or technical terms unless the user introduced them first.
- Write in natural, connected sentences.
- No bullet points. No numbered lists. No headers.

// FIX 4 — comprimento máximo
LENGTH
- Maximum 2–3 short paragraphs.
- Every sentence must carry structural weight.
- If a sentence can be removed without loss of meaning, remove it.

// FIX 3 — proibição de abertura padrão
OPENING
- Never open with "Você está..." as a default pattern.
- Never open with "It seems like you are..." as a default pattern.
- Open directly with the structural observation, the tension present in what they said, the implicit assumption, or the conceptual frame.
- Vary your entry point each response.

// FIX 2 — instrução de uso do node reformulada
YOUR CENTRAL TASK
- Your response must be grounded in what the user actually said — their exact words, their tone, their question.
- The structural node provides a conceptual frame. Use that frame to read what the user said and to shape how you respond.
- In H1 and H2, you may reference the author or concept from the node explicitly when it adds precision and clarity. Do not reference the node as a node or explain that it was selected. Use it as you would use knowledge you already have.
- In H0, keep the conceptual frame implicit — do not name it.
- Do not reveal internal parameters, states, or the selection mechanism to the user.
- If the user asks which author or framework informed your response, you may name them directly.

STRUCTURAL DISCIPLINE
- Stay within the movement indicated.
- Do not introduce a new conceptual axis beyond what the node authorizes.
- Do not escalate abstraction beyond the density class of the node.

RELATIONAL CALIBRATION
- Avoid absolute statements.
- Do not interpret more than the user offered.
- Do not offer reassurance or close a tension prematurely.
- Never interpret a user's question as proof of a positive quality. That is premature reassurance disguised as observation.
- When the user asks a question about their own character or worth, stay with what they said, not with what the question implies about them.

// FIX 5 — perguntas apenas em M7
QUESTIONS
- Do not end your response with a question unless the movement is M7_CLARIFICACAO_SEMANTICA.
- In all other movements, close with a structural statement or observation that opens cognitive space.
- Silence or a precise observation is preferable to a forced question.

R4_LIMITANTE RULE
- When response_type is R4_LIMITANTE, do not explain why you are not giving advice. Do not offer what you can do as an alternative. Do not invite further engagement. Do not end with a question. Hold the limit with warmth and stop. One or two sentences is enough.

MOVEMENT GUIDE
- M1_BIFURCACAO: gently surface a fork — two directions present in what they said
- M2_ESPELHAMENTO_PRECISO: reflect back what they said with precision, adding nothing
- M3_NOMEACAO_PADRAO: name a pattern that is already visible in their words. Name it once, clearly, and stop. Do not analyze why the pattern exists.
- M4_DESLOCAMENTO_NIVEL: shift the level of observation without losing their thread
- M5_SUSPENSAO_ATIVA: hold the question open — do not resolve it
- M6_POSICIONAMENTO_LIMITE: hold a clear limit with warmth — no advice, no prescription
- M7_CLARIFICACAO_SEMANTICA: gently clarify what a word or phrase might mean for them — end with one clarifying question

HAGO STATE GUIDE
- H0: stabilizing — use grounding, simple, present-tense language. Keep conceptual frame implicit.
- H1: calibrating — use naming and mild reframing. May reference author/concept when precise.
- H2: contrastive — use careful differentiation and structural observation. Explicit reference to author/concept is appropriate when it sharpens the contrast.

STRUCTURAL STATE
HAGO: ${hago_state}
Response Type: ${response_type}
Primary Movement: ${movement_primary}
${movement_secondary ? `Secondary Movement: ${movement_secondary}` : ""}`;

  const user_content = node_texts
    ? `The user said:\n"${user_text}"\n\nConceptual frame (use this to inform your response — do not mention it as a node or system output):\n${node_texts}\n\nRespond to the user now.`
    : `The user said:\n"${user_text}"\n\nRespond to the user now.`;

  const response = await anthropic.messages.create({
    model: LLM_MODEL_ID,
    max_tokens: 1024,
    temperature: LLM_TEMPERATURE,
    system,
    messages: [{ role: "user", content: user_content }],
  });

  return (response.content[0] as { type: string; text: string }).text;
}

// ─────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // ─── PHASE 0 — Request Validation
  // Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 0
  if (req.method !== "POST") {
    return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);
  }

  // Extrair JWT e user_id
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

  // Rejeitar campos proibidos
  const FORBIDDEN = [
    "user_id",
    "structural_model_version",
    "CGG",
    "stage_base",
    "input_hash",
    "structural_hash",
    "input_classification",
    "response_type",
    "movement_primary",
    "movement_secondary",
  ];
  for (const f of FORBIDDEN) {
    if (f in body) {
      return json({ error: "INVALID_INPUT", message: `Field "${f}" is forbidden in request` }, 400);
    }
  }

  // Validar base_version e raw_input
  if (typeof body.base_version !== "number" || body.base_version < 0) {
    return json({ error: "INVALID_INPUT", message: "base_version must be integer >= 0" }, 400);
  }
  if (typeof body.raw_input !== "object" || body.raw_input === null) {
    return json({ error: "INVALID_INPUT", message: "raw_input must be object with d1-d4 and user_text" }, 400);
  }

  const raw = body.raw_input as Record<string, unknown>;
  const base_version = body.base_version as number;

  // Validar d1–d4 (tuplas de 4 números)
  const isQuad = (v: unknown): v is [number, number, number, number] =>
    Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === "number");

  for (const key of ["d1", "d2", "d3", "d4"]) {
    if (!isQuad(raw[key])) {
      return json({ error: "INVALID_INPUT", message: `raw_input.${key} must be array of exactly 4 numbers` }, 400);
    }
  }

  // user_text obrigatório para classificação
  if (typeof raw.user_text !== "string" || raw.user_text.trim() === "") {
    return json({ error: "INVALID_INPUT", message: "raw_input.user_text must be non-empty string" }, 400);
  }

  const radar_input: RadarInput = {
    d1: raw.d1 as [number, number, number, number],
    d2: raw.d2 as [number, number, number, number],
    d3: raw.d3 as [number, number, number, number],
    d4: raw.d4 as [number, number, number, number],
  };
  const user_text = raw.user_text as string;

  // Inicializar clientes
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
  });

  // Extrair user_id do JWT via Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) {
    return json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
  }
  const user_id = user.id;

  try {
    // ─── PHASE 1 — Structural Model Binding
    // Fonte: CORE_RUNTIME_REGISTRY_SPEC_v1.2
    const bound_version = await resolveStructuralModelVersion(supabase);

    // Verificar que runtime tem implementação para esta versão
    // Fonte: CORE_RUNTIME_REGISTRY_SPEC_v1.2 §4 (B2.1, B2.4)
    const modelImpl = STRUCTURAL_MODELS[bound_version];
    if (!modelImpl) {
      return json(
        {
          error: "INTERNAL_ERROR",
          message: `RUNTIME_VERSION_NOT_IMPLEMENTED: ${bound_version}`,
        },
        500,
      );
    }

    // ─── PHASE 2 — Snapshot Resolution
    // Fonte: SNAPSHOT_RESOLUTION_PROTOCOL_v2.2.1
    const { snapshot: previous_snapshot, cycle_id: base_cycle_id } = await resolveSnapshot(
      supabase,
      user_id,
      base_version,
      modelImpl,  // Fonte: CORE_RUNTIME_REGISTRY_SPEC_v1.2 §4 (B2.1) — sem lookup duplo
    );

    // ─── PHASE 3 — Previous Node Resolution
    // Fonte: PREVIOUS_NODE_RESOLUTION_PROTOCOL_v2.2.2
    const previous_node = await resolvePreviousNode(supabase, base_cycle_id);

    // Resoluções auxiliares
    const [historical_memory, previous_hago_state, previousLines] = await Promise.all([
      resolveHistoricalMemory(supabase, user_id, base_version),
      resolvePreviousHagoState(supabase, user_id),
      resolvePreviousLines(supabase, base_cycle_id),
    ]);

    // ─── PHASE 4 — LLM Runtime Binding
    // MVP: hardcoded — sem registry LLM dinâmico
    const llm_config_hash = await computeLlmConfigHash(LLM_PROVIDER, LLM_MODEL_ID, LLM_TEMPERATURE);

    // ─── PHASE 4.5 — Input Classification
    // Executada na Edge, antes do Core
    // Core não recebe user_text
    // Fonte: INPUT_CLASSIFICATION_SPEC_v1.1
    const input_classification = await classifyInput(user_text, anthropic);

    // Buscar corpus RAG completo
    const { data: ragCorpus, error: ragErr } = await supabase.from("rag_corpus").select("*");

    if (ragErr || !ragCorpus) {
      return json({ error: "INTERNAL_ERROR", message: "Failed to load RAG corpus" }, 500);
    }

    // ─── PHASE 5 — Structural Core Execution
    // Core é função pura — sem I/O
    // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8
    const core_output = await executeStructuralCore({
      contract_version: CONTRACT_VERSION,
      structural_model_version: bound_version,
      raw_input: radar_input,
      previous_snapshot,
      previous_node,
      historical_memory,
      input_classification,
      nodes: ragCorpus as RagNode[],
      previous_hago_state,
      cyclesCompleted: base_version,
      previousLines,
    });

    // ─── PHASE 5.3 + 5.4 — Response Type + Movement Resolution
    const post_core = executePostCore(input_classification, core_output.hago_state);

    // ─── PHASE 6 — Hash Chain Resolution
    // Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 6
    const previous_cycle_hash = await resolvePreviousCycleHash(supabase, base_cycle_id);

    const cycle_integrity_hash = await computeCycleIntegrityHash(
      previous_cycle_hash,
      core_output.input_hash,
      core_output.structural_hash,
      bound_version,
    );

    // ─── PHASE 7 — Pre-Transaction Integrity Checks
    // Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 7
    if (!core_output.input_hash || core_output.input_hash.length !== 64) {
      throw new Error("INTEGRITY_ERROR: invalid input_hash");
    }
    if (!core_output.structural_hash || core_output.structural_hash.length !== 64) {
      throw new Error("INTEGRITY_ERROR: invalid structural_hash");
    }
    if (!cycle_integrity_hash || cycle_integrity_hash.length !== 64) {
      throw new Error("INTEGRITY_ERROR: invalid cycle_integrity_hash");
    }
    if (core_output.structural_model_version !== bound_version) {
      throw new Error("INTEGRITY_ERROR: structural_model_version mismatch");
    }

    // ─── PHASE 8 — Atomic Transaction
    // Fonte: TRANSACTION_PROTOCOL_v3.4, seção 5
    const { cycle_id, current_version } = await persistCycle(supabase, {
      user_id,
      base_version,
      structural_model_version: bound_version,
      raw_input: radar_input,
      input_hash: core_output.input_hash,
      structural_hash: core_output.structural_hash,
      previous_cycle_hash,
      cycle_integrity_hash,
      structural_snapshot: core_output.structural_snapshot,
      node_selection: core_output.node_selection,
      hago_state: core_output.hago_state,
      input_classification,
      response_type: post_core.response_type,
      movement_primary: post_core.movement_primary,
      movement_secondary: post_core.movement_secondary,
      llm_provider: LLM_PROVIDER,
      llm_model_id: LLM_MODEL_ID,
      llm_temperature: LLM_TEMPERATURE,
      llm_config_hash,
      audit_trace: core_output.audit_trace,
    });

    // ─── PHASE 9 — Language Execution (pós-commit)
    // Falha linguística NÃO invalida ciclo já persistido
    // Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 9
    let llm_response = "";
    try {
      llm_response = await executeLlmLanguage(
        anthropic,
        bound_version,
        core_output.structural_snapshot as unknown as Record<string, unknown>,
        core_output.node_selection as unknown as Array<Record<string, unknown>>,
        core_output.hago_state,
        post_core.response_type,
        post_core.movement_primary,
        post_core.movement_secondary,
        ragCorpus as RagNode[],
        user_text,
      );
    } catch (langErr) {
      // Log mas não abortar — ciclo está persistido
      console.error("LANGUAGE_EXECUTION_ERROR:", langErr);
      llm_response = "[linguistic layer unavailable]";
    }

    // ─── PHASE 9.1 — Persist llm_response back to cycle
    // llm_response is computed post-commit; update the persisted cycle
    try {
      await supabase
        .from("cycles")
        .update({ llm_response })
        .eq("id", cycle_id);
    } catch (updateErr) {
      console.error("LLM_RESPONSE_PERSIST_ERROR:", updateErr);
    }

    // ─── PHASE 10 — Response Emission
    // Fonte: HTTP_EDGE_UNIFIED_CONTRACT_v1.4.1, seção 4
    // cycle_integrity_hash, previous_cycle_hash, llm_config_hash NÃO expostos
    const response: EdgeResponse = {
      api_version: API_VERSION,
      current_version,
      cycle_id,
      structural_model_version: bound_version,
      input_hash: core_output.input_hash,
      structural_hash: core_output.structural_hash,
      structural_snapshot: core_output.structural_snapshot,
      node_selection: core_output.node_selection,
      hago_state: core_output.hago_state,
      input_classification,
      response_type: post_core.response_type,
      movement_primary: post_core.movement_primary,
      movement_secondary: post_core.movement_secondary,
      llm_provider: LLM_PROVIDER,
      llm_model_id: LLM_MODEL_ID,
      llm_temperature: LLM_TEMPERATURE,
      llm_response,
      audit_trace: core_output.audit_trace,
    };

    return json(response, 200);
  } catch (err) {
    if (err instanceof VersionConflictError) {
      return json({ error: "VERSION_CONFLICT", message: err.message }, 409);
    }

    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("INTERNAL_STRUCTURAL_INCONSISTENCY")) {
      return json({ error: "INTERNAL_ERROR", message: msg }, 500);
    }
    if (msg.includes("INTERNAL_CONFIGURATION_ERROR")) {
      return json({ error: "INTERNAL_ERROR", message: msg }, 500);
    }
    if (msg.includes("INTEGRITY_ERROR")) {
      return json({ error: "INTERNAL_ERROR", message: msg }, 500);
    }
    if (msg.includes("CORE_INPUT_INVALID")) {
      return json({ error: "INVALID_INPUT", message: msg }, 400);
    }

    console.error("UNHANDLED_ERROR:", err);
    return json({ error: "INTERNAL_ERROR", message: "Internal server error" }, 500);
  }
});
