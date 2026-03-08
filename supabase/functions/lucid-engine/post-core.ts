// ============================================================
// post-core.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fontes: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1,
//         MOVEMENT_RESOLUTION_SPEC_v2.1,
//         LUCE_MOVEMENT_ENUMERATION_SPEC_v1.1
// Natureza: funções puras — zero I/O
// Posição: PHASE 5.3 (Response Type) + PHASE 5.4 (Movement)
// ============================================================

import type {
  InputClassification,
  ResponseType,
  Movement,
  HagoState,
  PostCoreOutput,
} from "./types.ts";

// ─────────────────────────────────────────
// RESOLVE RESPONSE TYPE
// Entrada: input_classification (apenas)
// Proibido: hago_state, snapshot, node_selection, histórico
// Fonte: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1, seção 4
// ─────────────────────────────────────────

export function resolveResponseType(
  input_classification: InputClassification
): ResponseType {

  // ─── R4_LIMITANTE
  // C7_RISCO_HUMANO → R4 (regra absoluta)
  // C5_PEDIDO_PRESCRITIVO → R4 (regra absoluta)
  // Fonte: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1, seção 4 (R4)
  if (
    input_classification === "C7_RISCO_HUMANO" ||
    input_classification === "C5_PEDIDO_PRESCRITIVO"
  ) {
    return "R4_LIMITANTE";
  }

  // ─── R2_REFLEXIVA
  // C6_VALIDACAO_IDENTITARIA → R2
  // C3_SOFREIMENTO_EMOCIONAL → R2
  // C2_AMBIVALENCIA_INTERNA  → R2
  // Fonte: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1, seção 4 (R2)
  if (
    input_classification === "C6_VALIDACAO_IDENTITARIA" ||
    input_classification === "C3_SOFREIMENTO_EMOCIONAL" ||
    input_classification === "C2_AMBIVALENCIA_INTERNA"
  ) {
    return "R2_REFLEXIVA";
  }

  // ─── R1_EXPLICATIVA
  // C1_CONFUSAO_CONCEITUAL → R1
  // Fonte: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1, seção 4 (R1)
  if (input_classification === "C1_CONFUSAO_CONCEITUAL") {
    return "R1_EXPLICATIVA";
  }

  // ─── R3_EXPLORATORIA
  // C4_CURIOSIDADE_ESTRUTURAL → R3
  // Fonte: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1, seção 4 (R3)
  // Nota: única categoria restante após as anteriores
  return "R3_EXPLORATORIA";
}

// ─────────────────────────────────────────
// RESOLVE MOVEMENT
// Entrada: response_type + hago_state (apenas)
// Proibido: snapshot, node_selection, IC, DC, VE, CEC, histórico,
//           input_classification diretamente
// Fonte: MOVEMENT_RESOLUTION_SPEC_v2.1, seções 4–5
// ─────────────────────────────────────────

export function resolveMovement(
  response_type: ResponseType,
  hago_state:    HagoState
): { movement_primary: Movement; movement_secondary: Movement | null } {

  // ─── R4_LIMITANTE → regra absoluta
  // movement_primary = M6_POSICIONAMENTO_LIMITE
  // movement_secondary = null (sempre)
  // Fonte: MOVEMENT_RESOLUTION_SPEC_v2.1, seção 4 (R4)
  if (response_type === "R4_LIMITANTE") {
    return {
      movement_primary:   "M6_POSICIONAMENTO_LIMITE",
      movement_secondary: null,
    };
  }

  // ─── Resolução do movimento principal por tabela
  // Fonte: MOVEMENT_RESOLUTION_SPEC_v2.1, seção 4 (tabelas R1/R2/R3)
  let movement_primary: Movement;

  switch (response_type) {
    case "R1_EXPLICATIVA": {
      // H0 → M7, H1 → M3, H2 → M4
      // PC-6 — Limitação M7: M7 como primário ocorre apenas em H0.
      // H2 em AMBIGUOUS/INSUFFICIENT recebe M4 (primário) + M7 (secundário, ver abaixo).
      // M7 como primário para H2 requer atualização em MOVEMENT_RESOLUTION_SPEC v2.1 — pós-MVP.
      if (hago_state === "H0") movement_primary = "M7_CLARIFICACAO_SEMANTICA";
      else if (hago_state === "H1") movement_primary = "M3_NOMEACAO_PADRAO";
      else movement_primary = "M4_DESLOCAMENTO_NIVEL"; // H2
      break;
    }
    case "R2_REFLEXIVA": {
      // H0 → M2, H1 → M3, H2 → M4
      if (hago_state === "H0") movement_primary = "M2_ESPELHAMENTO_PRECISO";
      else if (hago_state === "H1") movement_primary = "M3_NOMEACAO_PADRAO";
      else movement_primary = "M4_DESLOCAMENTO_NIVEL"; // H2
      break;
    }
    case "R3_EXPLORATORIA": {
      // H0 → M5, H1 → M1, H2 → M4
      if (hago_state === "H0") movement_primary = "M5_SUSPENSAO_ATIVA";
      else if (hago_state === "H1") movement_primary = "M1_BIFURCACAO";
      else movement_primary = "M4_DESLOCAMENTO_NIVEL"; // H2
      break;
    }
    default: {
      // Defensivo: nunca deve ocorrer se tipos estão corretos
      throw new Error(
        `resolveMovement: unknown response_type "${response_type}"`
      );
    }
  }

  // ─── Movimento secundário (opcional)
  // Permitido APENAS se: hago_state == H2 AND response_type != R4
  // R4 já retornou acima — aqui H2 é a única condição restante
  // Fonte: MOVEMENT_RESOLUTION_SPEC_v2.1, seção 5
  let movement_secondary: Movement | null = null;

  if (hago_state === "H2") {
    // Tabela de combinações válidas:
    // M4_DESLOCAMENTO_NIVEL  → M7_CLARIFICACAO_SEMANTICA
    // M3_NOMEACAO_PADRAO     → M7_CLARIFICACAO_SEMANTICA
    // M1_BIFURCACAO          → M7_CLARIFICACAO_SEMANTICA
    // Nenhuma outra combinação é válida
    if (
      movement_primary === "M4_DESLOCAMENTO_NIVEL" ||
      movement_primary === "M3_NOMEACAO_PADRAO"    ||
      movement_primary === "M1_BIFURCACAO"
    ) {
      movement_secondary = "M7_CLARIFICACAO_SEMANTICA";
    }
  }

  return { movement_primary, movement_secondary };
}

// ─────────────────────────────────────────
// EXECUTE POST CORE
// Orquestra resolveResponseType + resolveMovement
// Retorna PostCoreOutput (types.ts, seção 13)
// ─────────────────────────────────────────

export function executePostCore(
  input_classification: InputClassification,
  hago_state:           HagoState
): PostCoreOutput {
  const response_type = resolveResponseType(input_classification);
  const { movement_primary, movement_secondary } = resolveMovement(
    response_type,
    hago_state
  );

  return {
    response_type,
    movement_primary,
    movement_secondary,
  };
}
