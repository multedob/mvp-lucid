// ============================================================
// rag.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fonte: RAG_SCHEMA_v1.0, RAG_NODE_MODEL_v1.2
// Natureza: função pura — zero I/O
// Pipeline: 9 etapas determinísticas obrigatórias
// Nenhuma etapa pode ser invertida
// ============================================================

import type {
  RagNode,
  SelectedNode,
  HistoricalNode,
  HagoState,
  MacroBand,
  NodeType,
  DensityClass,
} from "./types.ts";
import { fmt2 } from "./hash.ts";

// ─────────────────────────────────────────
// RAG EXECUTOR INPUT
// ─────────────────────────────────────────

export interface RagExecutorInput {
  CGG:            number;         // float — valor numérico do RADAR
  hagoState:      HagoState;
  nodes:          RagNode[];      // corpus completo
  history:        HistoricalNode[]; // últimos 7 nodes ativados
}

// ─────────────────────────────────────────
// EXECUTE RAG
// 9 etapas conforme RAG_SCHEMA_v1.0, seção 3
// ─────────────────────────────────────────

export function executeRag(input: RagExecutorInput): SelectedNode[] {
  const { CGG, hagoState, nodes, history } = input;

  // ─── Etapa 1: H0 → nenhum node
  // Fonte: RAG_SCHEMA_v1.0, seção 6 (tabela)
  if (hagoState === "H0") return [];

  // ─── Etapa 2: Filtro risk_score
  // Descartar: teleology=2 OU prescriptive=2 OU normative=2
  // Score=1: permitido apenas em H2
  // Fonte: RAG_SCHEMA_v1.0, seção 4
  const afterRisk = nodes.filter((n) => {
    if (
      n.teleology_score    === 2 ||
      n.prescriptive_score === 2 ||
      n.normative_score    === 2
    ) return false;

    if (hagoState !== "H2") {
      // H1: score=1 não permitido
      if (
        n.teleology_score    === 1 ||
        n.prescriptive_score === 1 ||
        n.normative_score    === 1
      ) return false;
    }

    return true;
  });

  // ─── Etapa 3: Filtro Stage
  // Elegível: stage_min ≤ CGG ≤ stage_max
  // Sem expansão, sem fallback, sem suavização
  // Fonte: RAG_SCHEMA_v1.0, seção 5
  const afterStage = afterRisk.filter(
    (n) => CGG >= n.stage_min && CGG <= n.stage_max
  );

  if (afterStage.length === 0) return [];

  // ─── Etapa 4: Filtro node_type por Estado
  // H1: Declarative, Tension
  // H2: Declarative, Tension, Contrast
  // Fonte: RAG_SCHEMA_v1.0, seção 6
  const afterType = afterStage.filter((n) => {
    if (hagoState === "H1") {
      return n.node_type === "Declarative" || n.node_type === "Tension";
    }
    return true; // H2: todos permitidos
  });

  if (afterType.length === 0) return [];

  // ─── Etapa 5: Filtro density por Estado
  // density_class=3 permitido apenas em H2
  // Fonte: RAG_SCHEMA_v1.0, seção 7
  const afterDensity = afterType.filter((n) => {
    if (n.density_class === 3 && hagoState !== "H2") return false;
    return true;
  });

  if (afterDensity.length === 0) return [];

  // ─── Etapa 6: Cálculo de Distância Estrutural
  // distance = min(|CGG - stage_min|, |CGG - stage_max|)
  // Fonte: RAG_SCHEMA_v1.0, seção 8
  const withDist = afterDensity.map((n) => ({
    node: n,
    dist: Math.min(
      Math.abs(CGG - n.stage_min),
      Math.abs(CGG - n.stage_max)
    ),
    amplitude: n.stage_max - n.stage_min,
  }));

  // ─── Etapa 7: Ordenação por Distância
  // Primário: distance ASC
  // Desempate 1: menor amplitude ASC
  // Desempate 2: node_id ASC (ordem estável)
  // Fonte: RAG_SCHEMA_v1.0, seção 8
  withDist.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    if (a.amplitude !== b.amplitude) return a.amplitude - b.amplitude;
    return a.node.node_id < b.node.node_id ? -1 : 1;
  });

  // ─── Etapa 8: Alternância Histórica Controlada
  // Memória: últimos 7 nodes ativados
  // Regras (em ordem):
  //   1. Não repetir mesmo node_id
  //   2. Evitar mesmo source_work consecutivo
  //   3. Evitar mesmo node_type 3x seguidas
  // Alternância APENAS se diferença de distância ≤ 0.2
  // Se diferença > 0.2: proximidade estrutural prevalece
  // Fonte: RAG_SCHEMA_v1.0, seção 9
  const recentNodeIds    = new Set(history.map((h) => h.node_id));
  const lastSourceWork   = history[0]?.source_work ?? null;
  const lastThreeTypes   = history.slice(0, 3).map((h) => h.node_type);
  const typeRepeatBlocked =
    lastThreeTypes.length === 3 &&
    lastThreeTypes.every((t) => t === lastThreeTypes[0]);

  // Candidato principal: primeiro da lista ordenada
  let principal = withDist[0];

  // Tentar alternância apenas se há candidato alternativo
  // e diferença de distância ≤ 0.2
  if (withDist.length > 1) {
    const alt = withDist.find((c, idx) => {
      if (idx === 0) return false;
      if (Math.abs(c.dist - principal.dist) > 0.2) return false;

      // Verifica se alternativa resolve alguma das restrições
      const altBetter =
        (recentNodeIds.has(principal.node.node_id) && !recentNodeIds.has(c.node.node_id)) ||
        // BUG-1 fix: comparar source_work do node, não node_id
        (principal.node.source_work === lastSourceWork && c.node.source_work !== lastSourceWork) ||
        (typeRepeatBlocked && c.node.node_type !== lastThreeTypes[0]);

      return altBetter;
    });

    if (alt) principal = alt;
  }

  // ─── Etapa 9: Seleção Final
  // H1: máximo 1 node
  // H2: até 2 nodes, com condições estritas para o segundo
  // Fonte: RAG_SCHEMA_v1.0, seções 10–11

  const result: SelectedNode[] = [toSelected(principal)];

  if (hagoState === "H2" && withDist.length > 1) {
    // Segundo node: condições cumulativas
    // 1. node_type DIFERENTE do principal
    // 2. density_class ≤ density_class do principal
    // 3. |dist_secundário − dist_principal| ≥ 0.3
    // 4. Se principal é Contrast density=3 → secundário NÃO pode ser Contrast density=3
    // Fonte: RAG_SCHEMA_v1.0, seção 10
    const second = withDist.find((c) => {
      if (c === principal) return false;
      if (c.node.node_type === principal.node.node_type) return false;
      if (c.node.density_class > principal.node.density_class) return false;
      if (Math.abs(c.dist - principal.dist) < 0.3) return false;
      if (
        principal.node.node_type === "Contrast" &&
        principal.node.density_class === 3 &&
        c.node.node_type === "Contrast" &&
        c.node.density_class === 3
      ) return false;
      return true;
    });

    if (second) {
      result.push(toSelected(second));
    }
  }

  return result;
}

// ─────────────────────────────────────────
// HELPER: converte candidato → SelectedNode
// distance formatada como "X.XX"
// ─────────────────────────────────────────

function toSelected(
  c: { node: RagNode; dist: number }
): SelectedNode {
  return {
    node_id:       c.node.node_id,
    macro_band:    c.node.macro_band as MacroBand,
    node_type:     c.node.node_type as NodeType,
    density_class: c.node.density_class as DensityClass,
    distance:      fmt2(c.dist),
  };
}
