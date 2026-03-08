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
  CycleState,   // S1: movido de hago.ts → types.ts (C2.3)
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
  cycle_state:          CycleState;  // B1.3: substitui consolidated_flag
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
    cycle_state,
    cyclesCompleted,
    input_classification,
  } = input;

  // ─── Invariante 1: primeiro ciclo sempre H0
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.1
  // R2.2 — Guarda defensiva: com B1.3, ciclo 0 chega com cycle_state="S0"
  // e seria capturado pela Invariante 3 abaixo. Esta invariante é
  // tecnicamente redundante no fluxo normal, mas protege contra caller
  // malformado que envie cycle_state="S1" com cyclesCompleted=0.
  // Mantida como barreira explícita — não é dead code; é defesa de contrato.
  if (cyclesCompleted === 0) return "H0";

  // ─── Invariante 2: inibição normativa
  // C5_PEDIDO_PRESCRITIVO → H0 imediato
  // C7_RISCO_HUMANO → H0 imediato (BUG-2 fix)
  //   Crise ativa não deve persistir estado elevado (H1/H2)
  //   Ciclo seguinte recomeça de H0 para recalibrar
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 5
  if (input_classification === "C5_PEDIDO_PRESCRITIVO") return "H0";
  if (input_classification === "C7_RISCO_HUMANO") return "H0";

  // ─── Invariante 3 (B1.3): S0 bloqueia promoção
  // cycle_state = S0 (ciclo aberto) → H0 imediato
  // Promoção H1/H2 requer ciclo encerrado (S1 ou S2)
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.2; decisão arquitetural B1.3
  //
  // C1.4 — H0 no primeiro turno de cada ciclo novo: PÓS-MVP (decisão B)
  // Problema original: HAGO não distingue "primeiro turno de S1 novo" de
  // "turno subsequente de S1". Requereria turn_within_cycle ou cycle_sequence_number.
  // Solução adotada: responsabilidade do frontend/IPE. Ao iniciar um novo ciclo,
  // o frontend envia cycle_state="S0" no primeiro turno → esta Invariante 3
  // já retorna H0 corretamente. O engine não precisa detectar a transição.
  // Nenhuma mudança necessária aqui.
  if (cycle_state === "S0") return "H0";

  // ─── Thresholds ativos para o stage_base atual
  const t = getThresholds(stage_base);

  // ─── Qualificação H1
  // MD ≥ threshold AND DC ≤ threshold AND VE ≤ threshold
  // CEC NÃO é requisito para H1
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.2
  const qualifiesH1 =
    MD >= t.MD &&
    DC <= t.DC &&
    VE <= t.VE;

  // ─── Qualificação H2
  // S2 (múltiplos ciclos consolidados): CEC ≥ t.CEC
  // S1 (ciclo consolidado único): CEC ≥ t.CEC + margem (10%)
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.3 (B1.3)
  const cecMinH2 = cecThresholdForH2(stage_base, cycle_state === "S2");
  const qualifiesH2 = qualifiesH1 && CEC >= cecMinH2;

  // ─── Máquina de estados com regressão automática
  // Regressão: H2 → H1, H1 → H0
  // Promoção: nunca salta estados
  // Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.4
  switch (previousState) {
    case "H2": {
      if (qualifiesH2) return "H2";
      if (qualifiesH1) return "H1";
      return "H0";
    }
    case "H1": {
      if (qualifiesH2) return "H2";
      if (qualifiesH1) return "H1";
      return "H0";
    }
    case "H0":
    default: {
      if (qualifiesH1) return "H1";
      return "H0";
    }
  }
}

// ─────────────────────────────────────────
// RE-EXPORT HagoState para módulos que
// precisam do tipo sem importar types.ts
// ─────────────────────────────────────────

export type { HagoState };
