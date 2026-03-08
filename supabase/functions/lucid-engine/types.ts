// ============================================================
// types.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fontes: STRUCTURAL_CORE_CONTRACT_v1.8,
//         SNAPSHOT_RESOLUTION_PROTOCOL_v2.2.1,
//         INPUT_CLASSIFICATION_SPEC_v1.1,
//         RESPONSE_TYPE_RESOLUTION_SPEC_v1.1,
//         MOVEMENT_RESOLUTION_SPEC_v2.1,
//         LUCE_MOVEMENT_ENUMERATION_SPEC_v1.1,
//         RAG_NODE_MODEL_v1.2,
//         RADAR_PARAMETER_TABLE_v1.0,
//         HTTP_EDGE_UNIFIED_CONTRACT_v1.4.1,
//         HAGO_STATE_MACHINE_v1.3,
//         RADAR_PIPELINE_SPEC_v2.1
// ============================================================

// ─────────────────────────────────────────
// 1. CONSTANTES DE CONTRATO
// ─────────────────────────────────────────
export const CONTRACT_VERSION         = "1.8" as const;
export const STRUCTURAL_MODEL_VERSION = "3.0" as const;

// ─────────────────────────────────────────
// 2. ENUMS CANÔNICOS
// ─────────────────────────────────────────

// Fonte: INPUT_CLASSIFICATION_SPEC_v1.1, seção 4
export type InputClassification =
  | "C1_CONFUSAO_CONCEITUAL"
  | "C2_AMBIVALENCIA_INTERNA"
  | "C3_SOFREIMENTO_EMOCIONAL"
  | "C4_CURIOSIDADE_ESTRUTURAL"
  | "C5_PEDIDO_PRESCRITIVO"
  | "C6_VALIDACAO_IDENTITARIA"
  | "C7_RISCO_HUMANO";

// Fonte: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1, seção 3
export type ResponseType =
  | "R1_EXPLICATIVA"
  | "R2_REFLEXIVA"
  | "R3_EXPLORATORIA"
  | "R4_LIMITANTE";

// Fonte: LUCE_MOVEMENT_ENUMERATION_SPEC_v1.1, seção 2
export type Movement =
  | "M1_BIFURCACAO"
  | "M2_ESPELHAMENTO_PRECISO"
  | "M3_NOMEACAO_PADRAO"
  | "M4_DESLOCAMENTO_NIVEL"
  | "M5_SUSPENSAO_ATIVA"
  | "M6_POSICIONAMENTO_LIMITE"
  | "M7_CLARIFICACAO_SEMANTICA";

// Fonte: HAGO_STATE_MACHINE_v1.3, seção 2
export type HagoState = "H0" | "H1" | "H2";

export type MacroBand    = "F1" | "F2" | "F3" | "F4" | "F5";
export type NodeType     = "Declarative" | "Tension" | "Contrast";
export type DensityClass = 1 | 2 | 3;
export type RiskScore    = 0 | 1 | 2;

// ─────────────────────────────────────────
// 3. STRUCTURAL SNAPSHOT
// Regra: campos numéricos como string "X.XX"
//        stage_base: number (integer = floor(CGG))
//        substage: number (integer, derivado de δ)
// PC-3: consolidated_flag removido — código morto desde B1.3
//        cycle_state em HagoInput substitui com semântica real
// Fonte: SNAPSHOT_RESOLUTION_PROTOCOL_v2.2.1
// ─────────────────────────────────────────
export interface StructuralSnapshot {
  CGG0:              string;
  CGG:               string;
  D1:                string;
  D2:                string;
  D3:                string;
  D4:                string;
  CEC:               string;
  DC:                string;
  MD:                string;
  VE:                string;
  IC:                string;
  stage_base:        number;
  substage:          number;
}

// ─────────────────────────────────────────
// 4. STATIC BASE SNAPSHOT
// Usado exclusivamente quando base_version == 0
// Vinculado a structural_model_version "3.0"
// Fonte: SNAPSHOT_RESOLUTION_PROTOCOL_v2.2.1,
//        seção base_version_zero_behavior
// Prefixo _ indica uso interno — não importar diretamente.
//        Fonte: CORE_RUNTIME_REGISTRY_SPEC_v1.2, seção 4 (B2.1)
// ─────────────────────────────────────────
const _STATIC_BASE_SNAPSHOT_V3_0: Readonly<StructuralSnapshot> = {
  CGG0:              "1.00",
  CGG:               "1.00",
  D1:                "0.00",
  D2:                "0.00",
  D3:                "0.00",
  D4:                "0.00",
  CEC:               "0.00",
  DC:                "0.00",
  MD:                "0.00",
  VE:                "0.00",
  IC:                "0.00",
  stage_base:        1,
  substage:          0,
} as const;

// ─────────────────────────────────────────
// 4b. STRUCTURAL MODEL IMPLEMENTATION MAP
// Fonte: CORE_RUNTIME_REGISTRY_SPEC_v1.2, seção 4
// Cada versão expõe sua própria configuração canônica.
// Acesse baseSnapshot via STRUCTURAL_MODELS[bound_version].baseSnapshot
// ─────────────────────────────────────────
export interface StructuralModelImpl {
  baseSnapshot: Readonly<StructuralSnapshot>;
}

export const STRUCTURAL_MODELS: Readonly<Record<string, StructuralModelImpl>> = {
  "3.0": {
    baseSnapshot: _STATIC_BASE_SNAPSHOT_V3_0,
  },
} as const;

// B2: alias público para uso em testes e resolvers externos
// _STATIC_BASE_SNAPSHOT_V3_0 permanece privado — acesso canônico via STRUCTURAL_MODELS["3.0"].baseSnapshot
export const STATIC_BASE_SNAPSHOT: Readonly<StructuralSnapshot> = _STATIC_BASE_SNAPSHOT_V3_0;

// ─────────────────────────────────────────
// 5. THRESHOLDS ESTRUTURAIS
// Fonte: RADAR_PARAMETER_TABLE_v1.0
// Regra: 3 conjuntos — estágios 1–6, 7, 8
// NUNCA use número mágico fora deste objeto.
// ─────────────────────────────────────────
export interface ThresholdSet {
  MD:  number;
  DC:  number;
  CEC: number;
  VE:  number;
}

export const THRESHOLDS = {
  // Estágios 1–6 (promoção geral)
  default: { MD: 0.60, DC: 0.40, CEC: 0.60, VE: 1.20 } as ThresholdSet,
  // Estágio 7 (cumulativo com default)
  stage7:  { MD: 0.70, DC: 0.30, CEC: 0.70, VE: 0.90 } as ThresholdSet,
  // Estágio 8 (cumulativo com default)
  stage8:  { MD: 0.80, DC: 0.20, CEC: 0.80, VE: 0.60 } as ThresholdSet,
  // Penalidade relacional D3
  CEC_penalty_D3:    0.10,
  D3_penalty_floor:  4.5,
  // Regime temporal MD
  MD_intraciclo_cap: 0.60,
  // A8: margem_CEC = 10% do CEC_threshold do conjunto ativo
  MARGEM_CEC_FACTOR: 0.10,
} as const;

// Helper: seleciona conjunto de thresholds por stage_base
export function getThresholds(stage_base: number): ThresholdSet {
  if (stage_base >= 8) return THRESHOLDS.stage8;
  if (stage_base >= 7) return THRESHOLDS.stage7;
  return THRESHOLDS.default;
}

// Helper: CEC mínimo para H2
// Fonte: HAGO_STATE_MACHINE_v1.3, seção 4.3
// A8: margem escala com CEC_threshold do conjunto ativo
// PC-3: parâmetro renomeado de consolidated_flag → is_s2
// Caller (hago.ts) passa: cycle_state === "S2"
export function cecThresholdForH2(
  stage_base: number,
  is_s2: boolean
): number {
  const t = getThresholds(stage_base);
  return is_s2
    ? t.CEC
    : t.CEC + t.CEC * THRESHOLDS.MARGEM_CEC_FACTOR;
}

// ─────────────────────────────────────────
// 5b. RADAR INPUT
// 16 valores numéricos — exatamente 4 por dimensão
// Tuplas garantem cardinalidade fixa em compile time
// Fonte: RADAR_PIPELINE_SPEC_v2.1, seção 2.1
// ─────────────────────────────────────────
export interface RadarInput {
  d1: [number, number, number, number];
  d2: [number, number, number, number];
  d3: [number, number, number, number];
  d4: [number, number, number, number];
}

// ─────────────────────────────────────────
// 6. RAG NODE (formato do banco)
// Fonte: RAG_NODE_MODEL_v1.2, seção II.7
// ─────────────────────────────────────────
export interface RagNode {
  node_id:            string;
  macro_band:         MacroBand;
  node_type:          NodeType;
  density_class:      DensityClass;
  stage_min:          number;
  stage_max:          number;
  teleology_score:    RiskScore;
  prescriptive_score: RiskScore;
  normative_score:    RiskScore;
  content_text:       string;
  source_author:      string;
  source_work:        string;
}

// ─────────────────────────────────────────
// 7. NODE SELECTION (saída do RAG após CDA)
// Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 7
// ─────────────────────────────────────────
export interface SelectedNode {
  node_id:       string;
  macro_band:    MacroBand;
  node_type:     NodeType;
  density_class: DensityClass;
  distance:      string;  // "X.XX"
}

// ─────────────────────────────────────────
// 8. PREVIOUS NODE
// Fonte: PREVIOUS_NODE_RESOLUTION_PROTOCOL_v2.2.2
// Apenas 3 campos — macro_band e distance excluídos
// ─────────────────────────────────────────
export interface PreviousNode {
  node_id:       string;
  node_type:     NodeType;
  density_class: DensityClass;
}

// ─────────────────────────────────────────
// 9. HISTORICAL NODE (janela de até 7)
// Fonte: RAG_SCHEMA_v1.0, seção 9
// ─────────────────────────────────────────
export interface HistoricalNode {
  node_id:      string;
  node_type:    NodeType;
  source_work?: string;
}

// ─────────────────────────────────────────
// 10. AUDIT TRACE
// Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 6
// ─────────────────────────────────────────
export interface AuditTrace {
  radar_executed: boolean;
  hago_executed:  boolean;
  rag_executed:   boolean;
  cda_executed:   boolean;
}

// ─────────────────────────────────────────
// 11. CORE INPUT
// Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 4
// raw_input: RadarInput — 16 valores numéricos estruturados
// Texto do usuário não entra no Core
// ─────────────────────────────────────────
export interface CoreInput {
  contract_version:         typeof CONTRACT_VERSION;
  structural_model_version: string;
  raw_input:                RadarInput;
  previous_snapshot:        StructuralSnapshot;  // nunca null
  previous_node:            PreviousNode | null; // null se base_version=0
  historical_memory:        HistoricalNode[];
  input_classification:     InputClassification; // obrigatório
  nodes:                    RagNode[];
}

// ─────────────────────────────────────────
// 12. CORE OUTPUT
// Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 6
// ─────────────────────────────────────────
export interface CoreOutput {
  contract_version:         typeof CONTRACT_VERSION;
  structural_model_version: string;
  input_hash:               string;
  structural_hash:          string;
  structural_snapshot:      StructuralSnapshot;
  node_selection:           SelectedNode[];
  hago_state:               HagoState;
  audit_trace:              AuditTrace;
}

// ─────────────────────────────────────────
// 13. POST-CORE OUTPUT
// Fonte: RESPONSE_TYPE_RESOLUTION_SPEC_v1.1,
//        MOVEMENT_RESOLUTION_SPEC_v2.1
// ─────────────────────────────────────────
export interface PostCoreOutput {
  response_type:      ResponseType;
  movement_primary:   Movement;
  movement_secondary: Movement | null;
}

// ─────────────────────────────────────────
// 14. EDGE RESPONSE (HTTP 200)
// Fonte: HTTP_EDGE_UNIFIED_CONTRACT_v1.4.1
// cycle_integrity_hash NÃO exposto — interno ao ledger
// Fonte: HTTP_EDGE_UNIFIED_CONTRACT_v1.4.1, seção 8
// raw_input (RadarInput) NÃO retornado — interno ao Core
// ─────────────────────────────────────────
export interface EdgeResponse {
  api_version:              string;
  current_version:          number;
  cycle_id:                 string;
  structural_model_version: string;
  input_hash:               string;
  structural_hash:          string;
  structural_snapshot:      StructuralSnapshot;
  node_selection:           SelectedNode[];
  hago_state:               HagoState;
  input_classification:     InputClassification;
  response_type:            ResponseType;
  movement_primary:         Movement;
  movement_secondary:       Movement | null;
  llm_provider:             string;
  llm_model_id:             string;
  llm_temperature:          number;
  llm_response:             string;
  audit_trace:              AuditTrace;
}

// ─────────────────────────────────────────
// 15. AMBIGUIDADES DECLARADAS
// A6: CGG0_equals_previous_CGG — sem definição operacional
// A7: optional_config_fields no llm_config_hash
// A8: margem_CEC escala com conjunto ativo (não é absoluta)
// ─────────────────────────────────────────
