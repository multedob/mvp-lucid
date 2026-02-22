// ============================================================
// cda.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fonte: CDA_v2.1 (FROZEN)
// Natureza: função pura — zero I/O
// Posição: após RAG, antes de node_selection final
// Regras: exatamente 2 — nenhuma adição permitida
// Mudança nestas regras exige Major bump estrutural
// ============================================================

import type {
  SelectedNode,
  PreviousNode,
} from "./types.ts";

// ─────────────────────────────────────────
// CDA INPUT
// selected:          output do RAG (já ordenado)
// previousNode:      PreviousNode | null (PREVIOUS_NODE_RESOLUTION_PROTOCOL_v2.2.2)
//                    apenas node_id, node_type, density_class
// orderedCandidates: todos os candidatos do RAG ordenados
//                    usados como pool de substituição
// ─────────────────────────────────────────

export interface CdaInput {
  selected:          SelectedNode[];
  previousNode:      PreviousNode | null;
  orderedCandidates: SelectedNode[];
}

// ─────────────────────────────────────────
// APPLY CDA
// Janela: apenas ciclo imediatamente anterior (previousNode)
// Sem memória multi-ciclo
// Sem suavização progressiva
// Sem balanceamento de intensidade
// Sem interferência estrutural
// Fonte: CDA_v2.1, seção rules
// ─────────────────────────────────────────

export function applyCda(input: CdaInput): SelectedNode[] {
  const { selected, previousNode, orderedCandidates } = input;

  // Sem seleção → retorna vazio
  if (selected.length === 0) return [];

  // Sem ciclo anterior → nenhuma regra se aplica
  if (previousNode === null) return selected;

  const current = selected[0];

  // ─── Regra 1: Anti-repetição literal
  // O mesmo node_id não pode ser ativado em 2 ciclos consecutivos
  // Condição: current.node_id == previousNode.node_id
  // Ação: selecionar próximo elegível por ordenação determinística
  //       (distance ASC, node_id ASC — já garantido pelo orderedCandidates)
  // Fallback: allow original selection se não há alternativa
  // Fonte: CDA_v2.1, rule_1_anti_literal_repetition
  if (current.node_id === previousNode.node_id) {
    const replacement = orderedCandidates.find(
      (n) => n.node_id !== previousNode.node_id
    );
    // allow original selection
    return replacement ? [replacement, ...selected.slice(1)] : selected;
  }

  // ─── Regra 2: Anti-avalanche máxima intensidade
  // Contrast + density_class=3 não pode ocorrer em 2 ciclos consecutivos
  // Condição: previous AND current são ambos Contrast density=3
  // Ação: selecionar próximo elegível que não seja Contrast density=3
  // Fallback: allow original selection se não há alternativa
  // Fonte: CDA_v2.1, rule_2_anti_maximum_intensity_avalanche
  if (
    previousNode.node_type    === "Contrast" &&
    previousNode.density_class === 3 &&
    current.node_type          === "Contrast" &&
    current.density_class      === 3
  ) {
    const replacement = orderedCandidates.find(
      (n) => !(n.node_type === "Contrast" && n.density_class === 3)
    );
    // allow original selection
    return replacement ? [replacement, ...selected.slice(1)] : selected;
  }

  // Nenhuma regra violada → retorna seleção original
  return selected;
}
