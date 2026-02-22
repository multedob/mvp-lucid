// ============================================================
// hago.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fonte: HAGO_STATE_MACHINE_v1.3
//        HAGO_ENGINE_SPEC_v2
// Natureza: função pura — zero I/O
// ============================================================

import {
  THRESHOLDS,
  getThresholds,
  cecThresholdForH2,
} from "./types.ts";
import type {
  HagoState,
  InputClassification,
} from "./types.ts";

// ─────────────────────────────────────────
// HAGO INPUT
// Recebe exclusivamente outputs do RADAR
// e input_classification já resolvida pela Edge
// Fonte: HAGO_STATE_MACHINE_v1.3, seção 3
// ─────────────────────────────────────────

export interface HagoInput {
  previousState:        HagoState;
  MD:                   number;
  DC:                   number;
  CEC:                  number;
  VE:                   number;
  stage_base:           number;
  consolidated_flag:    boolean;
  cyclesCompleted:      number;
  input_classification: InputClassification;
}

// ─────────────────────────────────────────
// EXECUTE HAGO STATE MACHINE
// Determina estado conversacional para o ciclo atual
// Ordem de avaliação:
//   1. Primeiro ciclo → H0 (invariante)
//   2. Inibição normativa (C5) → H0 (invariante)
//   3. Qualificação H1 (sem CEC)
//   4. Qualificação H2 (com CEC, com ou sem S2)
//   5. Regressão automática
// Fonte: HAGO_STATE_MACHINE_v1.3, seções 4–5
// ─────────────────────────────────────────

export function executeHago(input: HagoInput): HagoState {
  const {
    previousState,
    MD,
    DC,
    CEC,
    VE,
    stage_base,
    consolidated_flag,
    cyclesCompleted,
    input_classification,
  } = input;

  // ─── Invariante 1: primeiro ciclo sempre H0
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.1
  if (cyclesCompleted === 0) return "H0";

  // ─── Invariante 2: inibição normativa
  // C5_PEDIDO_PRESCRITIVO → H0 imediato
  // Pedido explícito de orientação prática força H0
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 5
  if (input_classification === "C5_PEDIDO_PRESCRITIVO") return "H0";

  // ─── Thresholds ativos para o stage_base atual
  // Fonte: RADAR_PARAMETER_TABLE_v1.0 via getThresholds()
  const t = getThresholds(stage_base);

  // ─── Qualificação H1
  // Condições: MD ≥ threshold AND DC ≤ threshold AND VE ≤ threshold
  // CEC NÃO é requisito para H1
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.2
  const qualifiesH1 =
    MD >= t.MD &&
    DC <= t.DC &&
    VE <= t.VE;

  // ─── Qualificação H2
  // Depende de consolidated_flag:
  //   S2 (consolidated): CEC ≥ t.CEC
  //   S1 (not consolidated): CEC ≥ t.CEC + margem (10%)
  // Mais: qualifiesH1 deve ser true
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.3
  // A8: margem_CEC escala com CEC_threshold do conjunto ativo
  const cecMinH2 = cecThresholdForH2(stage_base, consolidated_flag);
  const qualifiesH2 = qualifiesH1 && CEC >= cecMinH2;

  // ─── Máquina de estados com regressão automática
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.4
  // Regressão: H2 → H1, H1 → H0 (automática se condições perdidas)
  // Promoção: nunca salta estados (H0 não vai direto para H2)

  switch (previousState) {
    case "H2": {
      if (qualifiesH2) return "H2";
      if (qualifiesH1) return "H1";  // regressão H2 → H1
      return "H0";                    // regressão H2 → H0
    }
    case "H1": {
      if (qualifiesH2) return "H2";  // promoção H1 → H2
      if (qualifiesH1) return "H1";  // manutenção
      return "H0";                    // regressão H1 → H0
    }
    case "H0":
    default: {
      // H0 nunca salta para H2 diretamente
      if (qualifiesH1) return "H1";  // promoção H0 → H1
      return "H0";                    // manutenção
    }
  }
}

// ─────────────────────────────────────────
// RE-EXPORT HagoState para módulos que
// precisam do tipo sem importar types.ts
// ─────────────────────────────────────────

export type { HagoState };
