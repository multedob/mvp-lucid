// ============================================================
// ipe-scoring/index.ts
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.0, §4.1–4.5
//        scoring_pill_PI v0.7.4 — formato de entrada esperado
// Responsabilidade: scoring Momento 1
//   Reconstrói corpus no formato exato esperado por cada prompt.
//   Chama Claude (Sonnet), valida output JSON, persiste pill_scoring.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic         from "https://esm.sh/@anthropic-ai/sdk@0.27.3";
import type { LineId, LinhaCorpus, PillId } from "../_shared/ipe_types.ts";

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

// Fonte: PIPELINE §P2 — Sonnet até calibração empírica
// Dívida técnica: migrar para Haiku após 20 usuários com Sonnet
const SCORING_MODEL       = "claude-sonnet-4-20250514";
const SCORING_TEMPERATURE = 0;   // determinístico — SCORING_SPEC v1.3
const MAX_RETRIES         = 2;   // PIPELINE §4.5

const IL_VALID_VALUES = new Set([1.0, 2.0, 3.5, 4.5, 5.5, 6.5, 7.5, 8.0]);

const PROMPT_COMPONENT_MAP: Record<PillId, string> = {
  PI:   "scoring_pill_PI",
  PII:  "scoring_pill_PII",
  PIII: "scoring_pill_PIII",
  PIV:  "scoring_pill_PIV",
  PV:   "scoring_pill_PV",
  PVI:  "scoring_pill_PVI",
};

// ─────────────────────────────────────────
// buildCorpusText — CRÍTICO (C1/C2)
// Reconstrói o corpus no formato EXATO esperado por cada prompt de scoring.
// Os prompts foram calibrados com campos nomeados hierárquicos — não texto livre.
// Fonte: scoring_pill_PI v0.7.4 §ENTRADAS + PILL_I–VI_Prototipo v0.3
// ─────────────────────────────────────────
function buildCorpusText(
  pillId: PillId,
  pillResponse: Record<string, unknown>
): string {
  const lines: string[] = [];

  // M1: tempo de pausa (sinal de ressonância — PROTOCOLO §8.1)
  if (pillResponse.m1_tempo_segundos != null) {
    lines.push(`M1_tempo_segundos: ${pillResponse.m1_tempo_segundos}`);
  }

  // M2: resposta à cena
  if (pillResponse.m2_resposta) {
    lines.push(`\nM2_abertura: "${pillResponse.m2_resposta}"`);
  }

  // CAL signals (calibração M2)
  if (pillResponse.m2_cal_signals) {
    const cal = pillResponse.m2_cal_signals as Record<string, unknown>;
    lines.push(
      `\nCAL_signals:\n` +
      `  localizacao: ${cal.localizacao ?? "null"}\n` +
      `  custo: ${cal.custo ?? "null"}\n` +
      `  foco: ${cal.foco ?? "null"}\n` +
      `  horizonte: ${cal.horizonte ?? "null"}`
    );
  }

  // M3: campos hierárquicos nomeados
  // Formato esperado pelo scorer: chaves exatas M3_1_regua, M3_2_escolha, M3_3_inventario
  if (pillResponse.m3_respostas) {
    const m3 = pillResponse.m3_respostas as Record<string, unknown>;
    const regua    = m3.M3_1_regua    as Record<string, unknown> | undefined;
    const escolha  = m3.M3_2_escolha  as Record<string, unknown> | undefined;
    const inv      = m3.M3_3_inventario as Record<string, unknown> | undefined;

    if (regua) {
      lines.push(
        `\nM3_1_regua:\n` +
        `  posicao: "${regua.posicao ?? ""}"\n` +
        `  duas_palavras: "${regua.duas_palavras ?? ""}"\n` +
        `  situacao_oposta: "${regua.situacao_oposta ?? ""}"`
      );
    }

    if (escolha) {
      lines.push(
        `\nM3_2_escolha:\n` +
        `  opcao: "${escolha.opcao ?? ""}"\n` +
        `  abre_mao: "${escolha.abre_mao ?? ""}"\n` +
        `  followup_C: ${escolha.followup_C ? `"${escolha.followup_C}"` : "null"}\n` +
        `  followup_D: ${escolha.followup_D ? `"${escolha.followup_D}"` : "null"}`
      );
    }

    if (inv) {
      // Campos base comuns
      let invText =
        `\nM3_3_inventario:\n` +
        `  narrativa: "${inv.narrativa ?? ""}"\n` +
        `  condicao: "${inv.condicao ?? ""}"\n`;

      // Campos Pill-específicos de M3_3
      // Fonte: PILL_I–VI_Prototipo v0.3 — corpus_linhas e subchaves por Pill
      switch (pillId) {
        case "PI":
          invText += `  cobertura_L1_3: "${inv.cobertura_L1_3 ?? ""}"`;
          break;
        case "PII":
          invText +=
            `  cobertura_L1_3: "${inv.cobertura_L1_3 ?? ""}"\n` +
            `  cobertura_L1_4: "${inv.cobertura_L1_4 ?? ""}"`;
          break;
        case "PIII":
          invText +=
            `  cobertura_L1_3: "${inv.cobertura_L1_3 ?? ""}"\n` +
            `  cobertura_L2_2: "${inv.cobertura_L2_2 ?? ""}"`;
          break;
        case "PIV":
          invText += `  cobertura_L1_3: "${inv.cobertura_L1_3 ?? ""}"`;
          break;
        case "PV":
          // PV tem pergunta dedicada L4.3 em M3_3 (âncora)
          invText +=
            `  cobertura_L1_3: "${inv.cobertura_L1_3 ?? ""}"\n` +
            `  cobertura_L4_3: "${inv.cobertura_L4_3 ?? ""}"`;
          break;
        case "PVI":
          // PVI: cobertura_L1_3 = null (Opção A — cobertura primária)
          invText +=
            `  cobertura_L1_3: null\n` +
            `  cobertura_L1_3_pvi: "${inv.cobertura_L1_3_pvi ?? ""}"\n` +
            `  cobertura_L1_4: "${inv.cobertura_L1_4 ?? ""}"`;
          break;
      }
      lines.push(invText);
    }
  }

  // M4: campos JSONB Pill-específicos
  // Fonte: PILL_I–VI_Prototipo v0.3 — M4 subchaves por Pill
  if (pillResponse.m4_resposta) {
    const m4 = pillResponse.m4_resposta as Record<string, unknown>;
    let m4Text = `\nM4_superficie:\n  percepcao: "${m4.percepcao ?? ""}"`;

    switch (pillId) {
      case "PI":
        // PI: presenca_deslocamento → corpus primário L4.4
        m4Text += `\n  presenca_deslocamento: "${m4.presenca_deslocamento ?? ""}"`;
        break;
      case "PV":
        // PV: conhecimento_em_campo → corpus primário L4.3
        // presenca_para_outros → corpus_transversal["L4.4"]
        m4Text +=
          `\n  conhecimento_em_campo: "${m4.conhecimento_em_campo ?? ""}"` +
          `\n  presenca_para_outros: "${m4.presenca_para_outros ?? ""}"`;
        break;
      default:
        // PII/PIII/PIV/PVI: presenca_para_outros → corpus_transversal["L4.4"]
        m4Text += `\n  presenca_para_outros: "${m4.presenca_para_outros ?? ""}"`;
        break;
    }
    lines.push(m4Text);
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────
// Validação de output do scoring
// Fonte: PIPELINE §4.5 + SCORING_SPEC v1.3
// C6: valida não apenas IL e FD, mas também faixa, status_sinal e GCC_por_corte
// ─────────────────────────────────────────

const VALID_FAIXAS      = new Set(["A", "B", "C", "D", "indeterminada"]);
const VALID_STATUS      = new Set(["completo", "incompleto"]);
const VALID_GCC         = new Set(["alto", "medio", "baixo", "insuficiente", "nao_aplicavel"]);
const VALID_CORTE_DECS  = new Set(["SIM", "NÃO", "INDETERMINADO"]);
const CORTES_ESPERADOS  = ["2_4", "4_6", "6_8"];

interface ScoringOutput {
  sinais: Record<string, LinhaCorpus>;
  corpus_transversal?: Record<string, unknown>;
  sinais_L2_4?: Record<string, unknown>;
  calibracao_M2?: Record<string, unknown>;
  M4_longitudinal?: Record<string, unknown>;
}

interface ParseResult {
  success: boolean;
  reason?: string;
  data?:   ScoringOutput;
}

function validateScoringOutput(raw: string): ParseResult {
  // Strip markdown fences (```json ... ```) — handles leading/trailing whitespace and text before fence
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    // Fallback: try simple strip
    cleaned = cleaned.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  }

  let parsed: ScoringOutput;
  try { parsed = JSON.parse(cleaned); }
  catch { return { success: false, reason: "invalid_json" }; }

  if (!parsed.sinais || typeof parsed.sinais !== "object") {
    return { success: false, reason: "schema_violation: missing sinais" };
  }

  for (const [lineId, linha] of Object.entries(parsed.sinais)) {
    // Validar IL
    const il = linha?.IL_sinal?.numerico;
    if (il !== null && il !== undefined && !IL_VALID_VALUES.has(il)) {
      return { success: false, reason: `il_out_of_range for ${lineId}: ${il}` };
    }

    // Validar FD
    const fd = linha?.FD_linha;
    if (typeof fd !== "number" || fd < 0 || fd > 1) {
      return { success: false, reason: `fd_out_of_range for ${lineId}: ${fd}` };
    }

    // C6 — Validar faixa
    const faixa = linha?.IL_sinal?.faixa;
    if (faixa !== undefined && !VALID_FAIXAS.has(faixa as string)) {
      return { success: false, reason: `faixa_inválida for ${lineId}: ${faixa}` };
    }

    // C6 — Validar status_sinal
    const status = linha?.status_sinal;
    if (status !== undefined && !VALID_STATUS.has(status as string)) {
      return { success: false, reason: `status_sinal_inválido for ${lineId}: ${status}` };
    }

    // C6 — Validar GCC_por_corte (estrutura mínima se presente)
    const gcc = linha?.IL_sinal?.cortes as Record<string, unknown> | undefined;
    if (gcc) {
      for (const corte of CORTES_ESPERADOS) {
        const c = gcc[corte] as Record<string, unknown> | undefined;
        if (c) {
          if (!VALID_CORTE_DECS.has(c.decisao as string)) {
            return { success: false, reason: `gcc_decisao_inválida for ${lineId} corte ${corte}: ${c.decisao}` };
          }
          if (!VALID_GCC.has(c.gcc as string)) {
            return { success: false, reason: `gcc_valor_inválido for ${lineId} corte ${corte}: ${c.gcc}` };
          }
        }
      }
    }
  }

  return { success: true, data: parsed };
}

function nullScoringResult(): ScoringOutput {
  return { sinais: {} };
}

function computeFieldMetrics(
  sinais: Record<string, LinhaCorpus>
): { fd_campo_medio: number; linhas_validas: number } {
  const fds: number[] = [];
  let linhas_validas   = 0;

  for (const linha of Object.values(sinais)) {
    if (typeof linha.FD_linha === "number") fds.push(linha.FD_linha);
    if (linha.status_sinal === "completo")  linhas_validas++;
  }

  const fd_campo_medio = fds.length > 0
    ? fds.reduce((s, v) => s + v, 0) / fds.length
    : 0;

  return { fd_campo_medio: Math.round(fd_campo_medio * 100) / 100, linhas_validas };
}

// ─────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST")    return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "UNAUTHORIZED", message: "Missing authorization" }, 401);
  }

  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch { return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400); }

  const b = rawBody as Record<string, unknown>;
  if (typeof b.ipe_cycle_id !== "string" || typeof b.pill_id !== "string") {
    return json({ error: "INVALID_INPUT", message: "ipe_cycle_id and pill_id required" }, 400);
  }

  const ipe_cycle_id = b.ipe_cycle_id as string;
  const pill_id      = b.pill_id as PillId;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  // PHASE 1: Carregar corpus
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

  // PHASE 2: Carregar prompt ativo
  const component = PROMPT_COMPONENT_MAP[pill_id];
  if (!component) {
    return json({ error: "INVALID_INPUT", message: `Unknown pill_id: ${pill_id}` }, 400);
  }

  const { data: promptRow, error: promptErr } = await supabase
    .from("prompt_versions")
    .select("id, version, prompt_text")
    .eq("component", component)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (promptErr || !promptRow) {
    return json({
      error:   "INTERNAL_ERROR",
      message: `No active prompt for ${component}. Seed prompt_versions first.`,
    }, 500);
  }

  // PHASE 3: Construir corpus no formato esperado pelo prompt
  const corpusText = buildCorpusText(pill_id, pillResponse as Record<string, unknown>);

  // PHASE 4: Scoring com retry
  let finalOutput: ScoringOutput = nullScoringResult();
  let parse_success               = false;
  let last_raw_output             = "";
  let retry_count                 = 0;
  let input_tokens                = 0;
  let output_tokens               = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retry_count = attempt;
    try {
      const userMessage =
        `Score o corpus abaixo segundo as instruções do prompt.\n\n` +
        `===CORPUS===\n${corpusText}`;

      const response = await anthropic.messages.create({
        model:       SCORING_MODEL,
        max_tokens:  4096,
        temperature: SCORING_TEMPERATURE,
        system:      promptRow.prompt_text,
        messages:    [{ role: "user", content: userMessage }],
      });

      input_tokens    = response.usage?.input_tokens  ?? 0;
      output_tokens   = response.usage?.output_tokens ?? 0;
      last_raw_output = (response.content[0] as { type: string; text: string }).text;

      const result = validateScoringOutput(last_raw_output);
      if (result.success && result.data) {
        finalOutput   = result.data;
        parse_success = true;
        break;
      }
      console.warn(`SCORING_PARSE_FAIL attempt=${attempt} reason=${result.reason}`);
    } catch (err) {
      console.error(`SCORING_LLM_ERROR attempt=${attempt}:`, err);
      if (attempt === MAX_RETRIES) break;
    }
  }

  // PHASE 5: Persistir scoring_audit (sempre)
  const auditId = crypto.randomUUID();
  await supabase.from("scoring_audit").insert({
    id:             auditId,
    ipe_cycle_id,
    component,
    prompt_version: promptRow.version,
    input_tokens,
    output_tokens,
    raw_output:     last_raw_output,
    parsed_output:  parse_success ? finalOutput : null,
    parse_success,
    retry_count,
    model:          SCORING_MODEL,
  });

  // PHASE 6: Persistir pill_scoring
  const { fd_campo_medio, linhas_validas } = computeFieldMetrics(finalOutput.sinais);

  // Buscar id após upsert para retornar pill_scoring_id real (C5)
  const { data: scoringRow, error: scoringErr } = await supabase
    .from("pill_scoring")
    .upsert(
      {
        ipe_cycle_id,
        pill_id,
        corpus_linhas:      finalOutput.sinais,
        corpus_transversal: finalOutput.corpus_transversal ?? null,
        sinais_l24:         finalOutput.sinais_L2_4 ?? null,
        scoring_model:      SCORING_MODEL,
        scoring_version:    promptRow.version,
        scored_at:          new Date().toISOString(),
      },
      { onConflict: "ipe_cycle_id,pill_id" }
    )
    .select("id")
    .single();

  if (scoringErr) {
    console.error("PILL_SCORING_PERSIST_ERROR:", scoringErr);
    return json({ error: "INTERNAL_ERROR", message: "Failed to persist scoring" }, 500);
  }

  return json({
    pill_scoring_id: scoringRow?.id ?? null,
    corpus_linhas:   finalOutput.sinais,
    fd_campo_medio,
    linhas_validas,
    parse_success,
    scoring_version: promptRow.version,
  }, 200);
});
