-- ============================================================
-- 001_lucid_schema_v3_3.sql
-- LUCID Schema canônico — LUCID_SCHEMA_SQL_v3.3
-- Structural Model Version: 3.0
-- Fonte: src/integrations/supabase/types.ts (schema real)
--        LUCID_SCHEMA_SQL_v3.3, STRUCTURAL_CORE_CONTRACT_v1.8
-- Nota: usa CREATE TABLE IF NOT EXISTS — seguro em banco existente
-- B4.5: constraint regex node_id incluída (^F[1-5]-N[0-9]+$)
-- ============================================================

-- ─────────────────────────────────────────
-- EXTENSÕES
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- 1. users
-- Ledger por usuário — controle otimista de concorrência
-- Fonte: TRANSACTION_PROTOCOL_v3.4, seção 3
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID        PRIMARY KEY,  -- espelha auth.users.id
  version    INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. structural_model_registry
-- Versão estrutural ativa — exatamente uma linha active=true por vez
-- Fonte: CORE_RUNTIME_REGISTRY_SPEC_v1.2
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.structural_model_registry (
  structural_model_version VARCHAR NOT NULL PRIMARY KEY,
  active                   BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: versão 3.0 ativa
INSERT INTO public.structural_model_registry (structural_model_version, active)
VALUES ('3.0', true)
ON CONFLICT (structural_model_version) DO NOTHING;

-- ─────────────────────────────────────────
-- 3. cycles
-- Registro principal de cada ciclo conversacional
-- Fonte: LUCID_SCHEMA_SQL_v3.3, TRANSACTION_PROTOCOL_v3.4
-- Inclui: hago_state (adicionado via migration 20260222191059)
--         llm_response (adicionado via migration 20260222191806)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycles (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.users(id),
  version                  INTEGER     NOT NULL,
  structural_model_version VARCHAR     NOT NULL,
  raw_input_json           JSONB       NOT NULL,
  input_hash               VARCHAR     NOT NULL,
  structural_hash          VARCHAR     NOT NULL,
  previous_cycle_hash      VARCHAR,                   -- null se base_version=0
  cycle_integrity_hash     VARCHAR     NOT NULL,
  input_classification     VARCHAR     NOT NULL,
  response_type            VARCHAR     NOT NULL,
  movement_primary         VARCHAR     NOT NULL,
  movement_secondary       VARCHAR,                   -- null permitido
  llm_provider             VARCHAR     NOT NULL,
  llm_model_id             VARCHAR     NOT NULL,
  llm_temperature          NUMERIC     NOT NULL,
  llm_config_hash          VARCHAR     NOT NULL,
  hago_state               VARCHAR     NOT NULL DEFAULT 'H0',
  llm_response             TEXT,                      -- null até PHASE 9.1
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unicidade: um ciclo por versão por usuário
  UNIQUE (user_id, version)
);

-- ─────────────────────────────────────────
-- 4. structural_snapshots
-- Snapshot estrutural por ciclo — relação 1:1 com cycles
-- Fonte: SNAPSHOT_RESOLUTION_PROTOCOL_v2.2.1
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.structural_snapshots (
  cycle_id      UUID  NOT NULL PRIMARY KEY REFERENCES public.cycles(id),
  snapshot_json JSONB NOT NULL
);

-- ─────────────────────────────────────────
-- 5. node_history
-- Nodes ativados por ciclo — 0 a 2 registros por ciclo
-- Fonte: LUCID_SCHEMA_SQL_v3.3, TRANSACTION_PROTOCOL_v3.4
-- B4.5: constraint regex node_id — ^F[1-5]-N[0-9]+$
-- distance: NUMERIC(5,2) conforme PROJECT_MANIFEST_v1.10.0
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.node_history (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id      UUID         NOT NULL REFERENCES public.cycles(id),
  node_id       VARCHAR      NOT NULL,
  macro_band    VARCHAR      NOT NULL,
  node_type     VARCHAR      NOT NULL,
  density_class INTEGER      NOT NULL,
  distance      NUMERIC(5,2) NOT NULL,

  -- B4.5: regex canônico conforme STRUCTURAL_CORE_CONTRACT_v1.8 §7
  CONSTRAINT node_history_node_id_format
    CHECK (node_id ~ '^F[1-5]-N[0-9]+$')
);

-- ─────────────────────────────────────────
-- 6. audit_log
-- Rastreabilidade estrutural por ciclo
-- Fonte: LUCID_SCHEMA_SQL_v3.3
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id         UUID        NOT NULL REFERENCES public.cycles(id),
  structural_trace JSONB       NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 7. rag_corpus
-- Nodes canônicos — corpus RAG
-- Fonte: RAG_NODE_MODEL_v1.2, ALL_NODES_v1.0
-- B4.5: constraint regex node_id
-- source_author e source_work: NOT NULL (DEFAULT '' temporário — preencher via B0.2)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rag_corpus (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id            VARCHAR     NOT NULL UNIQUE,
  family             VARCHAR     NOT NULL,
  node_type          VARCHAR     NOT NULL,
  density_class      INTEGER     NOT NULL,
  macro_band         VARCHAR     NOT NULL,
  amplitude_min      NUMERIC     NOT NULL,
  amplitude_max      NUMERIC     NOT NULL,
  stage_min          NUMERIC     NOT NULL,
  stage_max          NUMERIC     NOT NULL,
  content_text       TEXT        NOT NULL,
  teleology_score    INTEGER     NOT NULL DEFAULT 0,
  prescriptive_score INTEGER     NOT NULL DEFAULT 0,
  normative_score    INTEGER     NOT NULL DEFAULT 0,
  source_author      TEXT        NOT NULL DEFAULT '',
  source_work        TEXT        NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- B4.5: regex canônico
  CONSTRAINT rag_corpus_node_id_format
    CHECK (node_id ~ '^F[1-5]-N[0-9]+$')
);

-- ─────────────────────────────────────────
-- 8. structural_model_disclosures
-- Registro de divulgações formais de versão estrutural
-- Fonte: STRUCTURAL_MODEL_ACTIVATION_PROTOCOL_v2.3
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.structural_model_disclosures (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  structural_model_version VARCHAR     NOT NULL
    REFERENCES public.structural_model_registry(structural_model_version),
  disclosed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  disclosure_notes         TEXT
);

-- ─────────────────────────────────────────
-- 9. TRIGGER: handle_new_user
-- Cria registro em public.users quando novo auth.user é criado
-- Referenciado em migration 20260222191609
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger consolidado aqui. Migration 20260222191609 recria via CREATE TRIGGER — inofensivo.

-- ─────────────────────────────────────────
-- 10. ÍNDICES
-- Performance para queries críticas do pipeline
-- ─────────────────────────────────────────

-- cycles: lookup por user_id + version (Snapshot Resolution)
CREATE INDEX IF NOT EXISTS idx_cycles_user_version
  ON public.cycles(user_id, version DESC);

-- node_history: lookup por cycle_id (Previous Node + Historical Memory)
CREATE INDEX IF NOT EXISTS idx_node_history_cycle
  ON public.node_history(cycle_id, distance ASC, node_id ASC);

-- rag_corpus: node_id já tem UNIQUE (índice implícito) — índice explícito omitido

-- ─────────────────────────────────────────
-- 11. TRIGGER on_auth_user_created
-- Cria registro em public.users quando novo auth.user é criado
-- CREATE OR REPLACE: idempotente, sem janela de risco em produção
-- Anteriormente em migration 20260222191609 — consolidado aqui
-- ─────────────────────────────────────────
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────
-- 12. lucid_persist_cycle RPC (versão inicial)
-- Versão canônica base — será substituída pelas migrations seguintes
-- via CREATE OR REPLACE (20260222191059, 20260222191806)
-- Fonte: TRANSACTION_PROTOCOL_v3.4, seção 5
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lucid_persist_cycle(
  p_user_id                  UUID,
  p_base_version             INTEGER,
  p_structural_model_version VARCHAR,
  p_raw_input_json           JSONB,
  p_input_hash               VARCHAR,
  p_structural_hash          VARCHAR,
  p_previous_cycle_hash      VARCHAR,
  p_cycle_integrity_hash     VARCHAR,
  p_snapshot_json            JSONB,
  p_node_history_rows        JSONB,
  p_input_classification     VARCHAR,
  p_response_type            VARCHAR,
  p_movement_primary         VARCHAR,
  p_movement_secondary       VARCHAR,
  p_llm_provider             VARCHAR,
  p_llm_model_id             VARCHAR,
  p_llm_temperature          NUMERIC,
  p_llm_config_hash          VARCHAR,
  p_structural_trace         JSONB,
  p_hago_state               VARCHAR,
  p_llm_response             TEXT DEFAULT NULL
)
RETURNS JSONB
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
    hago_state, llm_response
  ) VALUES (
    v_cycle_id, p_user_id, v_new_version, p_structural_model_version,
    p_raw_input_json, p_input_hash, p_structural_hash,
    p_previous_cycle_hash, p_cycle_integrity_hash,
    p_input_classification, p_response_type,
    p_movement_primary, p_movement_secondary,
    p_llm_provider, p_llm_model_id, p_llm_temperature, p_llm_config_hash,
    p_hago_state, p_llm_response
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

-- ─────────────────────────────────────────
-- DECLARAÇÃO FORMAL
-- Este arquivo representa o schema canônico
-- conforme LUCID_SCHEMA_SQL_v3.3 +
-- alterações documentadas:
--   - hago_state em cycles (migration 20260222191059)
--   - llm_response em cycles (migration 20260222191806)
--   - source_author/source_work em rag_corpus (migration 20260222234558)
-- Structural Model Version: 3.0
-- ─────────────────────────────────────────
