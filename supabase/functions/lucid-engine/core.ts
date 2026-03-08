// ============================================================
// core.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fonte: STRUCTURAL_CORE_CONTRACT_v1.8
// Natureza: função pura — zero I/O, zero LLM, zero clock
// Ordem de execução: 8 passos obrigatórios canônicos
// ============================================================

import type {
  CoreInput,
  CoreOutput,
  StructuralSnapshot,
  SelectedNode,
  HagoState,
  AuditTrace,
  CycleState,   // S1: movido de hago.ts → types.ts (C2.3)
  CONTRACT_VERSION,
} from "./types.ts";
import { executeRadar, buildSnapshot } from "./radar.ts";
import { executeHago }                 from "./hago.ts";
import { executeRag }                  from "./rag.ts";
import { applyCda }                    from "./cda.ts";
import {
  computeInputHash,
  computeStructuralHash,
  canonicalize,
} from "./hash.ts";

// ─────────────────────────────────────────
// EXTENDED CORE INPUT
// CoreInput (types.ts) + previous_hago_state
// previous_hago_state não está no contrato HTTP —
// é resolvido pela Edge (SELECT hago_state FROM cycles WHERE ...)
// Ambiguidade A9: não especificado em STRUCTURAL_CORE_CONTRACT_v1.8
// Decisão MVP: Edge injeta como campo adicional
// ─────────────────────────────────────────

export interface ExtendedCoreInput extends CoreInput {
  previous_hago_state: HagoState;
  cyclesCompleted: number;
  previousLines: number[] | null;
  // B1.3: cycle_state determinado pelo IPE, consumido como input externo
  // Backend valida, não calcula
  cycle_state: CycleState;
}

// ─────────────────────────────────────────
// EXECUTE STRUCTURAL CORE
// 8 passos obrigatórios — STRUCTURAL_CORE_CONTRACT_v1.8, seção 5
//   1. Validate input
//   2. Compute structural metrics (RADAR)
//   3. Execute HAGO_STATE_MACHINE
//   4. Execute RAG selection
//   5. Apply CDA_v2.1 deterministically
//   6. Produce final node_selection
//   7. Compute hashes
//   8. Return output
// ─────────────────────────────────────────

export async function executeStructuralCore(
  input: ExtendedCoreInput
): Promise<CoreOutput> {

  // ─── Passo 1: Validação de input
  // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 4
  if (!input.input_classification) {
    throw new Error("CORE_INPUT_INVALID: input_classification is required");
  }
  if (!input.previous_snapshot) {
    throw new Error("CORE_INPUT_INVALID: previous_snapshot cannot be null");
  }
  if (input.contract_version !== "1.8") {
    throw new Error(
      `CORE_INPUT_INVALID: contract_version must be "1.8", got "${input.contract_version}"`
    );
  }
  if (!input.structural_model_version) {
    throw new Error("CORE_INPUT_INVALID: structural_model_version is required");
  }

  // ─── Passo 2: RADAR
  // Converte RadarInput (d1-d4) + contexto histórico → métricas estruturais
  // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 5 item 2
  const previousCGG = parseFloat(input.previous_snapshot.CGG);

  const radarOutput = executeRadar({
    lines:           input.raw_input,
    previousCGG:     isNaN(previousCGG) ? 1 : previousCGG,
    cyclesCompleted: input.cyclesCompleted,
    previousLines:   input.previousLines,
  });

  // Converte RadarOutput numérico → StructuralSnapshot (strings "X.XX")
  // Fonte: CANONICAL_JSON_SPEC_v1.1
  const structural_snapshot: StructuralSnapshot = buildSnapshot(radarOutput);

  // C1.2 — MD cap S0: snapshot persiste MD capado em ciclo aberto
  // Decisão arquitetural (R1.1): cap aplicado em core.ts pós-buildSnapshot
  // Razão: radar.ts é função pura sem conhecimento de cycle_state
  // IC usa MD_raw (calculado no RADAR antes do cap) — não afetado
  // HAGO retorna H0 para S0 antes de avaliar MD — cap não afeta HAGO
  // Cap canônico S0: MD ≤ 0.60 (RADAR_PIPELINE_SPEC_v2.1, seção 4.3)
  if (input.cycle_state === "S0") {
    const MD_capped = Math.min(parseFloat(structural_snapshot.MD), 0.60);
    structural_snapshot.MD = MD_capped.toFixed(2);
  }

  // ─── Passo 3: HAGO STATE MACHINE
  // Determina estado conversacional para este ciclo
  // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 5 item 3
  const hago_state: HagoState = executeHago({
    previousState:        input.previous_hago_state,
    MD:                   radarOutput.MD,
    DC:                   radarOutput.DC,
    CEC:                  radarOutput.CEC,
    VE:                   radarOutput.VE,
    stage_base:           radarOutput.stage_base,
    cycle_state:          input.cycle_state,  // B1.3
    cyclesCompleted:      input.cyclesCompleted,
    input_classification: input.input_classification,
  });

  // ─── Passo 4: RAG
  // Seleciona nodes elegíveis conforme CGG + hagoState + histórico
  // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 5 item 4
  const ragResult: SelectedNode[] = executeRag({
    CGG:       radarOutput.CGG,
    hagoState: hago_state,
    nodes:     input.nodes,
    history:   input.historical_memory,
  });

  // ─── Passo 5: CDA v2.1
  // Anti-repetição literal + anti-avalanche máxima intensidade
  // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 5 item 5
  // orderedCandidates = ragResult (já em ordem determinística: distance ASC, node_id ASC)
  const node_selection: SelectedNode[] = applyCda({
    selected:          ragResult,
    previousNode:      input.previous_node,
    orderedCandidates: ragResult,
  });

  // ─── Passo 6: node_selection final já produzido acima

  // ─── Passo 7: Compute hashes
  // input_hash: SHA256(canonicalize({ previous_node, previous_snapshot, raw_input }))
  // structural_hash: SHA256(canonicalize({ node_selection, structural_snapshot }))
  // Excluídos: audit_trace, contract_version, structural_model_version,
  //            input_classification, historical_memory
  // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 8
  const [input_hash, structural_hash] = await Promise.all([
    computeInputHash(
      input.raw_input,
      input.previous_snapshot,
      input.previous_node,
      input.user_text  // B2 fix: user_text incluído no hash
    ),
    computeStructuralHash(
      structural_snapshot,
      node_selection,
      input.cycle_state  // C2.1
    ),
  ]);

  // ─── Passo 8: Return output
  // contract_version deve ser igual ao input
  // structural_model_version deve ser igual ao input
  // Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 6 + invariant
  const audit_trace: AuditTrace = {
    radar_executed: true,
    hago_executed:  true,
    rag_executed:   true,
    cda_executed:   true,
  };

  return {
    contract_version:         input.contract_version,
    structural_model_version: input.structural_model_version,
    input_hash,
    structural_hash,
    structural_snapshot,
    node_selection,
    hago_state,
    audit_trace,
  };
}
