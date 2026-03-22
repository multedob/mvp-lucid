-- ============================================================
-- IPE SCHEMA — Fase 1
-- Migration: 20260321000000_ipe_schema.sql
-- Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.0, §3.1 e §3.2
-- Invariante: nenhum campo no código sem existir no schema
-- Depende de: tabela cycles (engine) já existente
-- ============================================================

-- ============================================================
-- 1. ipe_cycles
-- Ciclo IPE por usuário. Suporta IPE1, IPE2, IPE3...
-- cycle_number = 1 → IPE1, 2 → IPE2, etc.
-- status: trilha de estado do ciclo completo
-- ============================================================

CREATE TABLE public.ipe_cycles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number      INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'pills'
                    CHECK (status IN ('pills', 'questionnaire', 'complete', 'abandoned')),
  pills_completed   TEXT[] NOT NULL DEFAULT '{}',
  -- Valores válidos: 'PI'|'PII'|'PIII'|'PIV'|'PV'|'PVI'
  -- Validação ocorre na edge function (CHECK em array TEXT[] exige função no Postgres)
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  prompt_version    TEXT
);

CREATE INDEX idx_ipe_cycles_user_id ON public.ipe_cycles(user_id);
CREATE INDEX idx_ipe_cycles_status  ON public.ipe_cycles(status);

-- ============================================================
-- 2. pill_responses
-- Respostas brutas por Pill (M1–M4). Uma linha por Pill por ciclo.
-- m2_cal_signals: {localização, custo, foco, horizonte}
-- m3_respostas: {pergunta_id: resposta} por linha primária
-- ============================================================

CREATE TABLE public.pill_responses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id           UUID NOT NULL REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  pill_id                TEXT NOT NULL
                         CHECK (pill_id IN ('PI', 'PII', 'PIII', 'PIV', 'PV', 'PVI')),
  m1_tempo_segundos      INTEGER,
  m2_resposta            TEXT,
  m2_cal_signals         JSONB,
  m3_respostas           JSONB,
  m4_resposta            TEXT,
  eco_text               TEXT,           -- M5: texto do Eco gerado (persiste para retomada de sessão — P3)
  completed_at           TIMESTAMPTZ,
  UNIQUE (ipe_cycle_id, pill_id)
);

CREATE INDEX idx_pill_responses_cycle ON public.pill_responses(ipe_cycle_id);

-- ============================================================
-- 3. pill_scoring
-- Corpus estruturado por Pill (output do scoring Momento 1).
-- corpus_linhas: {LXX: {IL_sinal, FD, GCC_por_corte, faixa_estimada, status_sinal}}
-- sinais_l24: sinais proxy de L2.4 (H1 — risco de subdetecção)
-- scoring_version: rastreável via prompt_versions
-- ============================================================

CREATE TABLE public.pill_scoring (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id        UUID NOT NULL REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  pill_id             TEXT NOT NULL
                      CHECK (pill_id IN ('PI', 'PII', 'PIII', 'PIV', 'PV', 'PVI')),
  corpus_linhas       JSONB,
  corpus_transversal  JSONB,
  sinais_l24          JSONB,
  scoring_model       TEXT,
  scoring_version     TEXT,
  scored_at           TIMESTAMPTZ,
  UNIQUE (ipe_cycle_id, pill_id)
);

CREATE INDEX idx_pill_scoring_cycle ON public.pill_scoring(ipe_cycle_id);

-- ============================================================
-- 4. questionnaire_state
-- Estado server-side do executor do Questionário.
-- 1:1 com ipe_cycles. Snapshot atualizado a cada bloco.
-- execution_plan: plano calculado pelo motor no POST /plan
-- resultados_por_bloco: {LXX: resultado completo por bloco já executado}
-- flags: late_activation, degradações PC3, etc.
-- ============================================================

CREATE TABLE public.questionnaire_state (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id                UUID NOT NULL UNIQUE
                              REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  execution_plan              JSONB,
  current_position            INTEGER DEFAULT 0,
  orcamento_global_restante   INTEGER,
  orcamento_d3_restante       INTEGER,
  contador_d3_blocos          INTEGER DEFAULT 0,
  resultados_por_bloco        JSONB NOT NULL DEFAULT '{}',
  flags                       JSONB NOT NULL DEFAULT '{}',
  status                      TEXT NOT NULL DEFAULT 'planned'
                              CHECK (status IN ('planned', 'in_progress', 'complete', 'abandoned')),
  -- RISCO: questionnaire_state.status e ipe_cycles.status devem ser atualizados
  -- atomicamente pela edge function. Não há trigger garantindo sincronia.
  -- Protocolo: sempre atualizar ipe_cycles.status APÓS questionnaire_state.status = 'complete'.
  last_block_completed        TEXT,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questionnaire_state_status ON public.questionnaire_state(status);
CREATE INDEX idx_questionnaire_state_in_progress ON public.questionnaire_state(status)
  WHERE status = 'in_progress';

-- Respostas por bloco do Questionário.
-- protecao_etica: Padrão 13 — não impõe teto de score
-- variante_servida: null se bloco padrão sem variante
-- ============================================================

CREATE TABLE public.block_responses (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id               UUID NOT NULL REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  block_id                   TEXT NOT NULL
                             CHECK (block_id ~ '^L[1-4]\.[1-4]$'),
  position                   INTEGER NOT NULL,
  principal_resposta         TEXT,
  variante_servida           TEXT,
  variante_resposta          TEXT,
  protecao_etica             BOOLEAN NOT NULL DEFAULT FALSE,
  tempo_resposta_segundos    INTEGER,
  answered_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_block_responses_cycle    ON public.block_responses(ipe_cycle_id);
CREATE INDEX idx_block_responses_block_id ON public.block_responses(block_id);

-- ============================================================
-- 6. canonical_ils
-- ILs canônicos finais (output integrado Momento 1 + Momento 2).
-- 1:1 com ipe_cycles.
-- Interface para o engine HAGO: d1–d4 como médias das 4 linhas cada.
-- revisao_necessaria: flag para revisão humana por Bruno (20 usuários piloto)
-- ============================================================

CREATE TABLE public.canonical_ils (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id          UUID NOT NULL UNIQUE
                        REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  -- 16 ILs — valores válidos: 1.0, 2.0, 3.5, 4.5, 5.5, 6.5, 7.5, 8.0 ou NULL
  l1_1  NUMERIC(4,2), l1_2  NUMERIC(4,2), l1_3  NUMERIC(4,2), l1_4  NUMERIC(4,2),
  l2_1  NUMERIC(4,2), l2_2  NUMERIC(4,2), l2_3  NUMERIC(4,2), l2_4  NUMERIC(4,2),
  l3_1  NUMERIC(4,2), l3_2  NUMERIC(4,2), l3_3  NUMERIC(4,2), l3_4  NUMERIC(4,2),
  l4_1  NUMERIC(4,2), l4_2  NUMERIC(4,2), l4_3  NUMERIC(4,2), l4_4  NUMERIC(4,2),
  -- Status por linha
  il_status             JSONB NOT NULL DEFAULT '{}',
  -- Dimensões (médias das 4 linhas)
  d1  NUMERIC(4,2), d2  NUMERIC(4,2), d3  NUMERIC(4,2), d4  NUMERIC(4,2),
  -- Metadados de confiança
  confianca_global      TEXT CHECK (confianca_global IN ('alta', 'média', 'baixa')),
  confianca_por_linha   JSONB NOT NULL DEFAULT '{}',
  flags                 JSONB NOT NULL DEFAULT '{}',
  -- Revisão humana (piloto 20 usuários)
  revisao_necessaria    BOOLEAN NOT NULL DEFAULT FALSE,
  revisao_motivo        TEXT,
  revisado_por          TEXT,
  revisado_at           TIMESTAMPTZ,
  produced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canonical_ils_revisao ON public.canonical_ils(revisao_necessaria)
  WHERE revisao_necessaria = TRUE;

-- ============================================================
-- 7. prompt_versions
-- Rastreabilidade de versões de prompt.
-- component: 'scoring_pill_PI' | 'scoring_block_L1.1' | 'eco_PI' | etc.
-- Apenas um prompt ativo por component a qualquer momento.
-- ============================================================

CREATE TABLE public.prompt_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component      TEXT NOT NULL,
  version        TEXT NOT NULL,
  prompt_text    TEXT NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at  TIMESTAMPTZ,
  UNIQUE (component, version)
);

CREATE INDEX idx_prompt_versions_component_active
  ON public.prompt_versions(component)
  WHERE active = TRUE;

-- ============================================================
-- 8. scoring_audit
-- Auditoria de cada chamada LLM de scoring.
-- Sem FK hard em ipe_cycle_id para não bloquear retenção de auditoria
-- após deleção de ciclos. Index garante lookup eficiente.
-- parse_success = FALSE sinaliza degradação graciosa.
-- ============================================================

CREATE TABLE public.scoring_audit (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id     UUID,
  component        TEXT NOT NULL,
  prompt_version   TEXT,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  raw_output       TEXT,
  parsed_output    JSONB,
  parse_success    BOOLEAN NOT NULL DEFAULT TRUE,
  retry_count      INTEGER NOT NULL DEFAULT 0,
  model            TEXT,
  scored_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scoring_audit_cycle         ON public.scoring_audit(ipe_cycle_id);
CREATE INDEX idx_scoring_audit_parse_failure ON public.scoring_audit(parse_success)
  WHERE parse_success = FALSE;

-- ============================================================
-- 9. ALTER TABLE cycles (engine existente)
-- Vincula ciclos Luce ao ciclo IPE de origem.
-- ipe_cycle_number: qual número de ciclo IPE gerou este ciclo Luce
-- ============================================================

ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS ipe_cycle_id     UUID REFERENCES public.ipe_cycles(id),
  ADD COLUMN IF NOT EXISTS ipe_cycle_number INTEGER DEFAULT 1;

CREATE INDEX idx_cycles_ipe_cycle_id ON public.cycles(ipe_cycle_id)
  WHERE ipe_cycle_id IS NOT NULL;

-- ============================================================
-- 9.1 ATUALIZAR lucid_persist_cycle (bloqueante — R1.1)
-- Adiciona p_ipe_cycle_id e p_ipe_cycle_number como parâmetros opcionais.
-- Sem este update, ciclos Luce criados após IPE entram sem vínculo de origem.
-- ============================================================

CREATE OR REPLACE FUNCTION public.lucid_persist_cycle(
  p_user_id                   UUID,
  p_base_version              INTEGER,
  p_structural_model_version  VARCHAR,
  p_raw_input_json            JSONB,
  p_input_hash                VARCHAR,
  p_structural_hash           VARCHAR,
  p_previous_cycle_hash       VARCHAR,
  p_cycle_integrity_hash      VARCHAR,
  p_snapshot_json             JSONB,
  p_node_history_rows         JSONB,
  p_input_classification      VARCHAR,
  p_response_type             VARCHAR,
  p_movement_primary          VARCHAR,
  p_movement_secondary        VARCHAR,
  p_llm_provider              VARCHAR,
  p_llm_model_id              VARCHAR,
  p_llm_temperature           NUMERIC,
  p_llm_config_hash           VARCHAR,
  p_structural_trace          JSONB,
  p_hago_state                VARCHAR,
  p_llm_response              TEXT DEFAULT NULL,
  p_ipe_cycle_id              UUID DEFAULT NULL,
  p_ipe_cycle_number          INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_id        UUID := gen_random_uuid();
  v_new_version     INTEGER;
  v_node            JSONB;
  v_rows_updated    INTEGER;
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
    ipe_cycle_id, ipe_cycle_number
  ) VALUES (
    v_cycle_id, p_user_id, v_new_version, p_structural_model_version,
    p_raw_input_json, p_input_hash, p_structural_hash,
    p_previous_cycle_hash, p_cycle_integrity_hash,
    p_input_classification, p_response_type,
    p_movement_primary, p_movement_secondary,
    p_llm_provider, p_llm_model_id, p_llm_temperature, p_llm_config_hash,
    p_hago_state, p_llm_response,
    p_ipe_cycle_id, p_ipe_cycle_number
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
    'cycle_id',       v_cycle_id,
    'current_version', v_new_version
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- Política: usuário acessa apenas seus próprios dados.
-- scoring_audit e prompt_versions: sem RLS de usuário
-- (acesso apenas via service_role nas edge functions)
-- ============================================================

ALTER TABLE public.ipe_cycles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pill_responses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pill_scoring       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_ils      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_audit      ENABLE ROW LEVEL SECURITY;

-- ipe_cycles: acesso direto por user_id
CREATE POLICY "ipe_cycles_select_own" ON public.ipe_cycles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ipe_cycles_insert_own" ON public.ipe_cycles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Tabelas dependentes: acesso via ipe_cycles
CREATE POLICY "pill_responses_select_own" ON public.pill_responses
  FOR SELECT USING (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

CREATE POLICY "pill_scoring_select_own" ON public.pill_scoring
  FOR SELECT USING (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

CREATE POLICY "questionnaire_state_select_own" ON public.questionnaire_state
  FOR SELECT USING (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

CREATE POLICY "block_responses_select_own" ON public.block_responses
  FOR SELECT USING (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

CREATE POLICY "canonical_ils_select_own" ON public.canonical_ils
  FOR SELECT USING (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

-- prompt_versions: leitura pública (versões não são sensíveis)
CREATE POLICY "prompt_versions_select_all" ON public.prompt_versions
  FOR SELECT USING (true);

-- scoring_audit: sem política de SELECT para usuário final
-- RLS habilitado + zero políticas = deny-all para roles autenticados via JWT
-- Acesso exclusivo via service_role (edge functions e dashboard Supabase)

-- ============================================================
-- Verification
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN (
--     'ipe_cycles','pill_responses','pill_scoring',
--     'questionnaire_state','block_responses','canonical_ils',
--     'prompt_versions','scoring_audit'
--   );
-- → deve retornar 8 linhas
