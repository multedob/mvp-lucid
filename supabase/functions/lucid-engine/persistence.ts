// ============================================================
// persistence.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fonte: TRANSACTION_PROTOCOL_v3.4,
//        EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1 PHASE 8,
//        LUCID_SCHEMA_SQL_v3.3
// Natureza: I/O — seção atômica (BEGIN → COMMIT)
// Regra: toda computação ocorre ANTES desta função
//        esta função apenas persiste — sem cálculo
// ============================================================

import type {
  StructuralSnapshot,
  SelectedNode,
  HagoState,
  InputClassification,
  ResponseType,
  Movement,
  AuditTrace,
  RadarInput,
} from "./types.ts";
import { VersionConflictError } from "./resolvers.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// ─────────────────────────────────────────
// PERSISTENCE INPUT
// Todos os campos devem estar completamente
// resolvidos ANTES da chamada desta função
// Fonte: TRANSACTION_PROTOCOL_v3.4, seção 3
// ─────────────────────────────────────────

export interface PersistenceInput {
  // Identidade
  user_id:                  string;
  base_version:             number;
  // Estrutural
  structural_model_version: string;
  raw_input:                RadarInput;
  input_hash:               string;
  structural_hash:          string;
  previous_cycle_hash:      string | null;
  cycle_integrity_hash:     string;
  structural_snapshot:      StructuralSnapshot;
  node_selection:           SelectedNode[];
  // Conversacional
  hago_state:               HagoState;
  input_classification:     InputClassification;
  response_type:            ResponseType;
  movement_primary:         Movement;
  movement_secondary:       Movement | null;
  // LLM Binding
  llm_provider:             string;
  llm_model_id:             string;
  llm_temperature:          number;
  llm_config_hash:          string;
  // Auditoria
  audit_trace:              AuditTrace;
  // LLM Response
  llm_response?:            string;
  // IPE context
  ipe_cycle_id?:            string;
  ipe_cycle_number?:        number;
  cycle_state?:             string;
  user_text?:               string;
}

// ─────────────────────────────────────────
// PERSISTENCE OUTPUT
// ─────────────────────────────────────────

export interface PersistenceOutput {
  cycle_id:        string;
  current_version: number; // base_version + 1
}

// ─────────────────────────────────────────
// PERSIST CYCLE
// Executa seção atômica via RPC PostgreSQL
// Fonte: TRANSACTION_PROTOCOL_v3.4, seção 5
//
// Estratégia: usar Supabase RPC para garantir
// atomicidade real (BEGIN → COMMIT no servidor)
// O cliente JS não garante atomicidade via
// múltiplas chamadas encadeadas
// ─────────────────────────────────────────

export async function persistCycle(
  supabase: SupabaseClient,
  input:    PersistenceInput
): Promise<PersistenceOutput> {

  // Preparar raw_input_json — serializado como JSONB
  const raw_input_json = {
    d1: input.raw_input.d1,
    d2: input.raw_input.d2,
    d3: input.raw_input.d3,
    d4: input.raw_input.d4,
  };

  // Preparar node_history records (0–2)
  // Incluir: node_id, macro_band, node_type, density_class, distance
  // Fonte: TRANSACTION_PROTOCOL_v3.4, PHASE 8 item 7
  const node_history_rows = input.node_selection.map((n) => ({
    node_id:       n.node_id,
    macro_band:    n.macro_band,
    node_type:     n.node_type,
    density_class: n.density_class,
    distance:      parseFloat(n.distance), // NUMERIC(5,2) no banco
  }));

  // Preparar structural_trace para audit_log
  const structural_trace = {
    audit_trace:              input.audit_trace,
    hago_state:               input.hago_state,
    structural_model_version: input.structural_model_version,
  };

  // ─── Chamada RPC atômica
  // A função PostgreSQL lucid_persist_cycle deve:
  //   1. UPDATE users SET version = version + 1 WHERE id = $user_id AND version = $base_version
  //   2. Se affected_rows != 1 → raise VERSION_CONFLICT
  //   3. INSERT INTO cycles
  //   4. INSERT INTO structural_snapshots
  //   5. INSERT INTO node_history (0-N registros)
  //   6. INSERT INTO audit_log
  //   7. RETURN cycle_id, current_version
  // Fonte: TRANSACTION_PROTOCOL_v3.4, seção 5
  const { data, error } = await supabase.rpc("lucid_persist_cycle", {
    p_user_id:                  input.user_id,
    p_base_version:             input.base_version,
    p_structural_model_version: input.structural_model_version,
    p_raw_input_json:           raw_input_json,
    p_input_hash:               input.input_hash,
    p_structural_hash:          input.structural_hash,
    p_previous_cycle_hash:      input.previous_cycle_hash,
    p_cycle_integrity_hash:     input.cycle_integrity_hash,
    p_snapshot_json:            input.structural_snapshot,
    p_node_history_rows:        node_history_rows,
    p_input_classification:     input.input_classification,
    p_response_type:            input.response_type,
    p_movement_primary:         input.movement_primary,
    p_movement_secondary:       input.movement_secondary ?? null,
    p_llm_provider:             input.llm_provider,
    p_llm_model_id:             input.llm_model_id,
    p_llm_temperature:          input.llm_temperature,
    p_llm_config_hash:          input.llm_config_hash,
    p_structural_trace:         structural_trace,
    p_hago_state:               input.hago_state,
    p_llm_response:             input.llm_response ?? null,
    p_cycle_state:              input.cycle_state ?? 'S0',
    p_user_text:                input.user_text ?? null,
    p_ipe_cycle_id:             input.ipe_cycle_id ?? null,
    p_ipe_cycle_number:         input.ipe_cycle_number ?? 1,
  });

  if (error) {
    // Detectar VERSION_CONFLICT retornado pelo PostgreSQL
    if (
      error.message?.includes("VERSION_CONFLICT") ||
      error.code === "P0001" // raise exception genérico
    ) {
      throw new VersionConflictError(
        `VERSION_CONFLICT: concurrent modification detected for user ${input.user_id}`
      );
    }
    throw new Error(`INTERNAL_PERSISTENCE_ERROR: ${error.message}`);
  }

  if (!data || !data.cycle_id) {
    throw new Error("INTERNAL_PERSISTENCE_ERROR: RPC returned no cycle_id");
  }

  return {
    cycle_id:        data.cycle_id        as string,
    current_version: data.current_version as number,
  };
}

// ─────────────────────────────────────────
// SQL DA FUNÇÃO RPC (referência — não executado aqui)
// Deve ser criado via migration no Supabase
// Fonte: TRANSACTION_PROTOCOL_v3.4, seção 5
//
// CREATE OR REPLACE FUNCTION lucid_persist_cycle(
//   p_user_id UUID,
//   p_base_version INTEGER,
//   p_structural_model_version VARCHAR,
//   p_raw_input_json JSONB,
//   p_input_hash VARCHAR,
//   p_structural_hash VARCHAR,
//   p_previous_cycle_hash VARCHAR,
//   p_cycle_integrity_hash VARCHAR,
//   p_snapshot_json JSONB,
//   p_node_history_rows JSONB,
//   p_input_classification VARCHAR,
//   p_response_type VARCHAR,
//   p_movement_primary VARCHAR,
//   p_movement_secondary VARCHAR,
//   p_llm_provider VARCHAR,
//   p_llm_model_id VARCHAR,
//   p_llm_temperature NUMERIC,
//   p_llm_config_hash VARCHAR,
//   p_structural_trace JSONB
// )
// RETURNS JSONB
// LANGUAGE plpgsql
// SECURITY DEFINER
// AS $$
// DECLARE
//   v_cycle_id UUID := gen_random_uuid();
//   v_new_version INTEGER;
//   v_node JSONB;
// BEGIN
//   -- Controle otimista de concorrência
//   UPDATE users
//   SET version = version + 1
//   WHERE id = p_user_id AND version = p_base_version;
//
//   IF NOT FOUND THEN
//     RAISE EXCEPTION 'VERSION_CONFLICT';
//   END IF;
//
//   v_new_version := p_base_version + 1;
//
//   -- INSERT cycles
//   INSERT INTO cycles (
//     id, user_id, version, structural_model_version,
//     raw_input_json, input_hash, structural_hash,
//     previous_cycle_hash, cycle_integrity_hash,
//     input_classification, response_type,
//     movement_primary, movement_secondary,
//     llm_provider, llm_model_id, llm_temperature, llm_config_hash
//   ) VALUES (
//     v_cycle_id, p_user_id, v_new_version, p_structural_model_version,
//     p_raw_input_json, p_input_hash, p_structural_hash,
//     p_previous_cycle_hash, p_cycle_integrity_hash,
//     p_input_classification, p_response_type,
//     p_movement_primary, p_movement_secondary,
//     p_llm_provider, p_llm_model_id, p_llm_temperature, p_llm_config_hash
//   );
//
//   -- INSERT structural_snapshots
//   INSERT INTO structural_snapshots (cycle_id, snapshot_json)
//   VALUES (v_cycle_id, p_snapshot_json);
//
//   -- INSERT node_history (0–2 registros)
//   FOR v_node IN SELECT * FROM jsonb_array_elements(p_node_history_rows)
//   LOOP
//     INSERT INTO node_history (
//       id, cycle_id, node_id, macro_band, node_type, density_class, distance
//     ) VALUES (
//       gen_random_uuid(), v_cycle_id,
//       v_node->>'node_id',
//       v_node->>'macro_band',
//       v_node->>'node_type',
//       (v_node->>'density_class')::INTEGER,
//       (v_node->>'distance')::NUMERIC(5,2)
//     );
//   END LOOP;
//
//   -- INSERT audit_log
//   INSERT INTO audit_log (id, cycle_id, structural_trace)
//   VALUES (gen_random_uuid(), v_cycle_id, p_structural_trace);
//
//   RETURN jsonb_build_object(
//     'cycle_id', v_cycle_id,
//     'current_version', v_new_version
//   );
// END;
// $$;
// ─────────────────────────────────────────
