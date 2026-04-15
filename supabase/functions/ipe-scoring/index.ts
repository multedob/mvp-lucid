// ============================================================
// ipe-scoring/index.ts
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.0, §4.1–4.5
//        v0.7.11 — IL_sinal normalization + primitive handling + numerico derivation from faixa
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
const MAX_TOKENS          = 8192; // v0.7.6 — aumentado de 4096 para evitar truncamento

const IL_VALID_ARRAY  = [1.0, 2.0, 3.5, 4.5, 5.5, 6.5, 7.5, 8.0];
const IL_VALID_VALUES = new Set(IL_VALID_ARRAY);
const IL_SNAP_TOLERANCE = 0.75; // v0.7.7 — snap ILs próximos ao valor válido mais perto

/** Snap IL para o valor válido mais próximo se dentro da tolerância */
function snapIL(raw: number | null | undefined): number | null | undefined {
  if (raw === null || raw === undefined) return raw;
  if (IL_VALID_VALUES.has(raw)) return raw;
  let best = raw;
  let bestDist = Infinity;
  for (const v of IL_VALID_ARRAY) {
    const d = Math.abs(raw - v);
    if (d < bestDist || (d === bestDist && v > best)) { bestDist = d; best = v; }
  }
  if (bestDist <= IL_SNAP_TOLERANCE) {
    console.warn(`IL_SNAP: ${raw} → ${best} (dist=${bestDist})`);
    return best;
  }
  return raw; // fora da tolerância — vai falhar na validação (intencional)
}

// ── v0.7.9 — Faixa lookup table ──
const FAIXA_MAP: Record<string, [number, number]> = {
  A: [1.0, 2.0],
  B: [3.5, 4.5],
  C: [5.5, 6.5],
  D: [7.5, 8.0],
};

/**
 * v0.7.9 — Derive faixa from corte decisions.
 * Cortes "2_4", "4_6", "6_8" represent boundary crossings.
 * Highest SIM corte determines the faixa.
 */
function deriveFaixaFromCortes(cortes: Record<string, unknown>): string | null {
  const getDecision = (corte: Record<string, unknown> | undefined): string => {
    if (!corte) return "NÃO";
    const d = (corte.decisao ?? corte["decisão"] ?? corte.decisão ?? "NÃO") as string;
    const upper = d.toUpperCase();
    // "NÃO_APLICÁVEL" ou "NAO_APLICAVEL" = corte não se aplica = não cruza fronteira
    if (upper.includes("APLIC")) return "NÃO";
    return upper;
  };

  const c68 = cortes["6_8"] as Record<string, unknown> | undefined;
  const c46 = cortes["4_6"] as Record<string, unknown> | undefined;
  const c24 = cortes["2_4"] as Record<string, unknown> | undefined;

  if (getDecision(c68) === "SIM") return "D";
  if (getDecision(c46) === "SIM") return "C";
  if (getDecision(c24) === "SIM") return "B";
  return "A";
}

/**
 * v0.7.9 — Derive numerico from faixa + GCC of determining corte.
 * Within each faixa, GCC=alto → upper value, else → lower value.
 */
function deriveNumericoFromFaixa(faixa: string, cortes?: Record<string, unknown>): number {
  const range = FAIXA_MAP[faixa];
  if (!range) return 2.0; // fallback

  if (!cortes) return range[0]; // default to lower value

  // Find the determining corte's GCC
  let determiningCorte: Record<string, unknown> | undefined;
  switch (faixa) {
    case "D": determiningCorte = cortes["6_8"] as Record<string, unknown> | undefined; break;
    case "C": determiningCorte = cortes["4_6"] as Record<string, unknown> | undefined; break;
    case "B": determiningCorte = cortes["2_4"] as Record<string, unknown> | undefined; break;
    case "A": determiningCorte = cortes["2_4"] as Record<string, unknown> | undefined; break;
  }

  if (!determiningCorte) return range[0];

  const gcc = ((determiningCorte.gcc ?? determiningCorte.GCC) as string ?? "").toLowerCase();
  // alto → upper value in faixa, else → lower value
  return gcc === "alto" ? range[1] : range[0];
}

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
const VALID_GCC         = new Set(["alto", "medio", "baixo", "insuficiente", "nao_aplicavel", "não_aplicável"]);
const VALID_CORTE_DECS  = new Set(["SIM", "NÃO", "INDETERMINADO", "NÃO_APLICÁVEL", "NAO_APLICAVEL"]);
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
  // v0.7.6 — Extração robusta de JSON: handles fences, truncamento, e texto antes/depois
  let cleaned = raw.trim();

  // 1. Fence completa: ```json ... ```
  const fenceComplete = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceComplete) {
    cleaned = fenceComplete[1].trim();
  } else {
    // 2. Fence aberta sem fechamento (output truncado): ```json ...EOF
    const fenceOpen = cleaned.match(/```(?:json)?\s*\n?([\s\S]+)$/);
    if (fenceOpen) {
      cleaned = fenceOpen[1].trim();
    } else {
      // 3. Fallback: strip simples
      cleaned = cleaned.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
    }
  }

  // 4. Extrair bloco JSON por braces se ainda houver texto ao redor
  const firstBrace = cleaned.indexOf("{");
  const lastBrace  = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let parsed: ScoringOutput;
  try { parsed = JSON.parse(cleaned); }
  catch { return { success: false, reason: `invalid_json (len=${raw.length}, cleaned_len=${cleaned.length})` }; }

  // v0.7.8 — Aceitar tanto "sinais" quanto "linhas" como chave principal
  // PI usa "sinais", PII+ pode usar "linhas" dependendo do prompt
  const sinaisData = parsed.sinais ?? (parsed as unknown as Record<string, unknown>).linhas as Record<string, LinhaCorpus> | undefined;
  if (!sinaisData || typeof sinaisData !== "object") {
    return { success: false, reason: "schema_violation: missing sinais/linhas" };
  }
  // Normalizar para "sinais" no parsed output
  parsed.sinais = sinaisData;
  // Limpar chave "linhas" duplicada se existir
  delete (parsed as unknown as Record<string, unknown>).linhas;

  for (const [lineId, linha] of Object.entries(parsed.sinais)) {
    // v0.7.10 — Se IL_sinal é um primitivo (número), converter para objeto
    if (linha?.IL_sinal !== undefined && linha?.IL_sinal !== null && typeof linha.IL_sinal !== "object") {
      const primitiveVal = linha.IL_sinal;
      (linha as any).IL_sinal = { numerico: typeof primitiveVal === "number" ? primitiveVal : undefined };
      console.warn(`IL_PRIMITIVE ${lineId}: IL_sinal was ${typeof primitiveVal} (${primitiveVal}), converted to object`);
    }

    // v0.7.7 — Snap IL antes de validar
    // v0.7.8 — Aceitar IL_sinal ou acesso direto a campos de corte
    const ilSinal = (linha?.IL_sinal && typeof linha.IL_sinal === "object") ? linha.IL_sinal : linha;
    const numerico = ilSinal?.numerico;
    if (numerico !== null && numerico !== undefined) {
      const snapped = snapIL(numerico) as number;
      if (linha?.IL_sinal && typeof linha.IL_sinal === "object") {
        linha.IL_sinal.numerico = snapped;
      }
    }

    // Validar IL
    const il = (linha?.IL_sinal && typeof linha.IL_sinal === "object") ? linha.IL_sinal.numerico : linha?.numerico;
    if (il !== null && il !== undefined && !IL_VALID_VALUES.has(il)) {
      return { success: false, reason: `il_out_of_range for ${lineId}: ${il}` };
    }

    // Validar FD — aceitar FD_linha ou fd_linha
    const fd = linha?.FD_linha ?? linha?.fd_linha;
    if (fd !== undefined && fd !== null) {
      if (typeof fd !== "number" || fd < 0 || fd > 1) {
        return { success: false, reason: `fd_out_of_range for ${lineId}: ${fd}` };
      }
    }

    // C6 — Validar faixa
    const faixa = (linha?.IL_sinal && typeof linha.IL_sinal === "object") ? linha.IL_sinal.faixa : linha?.faixa;
    if (faixa !== undefined && !VALID_FAIXAS.has(faixa as string)) {
      return { success: false, reason: `faixa_inválida for ${lineId}: ${faixa}` };
    }

    // C6 — Validar status_sinal
    const status = linha?.status_sinal;
    if (status !== undefined && !VALID_STATUS.has(status as string)) {
      return { success: false, reason: `status_sinal_inválido for ${lineId}: ${status}` };
    }

    // C6 — Validar GCC_por_corte (estrutura mínima se presente)
    // v0.7.8 — Aceitar "cortes" em IL_sinal ou diretamente na linha
    const gcc = ((linha?.IL_sinal && typeof linha.IL_sinal === "object" ? linha.IL_sinal.cortes : undefined) ?? linha?.cortes) as Record<string, unknown> | undefined;
    if (gcc) {
      for (const corte of CORTES_ESPERADOS) {
        const c = gcc[corte] as Record<string, unknown> | undefined;
        if (c) {
          // v0.7.8 — Aceitar "decisao" ou "decisão" (com acento), case-insensitive
          const decisao = (c.decisao ?? c["decisão"]) as string | undefined;
          if (decisao) {
            const decUpper = decisao.toUpperCase();
            const decNorm = decUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
            if (!VALID_CORTE_DECS.has(decUpper) && !VALID_CORTE_DECS.has(decNorm)) {
              return { success: false, reason: `gcc_decisao_inválida for ${lineId} corte ${corte}: ${decisao}` };
            }
          }
          // v0.7.8 — Aceitar "gcc" ou "GCC" (case-insensitive)
          // v0.7.9 — Aceitar variantes com acento: "não_aplicável" → "nao_aplicavel"
          const gccVal = (c.gcc ?? c.GCC) as string | undefined;
          if (gccVal) {
            const gccNorm = gccVal.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
            if (!VALID_GCC.has(gccNorm) && !VALID_GCC.has(gccVal.toLowerCase())) {
              return { success: false, reason: `gcc_valor_inválido for ${lineId} corte ${corte}: ${gccVal}` };
            }
          }
        }
      }
    }
  }

  // ── v0.7.9 — NORMALIZAÇÃO PÓS-VALIDAÇÃO ──
  // Garante que TODA linha tenha IL_sinal: { numerico, faixa }
  // Isso permite que o benchmark leia sempre no mesmo path.
  for (const [lineId, linha] of Object.entries(parsed.sinais)) {
    if (!linha) continue;

    // Caso 1: IL_sinal já existe com numerico e faixa → OK
    if (linha.IL_sinal?.numerico !== undefined && linha.IL_sinal?.faixa !== undefined) {
      continue;
    }

    // Caso 2: numerico/faixa existem diretamente na linha (sem wrapper IL_sinal)
    const directNum   = (linha as any).numerico;
    const directFaixa = (linha as any).faixa;

    if (directNum !== undefined || directFaixa !== undefined) {
      if (!linha.IL_sinal) {
        (linha as any).IL_sinal = {};
      }
      if (directNum !== undefined && linha.IL_sinal.numerico === undefined) {
        const snapped = snapIL(directNum);
        linha.IL_sinal.numerico = snapped !== undefined && snapped !== null ? snapped : directNum;
      }
      if (directFaixa !== undefined && linha.IL_sinal.faixa === undefined) {
        linha.IL_sinal.faixa = directFaixa;
      }
      // v0.7.11 — Se faixa foi setada mas numerico ainda falta, derivar dos cortes
      if (linha.IL_sinal.numerico === undefined && linha.IL_sinal.faixa) {
        const cortesForDerive = (linha.IL_sinal.cortes ?? (linha as any).cortes) as Record<string, unknown> | undefined;
        const derivedNum = deriveNumericoFromFaixa(linha.IL_sinal.faixa as string, cortesForDerive);
        linha.IL_sinal.numerico = derivedNum;
        console.warn(`IL_NORMALIZE+DERIVE ${lineId}: faixa=${linha.IL_sinal.faixa} → numerico=${derivedNum}`);
      } else {
        console.warn(`IL_NORMALIZE ${lineId}: direct → IL_sinal (num=${linha.IL_sinal.numerico}, faixa=${linha.IL_sinal.faixa})`);
      }
      // v0.7.11 — Só continue se AMBOS estão preenchidos
      if (linha.IL_sinal.numerico !== undefined && linha.IL_sinal.faixa !== undefined) {
        continue;
      }
    }

    // Caso 3: Sem numerico/faixa explícitos, mas tem cortes → derivar
    const cortes = (linha.IL_sinal?.cortes ?? (linha as any).cortes) as Record<string, unknown> | undefined;
    if (cortes) {
      const derivedFaixa = deriveFaixaFromCortes(cortes);
      if (derivedFaixa) {
        const derivedNum = deriveNumericoFromFaixa(derivedFaixa, cortes);
        if (!linha.IL_sinal) {
          (linha as any).IL_sinal = {};
        }
        if (linha.IL_sinal.numerico === undefined) {
          linha.IL_sinal.numerico = derivedNum;
        }
        if (linha.IL_sinal.faixa === undefined) {
          linha.IL_sinal.faixa = derivedFaixa;
        }
        console.warn(`IL_DERIVE ${lineId}: cortes → IL_sinal (num=${derivedNum}, faixa=${derivedFaixa})`);
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
  let last_parse_reason           = "";  // v0.7.6 — diagnóstico

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retry_count = attempt;
    try {
      const userMessage =
        `Score o corpus abaixo segundo as instruções do prompt.\n\n` +
        `===CORPUS===\n${corpusText}`;

      const response = await anthropic.messages.create({
        model:       SCORING_MODEL,
        max_tokens:  MAX_TOKENS,
        temperature: SCORING_TEMPERATURE,
        system:      promptRow.prompt_text,
        messages:    [{ role: "user", content: userMessage }],
      });

      input_tokens    = response.usage?.input_tokens  ?? 0;
      output_tokens   = response.usage?.output_tokens ?? 0;
      last_raw_output = (response.content[0] as { type: string; text: string }).text;

      // v0.7.6 — detectar truncamento por stop_reason
      const stopReason = response.stop_reason;
      if (stopReason === "max_tokens") {
        console.warn(`SCORING_TRUNCATED attempt=${attempt} output_tokens=${output_tokens}`);
      }

      const result = validateScoringOutput(last_raw_output);
      if (result.success && result.data) {
        finalOutput   = result.data;
        parse_success = true;
        last_parse_reason = "";
        break;
      }
      last_parse_reason = result.reason ?? "unknown";
      console.warn(`SCORING_PARSE_FAIL attempt=${attempt} reason=${result.reason} stop=${stopReason}`);
    } catch (err) {
      console.error(`SCORING_LLM_ERROR attempt=${attempt}:`, err);
      last_parse_reason = `llm_error: ${(err as Error).message}`;
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
    parse_reason:   last_parse_reason || null,  // v0.7.6 — diagnóstico de falha
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
