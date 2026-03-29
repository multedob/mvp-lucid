// ============================================================
// ipe-scoring-block/index.ts — Engine Real de Scoring por Bloco v1.0
// Fonte: DESIGN_ENGINE_SCORING_BLOCK v1.0
// Pipeline: Validar Input → Montar Corpus → Carregar Prompt → Chamar LLM → Parsear + Validar → Audit + Return
//
// Substitui STUB (Fase 3). Assinatura de saída: BlockScoringOutputFull extends BlockScoringOutput.
// Backward compatible — ipe-questionnaire-engine continua consumindo os 6 campos originais.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";
import {
  type BlockScoringInputFull,
  type BlockScoringOutputFull,
  type LineId,
  type ILValue,
  type FaixaValue,
  type PillDataAgregado,
  type CorteAnalise,
  IL_VALID_SET_DEFAULT,
  IL_VALID_SET_L24,
} from "../_shared/ipe_types.ts";

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────

// Modelo parametrizável por bloco (§3.4)
const MODEL_CONFIG: Partial<Record<LineId, string>> = {
  // Pós-MVP: migrar blocos mecânicos para Haiku aqui
  // 'L2.4': 'claude-haiku-4-5-20251001',
};
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const MAX_TOKENS = 1500;
const TEMPERATURE = 0; // scoring determinístico
const LLM_TIMEOUT_MS = 30_000;
const RETRY_BACKOFF_MS = 2_000;
const MAX_RETRIES = 1; // 1 retry para Camada 1 (tipo)

// Prompt cache TTL — prompts mudam raramente (§3.3)
const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const promptCache = new Map<string, { text: string; version: string; fetchedAt: number }>();

// LineIds válidos para validação de input
const VALID_LINE_IDS: readonly LineId[] = [
  "L1.1", "L1.2", "L1.3", "L1.4",
  "L2.1", "L2.2", "L2.3", "L2.4",
  "L3.1", "L3.2", "L3.3", "L3.4",
  "L4.1", "L4.2", "L4.3", "L4.4",
];


// ─────────────────────────────────────────
// CORS + HELPERS
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

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─────────────────────────────────────────
// §3.1 — VALIDAR INPUT
// ─────────────────────────────────────────

function validateInput(body: unknown): { ok: true; input: BlockScoringInputFull } | { ok: false; message: string } {
  const b = body as Record<string, unknown>;

  if (!b.ipe_cycle_id || typeof b.ipe_cycle_id !== "string") {
    return { ok: false, message: "ipe_cycle_id required (string)" };
  }
  if (!b.block_id || !VALID_LINE_IDS.includes(b.block_id as LineId)) {
    return { ok: false, message: `block_id must be one of ${VALID_LINE_IDS.join(", ")}` };
  }
  // principal_resposta ou protecao_etica — pelo menos um
  if (!b.principal_resposta && b.protecao_etica !== true) {
    return { ok: false, message: "principal_resposta or protecao_etica=true required" };
  }
  // Se variante_resposta presente → variante_servida deve ser não-null
  if (b.variante_resposta && !b.variante_servida) {
    return { ok: false, message: "variante_servida required when variante_resposta is present" };
  }
  // pill_data deve ser objeto (convenção §2.1 — nunca null)
  if (!b.pill_data || typeof b.pill_data !== "object") {
    return { ok: false, message: "pill_data required (object, never null — use defaultPillData())" };
  }

  return { ok: true, input: b as unknown as BlockScoringInputFull };
}

// ─────────────────────────────────────────
// §3.2 — MONTAR CORPUS
// ─────────────────────────────────────────

function buildCorpus(input: BlockScoringInputFull): string {
  const pd = input.pill_data;

  const gccSection = pd.gcc_por_corte
    ? `gcc_por_corte:
  2_4: "${pd.gcc_por_corte["2_4"] ?? "null"}"
  4_6: "${pd.gcc_por_corte["4_6"] ?? "null"}"
  6_8: "${pd.gcc_por_corte["6_8"] ?? "null"}"`
    : `gcc_por_corte: null`;

  // il_por_pill — apenas Pills com valor
  let ilPorPillSection = "il_por_pill: {}";
  if (pd.il_por_pill && Object.keys(pd.il_por_pill).length > 0) {
    const lines = Object.entries(pd.il_por_pill)
      .map(([pill, il]) => `  ${pill}: ${il}`)
      .join("\n");
    ilPorPillSection = `il_por_pill:\n${lines}`;
  }

  return `RESPONDENTE:
principal_resposta: ${input.principal_resposta ? `"${input.principal_resposta}"` : "null"}
variante_resposta: ${input.variante_resposta ? `"${input.variante_resposta}"` : "null"}
variante_servida: ${input.variante_servida ? `"${input.variante_servida}"` : "null"}
protecao_etica: ${input.protecao_etica}

DADOS PILL — ${input.block_id}:
n_pills_com_cobertura: ${pd.n_pills_com_cobertura}
faixa_estimada: "${pd.faixa_estimada}"
fd_linha_agregado: ${pd.fd_linha_agregado}
${gccSection}
heterogeneidade: "${pd.heterogeneidade}"
il_sinais: [${pd.il_sinais.map(v => v === null ? "null" : String(v)).join(", ")}]
${ilPorPillSection}
corpus_transversal: ${pd.corpus_transversal ? `"${pd.corpus_transversal}"` : "null"}`;
}

// ─────────────────────────────────────────
// §3.3 — CARREGAR PROMPT (com cache)
// ─────────────────────────────────────────

async function loadPrompt(
  blockId: LineId,
  supabase: ReturnType<typeof createClient>
): Promise<{ text: string; version: string } | null> {
  const component = `scoring_block_${blockId}`;
  const now = Date.now();

  // Check cache
  const cached = promptCache.get(component);
  if (cached && (now - cached.fetchedAt) < PROMPT_CACHE_TTL_MS) {
    return { text: cached.text, version: cached.version };
  }

  // deno-lint-ignore no-explicit-any
  const { data, error } = await (supabase as any)
    .from("prompt_versions")
    .select("prompt_text, version")
    .eq("component", component)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error(`PROMPT_LOAD_ERROR: ${component}`, error);
    return null;
  }

  // Update cache
  promptCache.set(component, {
    text: data.prompt_text,
    version: data.version,
    fetchedAt: now,
  });

  return { text: data.prompt_text, version: data.version };
}

// ─────────────────────────────────────────
// §3.4 — CHAMAR LLM
// ─────────────────────────────────────────

interface LLMCallResult {
  rawText: string;
  inputTokens: number;
  outputTokens: number;
}

async function callLLM(
  anthropic: InstanceType<typeof Anthropic>,
  model: string,
  systemPrompt: string,
  corpus: string,
): Promise<LLMCallResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: [{ role: "user", content: corpus }],
    });

    const rawText = (response.content[0] as { type: string; text: string }).text;
    return {
      rawText,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────
// §3.5 — PARSEAR + VALIDAR
// ─────────────────────────────────────────

/** Extrair JSON do response — pode vir dentro de ```json``` fences */
function extractJSON(raw: string): unknown {
  // Tentar parse direto
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  // Tentar extrair de fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }
  // Último recurso: encontrar primeiro { até último }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }
  throw new Error("No JSON object found in LLM response");
}

/** Camada 1 — Tipo (invariantes universais) — §3.5 */
function validateTypes(o: Record<string, unknown>, blockId: LineId): ValidationResult {
  const errors: string[] = [];

  // IL canônico no set válido
  const ilSet: readonly (number | null)[] = blockId === "L2.4"
    ? IL_VALID_SET_L24
    : IL_VALID_SET_DEFAULT;
  if (!ilSet.includes(o.il_canonico as number | null)) {
    errors.push(`IL inválido: ${o.il_canonico}`);
  }

  // Faixa coerente com IL null
  if (o.il_canonico === null && o.faixa_final !== "indeterminada") {
    errors.push("IL null mas faixa_final não é indeterminada");
  }

  // Confiança no set
  if (!["alta", "média", "baixa"].includes(o.confianca as string)) {
    errors.push(`Confiança inválida: ${o.confianca}`);
  }

  // Caso integração no range
  const maxCaso = blockId === "L1.4" ? 6 : 5;
  const caso = o.caso_integracao as number;
  if (typeof caso !== "number" || caso < 0 || caso > maxCaso) {
    errors.push(`Caso fora do range: ${caso}`);
  }

  // block_id match
  if (o.block_id !== blockId) {
    errors.push(`block_id mismatch: expected ${blockId}, got ${o.block_id}`);
  }

  // nivel_fallback no set
  if (![0, 1, 2].includes(o.nivel_fallback as number)) {
    errors.push(`nivel_fallback inválido: ${o.nivel_fallback}`);
  }

  // faixa_final no set
  if (!["A", "B", "C", "D", "indeterminada"].includes(o.faixa_final as string)) {
    errors.push(`faixa_final inválida: ${o.faixa_final}`);
  }

  // faixa_preliminar no set
  if (!["A", "B", "C", "D", "indeterminada"].includes(o.faixa_preliminar as string)) {
    errors.push(`faixa_preliminar inválida: ${o.faixa_preliminar}`);
  }

  // corte_pendente no set (quando presente)
  if (o.corte_pendente !== null && !["2_4", "4_6", "6_8"].includes(o.corte_pendente as string)) {
    errors.push(`corte_pendente inválido: ${o.corte_pendente}`);
  }

  // analise_questionario: estrutura mínima
  const aq = o.analise_questionario as Record<string, unknown> | undefined;
  if (
    !aq?.cortes ||
    !(aq.cortes as Record<string, unknown>)["2_4"] ||
    !(aq.cortes as Record<string, unknown>)["4_6"] ||
    !(aq.cortes as Record<string, unknown>)["6_8"]
  ) {
    errors.push("analise_questionario: estrutura de cortes incompleta");
  }

  // nota_auditoria presente
  if (typeof o.nota_auditoria !== "string") {
    errors.push("nota_auditoria ausente ou não é string");
  }

  // flags é objeto
  if (typeof o.flags !== "object" || o.flags === null) {
    errors.push("flags ausente ou não é objeto");
  }

  return { valid: errors.length === 0, errors };
}

/** Camada 2 — Coerência lógica (sem julgamento) — §3.5 */
function validateCoherence(
  o: Record<string, unknown>,
  input: BlockScoringInputFull,
): ValidationResult {
  const errors: string[] = [];

  // C1: Sem pills → CASO 0 obrigatório
  const nPills = input.pill_data.n_pills_com_cobertura;
  if (nPills === 0 && o.caso_integracao !== 0) {
    errors.push(`n_pills=0 mas caso_integracao=${o.caso_integracao} (esperado: 0)`);
  }

  // C2: Proteção ética → corte_pendente null
  if (input.protecao_etica && o.corte_pendente !== null) {
    errors.push("protecao_etica=true mas corte_pendente não é null");
  }

  // C3: Variante respondida → corte_pendente null
  if (input.variante_resposta !== null && o.corte_pendente !== null) {
    errors.push("variante_resposta presente mas corte_pendente não é null");
  }

  // C4: Ceiling por nivel_fallback
  const casoInt = o.caso_integracao as number;
  const ilVal = o.il_canonico as number | null;
  if (casoInt <= 0 || casoInt === 4 || casoInt === 5) {
    if (o.nivel_fallback === 1 && ilVal !== null && ilVal > 4.5) {
      errors.push(`nivel_fallback=1, CASO ${casoInt}: IL ${ilVal} > ceiling 4.5`);
    }
    if (o.nivel_fallback === 2 && ilVal !== null && ilVal > 2.0) {
      errors.push(`nivel_fallback=2, CASO ${casoInt}: IL ${ilVal} > ceiling 2.0`);
    }
  }

  // C5: L4.4 nivel_fallback sempre 0
  if (input.block_id === "L4.4" && o.nivel_fallback !== 0) {
    errors.push("L4.4: nivel_fallback deve ser 0 (design)");
  }

  // C6: Proteção ética → flags.protecao_etica_ativada = true
  const flags = o.flags as Record<string, boolean> | undefined;
  if (input.protecao_etica && !flags?.protecao_etica_ativada) {
    errors.push("protecao_etica=true mas flag não ativada no output");
  }

  // C7: IL e faixa_final coerentes
  if (ilVal !== null && o.faixa_final !== "indeterminada") {
    const faixaMap: Record<string, number[]> = {
      A: [1.0, 2.0],
      B: [3.5, 4.5],
      C: [5.5, 6.5],
      D: [7.5, 8.0],
    };
    // EXCEÇÃO L2.4
    if (input.block_id === "L2.4") {
      faixaMap["A"] = [1.5];
      faixaMap["B"] = [4.0];
      faixaMap["C"] = [6.0];
      faixaMap["D"] = [7.5];
    }
    const validForFaixa = faixaMap[o.faixa_final as string] ?? [];
    if (!validForFaixa.includes(ilVal)) {
      errors.push(`IL ${ilVal} não pertence à faixa_final ${o.faixa_final}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────
// REGRA CARDINAL — Override determinístico (v0.4.2b)
// Duas fases:
//   Fase 1: INDETERMINADO → NÃO (case-insensitive) + recalcular
//   Fase 2: Safety net — se il_canonico ainda null com resposta, forçar score mínimo
// ─────────────────────────────────────────
function applyRegraCardinal(
  o: Record<string, unknown>,
  input: BlockScoringInputFull,
): boolean {
  // Bypass total: sem resposta → nada a fazer
  if (!input.principal_resposta) return false;

  const isL24 = input.block_id === "L2.4";
  const faixaToMinIL: Record<string, number> = isL24
    ? { A: 1.5, B: 4.0, C: 6.0, D: 7.5 }
    : { A: 1.0, B: 3.5, C: 5.5, D: 7.5 };

  const aq = o.analise_questionario as Record<string, unknown> | undefined;
  let modified = false;

  // ── FASE 1: Override INDETERMINADO → NÃO (case-insensitive) ──
  // Pula protecao_etica: variante altera contexto, override de cortes não se aplica
  if (!input.protecao_etica && aq?.cortes) {
    const cortes = aq.cortes as Record<string, Record<string, unknown>>;
    for (const corteId of ["2_4", "4_6", "6_8"]) {
      const corte = cortes[corteId];
      if (corte) {
        const decisao = String(corte.decisao ?? "").toUpperCase().trim();
        if (decisao === "INDETERMINADO") {
          corte.decisao = "NÃO";
          corte.gcc = "baixo";
          corte.evidencia = "Regra Cardinal: resposta presente sem evidência do construto = NÃO";
          modified = true;
        }
      }
    }

    if (modified) {
      // Recalcular faixa_questionario pelo algoritmo A.5
      const d24 = String(cortes["2_4"]?.decisao ?? "NÃO").toUpperCase();
      const d46 = String(cortes["4_6"]?.decisao ?? "NÃO").toUpperCase();
      const d68 = String(cortes["6_8"]?.decisao ?? "NÃO").toUpperCase();

      let newFaixa: string;
      if (d24 === "NÃO" || d24 === "NAO") {
        newFaixa = "A";
      } else if (d24 === "SIM" && (d46 === "NÃO" || d46 === "NAO")) {
        newFaixa = "B";
      } else if (d46 === "SIM" && (d68 === "NÃO" || d68 === "NAO")) {
        newFaixa = "C";
      } else if (d68 === "SIM") {
        newFaixa = "D";
      } else {
        newFaixa = "A";
      }
      aq.faixa_questionario = newFaixa;
      aq.il_questionario = faixaToMinIL[newFaixa] ?? null;

      // Recalcular il_canonico para CASO 0/4/5
      const caso = o.caso_integracao as number;
      if (caso === 0 || caso === 4 || caso === 5) {
        let finalIL = faixaToMinIL[newFaixa] ?? null;
        const fb = o.nivel_fallback as number;
        if (fb === 1 && finalIL !== null && finalIL > 4.5) finalIL = isL24 ? 4.0 : 4.5;
        if (fb === 2 && finalIL !== null && finalIL > 2.0) finalIL = isL24 ? 1.5 : 2.0;
        o.il_canonico = finalIL;
        o.faixa_final = newFaixa;
        o.confianca = "baixa";
      }
    }
  }

  // ── FASE 2: Safety net — il_canonico NUNCA null com resposta presente ──
  if (o.il_canonico === null || o.il_canonico === undefined) {
    console.log(`REGRA_CARDINAL_SAFETY block=${input.block_id}: il_canonico still null after Fase 1, forcing minimum score`);

    // Tentar usar faixa_questionario se disponível
    const faixaQ = aq?.faixa_questionario as string | undefined;
    // Tentar usar faixa_estimada das pills como backup
    const faixaPill = input.pill_data?.faixa_estimada as string | undefined;

    let scoreFaixa: string;
    if (faixaQ && faixaQ !== "indeterminada" && faixaToMinIL[faixaQ]) {
      scoreFaixa = faixaQ;
    } else if (faixaPill && faixaPill !== "indeterminada" && faixaToMinIL[faixaPill]) {
      scoreFaixa = faixaPill;
    } else {
      scoreFaixa = "A"; // Último recurso: faixa mínima
    }

    let finalIL = faixaToMinIL[scoreFaixa]!;
    const fb = (o.nivel_fallback as number) ?? 0;
    if (fb === 1 && finalIL > 4.5) finalIL = isL24 ? 4.0 : 4.5;
    if (fb === 2 && finalIL > 2.0) finalIL = isL24 ? 1.5 : 2.0;

    o.il_canonico = finalIL;
    o.faixa_final = scoreFaixa;
    o.confianca = "baixa";
    modified = true;
  }

  // ── Flags ──
  if (modified) {
    const flags = o.flags as Record<string, unknown>;
    if (flags) {
      flags.regra_cardinal_aplicada = true;
      flags.baixa_confianca = true;
      if (o.il_canonico !== null) {
        flags.reask_recomendado = false;
      }
    }
    // Garantir faixa_final coerente
    if (o.il_canonico !== null && o.faixa_final) {
      // faixa_final já foi setada acima
    }
  }

  return modified;
}

/** Construir output de erro — il_canonico=null, confianca=baixa, scoring_error=true */
function buildErrorOutput(blockId: LineId, auditId: string): BlockScoringOutputFull {
  return {
    block_id: blockId,
    il_canonico: null,
    faixa_final: "indeterminada",
    confianca: "baixa",
    corte_pendente: null,
    faixa_preliminar: "indeterminada",
    caso_integracao: 0,
    nivel_fallback: 0,
    analise_questionario: {
      cortes: {
        "2_4": { decisao: "INDETERMINADO", gcc: "nao_aplicavel", evidencia: "Scoring error — sem análise" },
        "4_6": { decisao: "INDETERMINADO", gcc: "nao_aplicavel", evidencia: "Scoring error — sem análise" },
        "6_8": { decisao: "INDETERMINADO", gcc: "nao_aplicavel", evidencia: "Scoring error — sem análise" },
      },
      faixa_questionario: "indeterminada",
      il_questionario: null,
    },
    nota_auditoria: "Scoring failed — LLM error or validation failure",
    flags: { scoring_error: true },
    scoring_audit_id: auditId,
  };
}

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);
  }

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "UNAUTHORIZED", message: "Missing authorization" }, 401);
  }

  // Parse body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400);
  }

  // §3.1 — Validar input
  const validation = validateInput(rawBody);
  if (!validation.ok) {
    return json({ error: "INVALID_INPUT", message: validation.message }, 400);
  }
  const input = validation.input;
  const blockId = input.block_id;

  // Gerar audit ID antes de tudo (§3.6)
  const auditId = crypto.randomUUID();
  const startTime = Date.now();

  // Clients
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  // §3.2 — Montar corpus
  const corpus = buildCorpus(input);

  // §3.3 — Carregar prompt
  // deno-lint-ignore no-explicit-any
  const prompt = await loadPrompt(blockId, supabase as any);
  if (!prompt) {
    return json(
      { error: "INTERNAL_ERROR", message: `No active prompt for scoring_block_${blockId}` },
      500,
    );
  }

  // §3.4 — Scoring (Sonnet)
  const model = MODEL_CONFIG[blockId] ?? DEFAULT_MODEL;
  let output: BlockScoringOutputFull | null = null;
  let lastRawOutput = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let retryCount = 0;
  let parseSuccess = false;
  let coherenceWarnings: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retryCount = attempt;

    try {
      // Chamar LLM
      const llmResult = await callLLM(anthropic, model, prompt.text, corpus);
      lastRawOutput = llmResult.rawText;
      inputTokens += llmResult.inputTokens;
      outputTokens += llmResult.outputTokens;

      // Parsear JSON
      const parsed = extractJSON(lastRawOutput) as Record<string, unknown>;

      // Camada 1 — Validação de tipo
      const typeResult = validateTypes(parsed, blockId);
      if (!typeResult.valid) {
        console.warn(
          `SCORING_TYPE_FAIL block=${blockId} attempt=${attempt} errors=${JSON.stringify(typeResult.errors)}`,
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
          continue;
        }
        break;
      }

      // Camada 2 — Validação de coerência (§3.5 — não retry)
      const coherenceResult = validateCoherence(parsed, input);
      if (!coherenceResult.valid) {
        coherenceWarnings = coherenceResult.errors;
        console.warn(
          `SCORING_COHERENCE_WARN block=${blockId} warnings=${JSON.stringify(coherenceWarnings)}`,
        );
        (parsed.flags as Record<string, boolean>).coherence_warning = true;
      }

      // Regra Cardinal — override determinístico (v0.4.2b)
      const cardinalApplied = applyRegraCardinal(parsed, input);
      if (cardinalApplied) {
        console.log(`REGRA_CARDINAL block=${blockId}: INDETERMINADO→NÃO override aplicado`);
      }

      // Sucesso: montar output completo
      parseSuccess = true;
      output = {
        ...(parsed as unknown as Omit<BlockScoringOutputFull, "scoring_audit_id">),
        scoring_audit_id: auditId,
      };
      break;
    } catch (err) {
      console.error(`SCORING_LLM_ERROR block=${blockId} attempt=${attempt}:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
        continue;
      }
    }
  }

  // Se todas tentativas falharam → error output
  if (!output) {
    output = buildErrorOutput(blockId, auditId);
  }

  const durationMs = Date.now() - startTime;

  // §3.6 — Persistir audit (degradação graciosa se falhar)
  const { error: auditErr } = await supabase.from("scoring_audit").insert({
    id: auditId,
    ipe_cycle_id: input.ipe_cycle_id,
    component: `scoring_block_${blockId}`,
    model,
    prompt_version: prompt.version,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    raw_input: corpus,
    raw_output: lastRawOutput || JSON.stringify(output),
    parsed_output: output,
    parse_success: parseSuccess,
    retry_count: retryCount,
    duration_ms: durationMs,
    scored_at: new Date().toISOString(),
  });

  if (auditErr) {
    console.error("SCORING_AUDIT_INSERT_ERROR:", JSON.stringify(auditErr));
    // Degradação graciosa: retorna output mesmo se audit falhar (§3.6)
  }

  return json(output, 200);
});
