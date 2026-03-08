-- PC-2: Adicionar user_text à tabela cycles
-- Base legal: consentimento explícito (usuário aceitou termo de uso)
-- Retenção: indefinida (enquanto conta existir)
-- Exclusão: por demanda — implementação futura
-- LGPD: dado pessoal sensível — acesso restrito via RLS existente
ALTER TABLE cycles ADD COLUMN user_text TEXT;

-- Recriar lucid_persist_cycle com p_user_text
-- PC-2: user_text adicionado como parâmetro opcional (DEFAULT NULL)
CREATE OR REPLACE FUNCTION public.lucid_persist_cycle(
  p_user_id uuid,
  p_base_version integer,
  p_structural_model_version character varying,
  p_raw_input_json jsonb,
  p_input_hash character varying,
  p_structural_hash character varying,
  p_previous_cycle_hash character varying,
  p_cycle_integrity_hash character varying,
  p_snapshot_json jsonb,
  p_node_history_rows jsonb,
  p_input_classification character varying,
  p_response_type character varying,
  p_movement_primary character varying,
  p_movement_secondary character varying,
  p_llm_provider character varying,
  p_llm_model_id character varying,
  p_llm_temperature numeric,
  p_llm_config_hash character varying,
  p_structural_trace jsonb,
  p_hago_state character varying,
  p_cycle_state character varying DEFAULT 'S0',
  p_llm_response text DEFAULT NULL,
  p_user_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_id     UUID    := gen_random_uuid();
  v_new_version  INTEGER;
  v_node         JSONB;
  v_rows_updated INTEGER;
BEGIN
  UPDATE users
  SET version = version + 1
  WHERE id = p_user_id
    AND version = p_base_version;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated != 1 THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: concurrent modification for user %', p_user_id;
  END IF;

  v_new_version := p_base_version + 1;

  INSERT INTO cycles (
    id, user_id, version, structural_model_version,
    raw_input_json, input_hash, structural_hash,
    previous_cycle_hash, cycle_integrity_hash,
    input_classification, response_type,
    movement_primary, movement_secondary,
    llm_provider, llm_model_id, llm_temperature, llm_config_hash,
    hago_state, llm_response,
    cycle_state, user_text
  ) VALUES (
    v_cycle_id, p_user_id, v_new_version, p_structural_model_version,
    p_raw_input_json, p_input_hash, p_structural_hash,
    p_previous_cycle_hash, p_cycle_integrity_hash,
    p_input_classification, p_response_type,
    p_movement_primary, p_movement_secondary,
    p_llm_provider, p_llm_model_id, p_llm_temperature, p_llm_config_hash,
    p_hago_state, p_llm_response,
    p_cycle_state, p_user_text
  );

  INSERT INTO structural_snapshots (cycle_id, snapshot_json)
  VALUES (v_cycle_id, p_snapshot_json);

  FOR v_node IN
    SELECT value FROM jsonb_array_elements(p_node_history_rows)
  LOOP
    INSERT INTO node_history (
      id, cycle_id, node_id, macro_band, node_type, density_class, distance
    ) VALUES (
      gen_random_uuid(), v_cycle_id,
      v_node->>'node_id',
      v_node->>'macro_band',
      v_node->>'node_type',
      (v_node->>'density_class')::INTEGER,
      (v_node->>'distance')::NUMERIC(5,2)
    );
  END LOOP;

  INSERT INTO audit_log (id, cycle_id, structural_trace)
  VALUES (gen_random_uuid(), v_cycle_id, p_structural_trace);

  RETURN jsonb_build_object(
    'cycle_id',        v_cycle_id,
    'current_version', v_new_version
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Drop overload anterior (22 parâmetros) para evitar ambiguidade
DROP FUNCTION IF EXISTS public.lucid_persist_cycle(
  uuid, integer, character varying, jsonb, character varying, character varying,
  character varying, character varying, jsonb, jsonb, character varying, character varying,
  character varying, character varying, character varying, character varying,
  numeric, character varying, jsonb, character varying, character varying, text
);
