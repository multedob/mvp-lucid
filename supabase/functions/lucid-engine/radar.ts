// ============================================================
// radar.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fontes: RADAR_v6 (consolidado),
//         RADAR_PIPELINE_SPEC_v2.1,
//         RADAR_PARAMETER_TABLE_v1.0,
//         RADAR_ONTOLOGY_SCHEMA_v1
// Natureza: função pura — zero I/O
// ============================================================

import { THRESHOLDS, getThresholds } from "./types.ts";
import type { RadarInput, StructuralSnapshot } from "./types.ts";
import { fmt2 } from "./hash.ts";

// ─────────────────────────────────────────
// RADAR EXECUTOR INPUT
// RadarInput (d1-d4) + dados históricos necessários
// previousCGG: extraído de previous_snapshot.CGG (parseFloat)
// cyclesCompleted: version do usuário (base_version)
// previousLines: 16 linhas do ciclo anterior (para V_norm)
//                null se base_version == 0
// ─────────────────────────────────────────

export interface RadarExecutorInput {
  lines: RadarInput;
  previousCGG: number; // parseFloat(previous_snapshot.CGG)
  cyclesCompleted: number; // base_version (0 = primeiro ciclo)
  previousLines: number[] | null; // 16 linhas do ciclo anterior
}

// ─────────────────────────────────────────
// RADAR OUTPUT (numérico interno)
// Todos os valores são number — fmt2() aplicado no Core
// ─────────────────────────────────────────

export interface RadarOutput {
  CGG0: number;
  CGG: number;
  D1: number;
  D2: number;
  D3: number;
  D4: number;
  DC: number;
  CEC: number;
  VE: number;
  MD: number;
  IC: number;
  stage_base: number;
  substage: number;
  consolidated_flag: boolean;
}

// ─────────────────────────────────────────
// HELPERS MATEMÁTICOS
// ─────────────────────────────────────────

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  const mu = avg(values);
  const variance = values.reduce((sum, v) => sum + (v - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ─────────────────────────────────────────
// EXECUTE RADAR
// 9 passos determinísticos conforme RADAR_PIPELINE_SPEC_v2.1
// Função pura — sem I/O, sem clock, sem aleatoriedade
// ─────────────────────────────────────────

export function executeRadar(input: RadarExecutorInput): RadarOutput {
  const { lines, previousCGG, cyclesCompleted, previousLines } = input;

  // Flatten: 16 linhas em array [d1[0..3], d2[0..3], d3[0..3], d4[0..3]]
  const all: number[] = [...lines.d1, ...lines.d2, ...lines.d3, ...lines.d4];

  // ─── Passo 1 — CGG₀
  // CGG₀ = (1/16) × Σ Lᵢ
  // Fonte: RADAR_v6, seção 1
  const CGG0 = avg(all);

  // ─── Passo 2 — Dimensões D1–D4
  // Dⱼ = média das 4 linhas da dimensão j
  // Fonte: RADAR_v6, seção 1 / RADAR_PIPELINE_SPEC_v2.1, seção 2.3
  const D1 = avg([...lines.d1]);
  const D2 = avg([...lines.d2]);
  const D3 = avg([...lines.d3]);
  const D4 = avg([...lines.d4]);

  // ─── Passo 3 — Piso Global de Coerência Dimensional
  // CGG = min(CGG₀, D1+1.5, D2+1.5, D3+1.5, D4+1.5)
  // Aplicado uma única vez. Sem recursividade.
  // Fonte: RADAR_v6, seção 2 / RADAR_PIPELINE_SPEC_v2.1, seção 2.4
  const CGG_raw = Math.min(CGG0, D1 + 1.5, D2 + 1.5, D3 + 1.5, D4 + 1.5);
  // CGG ∈ [1,8] — piso mínimo estrutural
  const CGG = clamp(CGG_raw, 1, 8);

  // ─── Passo 4 — Divergência Contextual (DC)
  // No MVP sem contextos externos: usa as 16 linhas como "contextos"
  // Δ = (1/N) × Σ|Li - Lj| para todos os pares
  // N = 16×15/2 = 120
  // DC = Δ / 4
  // Fonte: RADAR_v6, seção 3 / RADAR_PIPELINE_SPEC_v2.1, seção 2.5
  let sumDiffs = 0;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      sumDiffs += Math.abs(all[i] - all[j]);
    }
  }
  const N_pairs = (all.length * (all.length - 1)) / 2; // 120
  const delta = sumDiffs / N_pairs;
  const DC = clamp(delta / 4, 0, 1);

  // ─── Passo 5 — CEC bruto
  // CEC_bruto = 1 − (σ(D1..D4) / 4)
  // σ_max operacional = 4
  // Fonte: RADAR_v6, seção 4 / RADAR_PIPELINE_SPEC_v2.1, seção 2.6
  const CEC_bruto = 1 - stdDev([D1, D2, D3, D4]) / 4;

  // ─── Passo 6 — Penalidade Relacional (D3)
  // Se D3 < 4.5: CEC = max(CEC_bruto − 0.10, 0)
  // Fonte: RADAR_v6, seção 10 / RADAR_PIPELINE_SPEC_v2.1, seção 2.7
  const CEC = D3 < THRESHOLDS.D3_penalty_floor ? Math.max(CEC_bruto - THRESHOLDS.CEC_penalty_D3, 0) : CEC_bruto;

  // ─── Passo 7 — Variância Estrutural (VE)
  // Primeiro ciclo (cyclesCompleted === 0): VE = 0
  // Demais: VE = |CGG_t − CGG_t-1|
  // VE ∈ [0,7] — não normalizado
  // Fonte: RADAR_v6, seção 6 / RADAR_PIPELINE_SPEC_v2.1, seção 2.8
  const VE = cyclesCompleted === 0 ? 0 : Math.abs(CGG - previousCGG);

  // ─── Passo 8 — Maturidade de Dados (MD)
  // MD = (C_norm + V_norm + I_norm + O_norm) / 4
  // Regime S0 (ciclo aberto): MD_intraciclo = min(MD, 0.60)
  // Fonte: RADAR_v6, seção 5 / RADAR_PIPELINE_SPEC_v2.1, seção 2.9

  // C_norm: robustez por número de ciclos
  // C_norm = min(cyclesCompleted / 4, 1)
  const C_norm = Math.min(cyclesCompleted / 4, 1);

  // V_norm: estabilidade longitudinal (variação média entre ciclos)
  // V = média das variações absolutas linha a linha vs ciclo anterior
  // Se não há ciclo anterior: V = 0 (máxima instabilidade não se aplica)
  const V =
    previousLines !== null && previousLines.length === 16 ? avg(all.map((l, i) => Math.abs(l - previousLines[i]))) : 0;
  const V_norm = 1 - Math.min(V, 7) / 7;

  // I_norm: homogeneidade interna das 16 linhas (σ_intra)
  // I_norm = 1 − min(σ_intra, 4) / 4
  const sigma_intra = stdDev(all);
  const I_norm = 1 - Math.min(sigma_intra, 4) / 4;

  // O_norm: proporção de linhas com desvio > 2 em relação à média global
  // F = count(|Li - globalMean| > 2) / 16
  // O_norm = 1 − F
  const globalMean = avg(all);
  const F = all.filter((l) => Math.abs(l - globalMean) > 2).length / 16;
  const O_norm = 1 - F;

  // MD_raw = média dos 4 componentes, clamp [0,1]
  const MD_raw = clamp((C_norm + V_norm + I_norm + O_norm) / 4, 0, 1);

  // S0 (ciclo aberto): cap em MD_intraciclo_cap = 0.60
  // O Core opera sempre em S0 — fechamento é responsabilidade da Edge
  const MD = Math.min(MD_raw, THRESHOLDS.MD_intraciclo_cap);

  // ─── Passo 9 — Índice de Confiança (IC)
  // IC = MD_raw × CEC
  // Fonte: RADAR_v6, seção 7 / RADAR_ONTOLOGY_SCHEMA_v1:
  // "IC é calculado exclusivamente com MD_raw.
  //  MD_intraciclo (cap 0.60) nunca participa do IC."
  // IC ∈ [0,1]
  // IC não participa da promoção — regula densidade interpretativa
  const IC = clamp(MD_raw * CEC, 0, 1);

  // ─── Mapeamento CGG → Estágio
  // stage_base = floor(CGG), clamp [1,8]
  // Fonte: RADAR_v6, seção 1.1 / RADAR_PIPELINE_SPEC_v2.1, seção 3.1
  const stage_base = clamp(Math.floor(CGG), 1, 8);

  // ─── Subestágio
  // f = CGG − floor(CGG)
  // 0: f < 0.33  (N−)
  // 1: 0.33 ≤ f < 0.66  (N)
  // 2: f ≥ 0.66  (N+)
  // Fonte: RADAR_PIPELINE_SPEC_v2.1, seção 3.2
  const f = CGG - Math.floor(CGG);
  const substage = f < 0.33 ? 0 : f < 0.66 ? 1 : 2;

  // ─── consolidated_flag
  // Todos os critérios de promoção satisfeitos simultaneamente
  // Usa thresholds do conjunto ativo para o stage_base atual
  // Fonte: RADAR_v6, seção 8-9 / HAGO_STATE_MACHINE_v1.3
  const t = getThresholds(stage_base);
  const consolidated_flag = MD_raw >= t.MD && DC <= t.DC && CEC >= t.CEC && VE <= t.VE;

  return {
    CGG0,
    CGG,
    D1,
    D2,
    D3,
    D4,
    DC,
    CEC,
    VE,
    MD,
    IC,
    stage_base,
    substage,
    consolidated_flag,
  };
}

// ─────────────────────────────────────────
// BUILD SNAPSHOT
// Converte RadarOutput → StructuralSnapshot (strings "X.XX")
// Deve ser chamado pelo Core após executeRadar()
// Fonte: CANONICAL_JSON_SPEC_v1.1, STRUCTURAL_CORE_CONTRACT_v1.8
// ─────────────────────────────────────────

export function buildSnapshot(r: RadarOutput): StructuralSnapshot {
  return {
    CGG0: fmt2(r.CGG0),
    CGG: fmt2(r.CGG),
    D1: fmt2(r.D1),
    D2: fmt2(r.D2),
    D3: fmt2(r.D3),
    D4: fmt2(r.D4),
    CEC: fmt2(r.CEC),
    DC: fmt2(r.DC),
    MD: fmt2(r.MD),
    VE: fmt2(r.VE),
    IC: fmt2(r.IC),
    stage_base: r.stage_base,
    substage: r.substage,
    consolidated_flag: r.consolidated_flag,
  };
}
