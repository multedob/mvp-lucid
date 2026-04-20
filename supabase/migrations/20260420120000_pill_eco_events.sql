-- ============================================================
-- T0.3 — pill_eco_events
-- Telemetria do Eco (M5 das Pills) v1.1
--
-- Registra cada evento de renderização de Eco: qual operador venceu
-- a priorização, qual variação foi servida, se foi fallback, latência,
-- locale e clique em "falar com Reed".
--
-- Substrato para os quality gates da Fase 5 do plano M5 Eco v1.1:
--   - OP01 Cost fallback deve ficar ≤ 35%
--   - Latência média ≤ 500ms
--   - Checkpoint C-1 aprova Fase 2 se cobertura determinística ≥ 60%
--
-- Contrato INTERFACES_ECO_P1.md §3.4:
--   - Referencia ipe_cycles; não altera schema existente.
--   - Frente P1 cria tabela própria (ipe_final_readings ou equivalente).
--   - Comunicação entre frentes via DB; edge functions separadas.
-- ============================================================

CREATE TABLE public.pill_eco_events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id             UUID NOT NULL
                           REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  pill_id                  TEXT NOT NULL
                           CHECK (pill_id IN ('PI', 'PII', 'PIII', 'PIV', 'PV', 'PVI')),
  operator                 TEXT NOT NULL
                           CHECK (operator IN ('OP01', 'OP02', 'OP03', 'OP04', 'OP05', 'OP06')),
  variation                TEXT NOT NULL
                           CHECK (variation IN ('V0', 'V1', 'V2', 'V3')),
  is_fallback              BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms               INTEGER,
  locale                   TEXT NOT NULL DEFAULT 'pt-BR',
  rendered_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  talk_to_reed_clicked     BOOLEAN NOT NULL DEFAULT FALSE,
  talk_to_reed_clicked_at  TIMESTAMPTZ,
  raw_payload              JSONB
);

CREATE INDEX idx_pill_eco_events_cycle    ON public.pill_eco_events(ipe_cycle_id);
CREATE INDEX idx_pill_eco_events_operator ON public.pill_eco_events(operator);
CREATE INDEX idx_pill_eco_events_pill     ON public.pill_eco_events(pill_id);

-- ============================================================
-- RLS — mesmo padrão de pill_responses e pill_scoring
-- Acesso via ipe_cycle_id resolvido contra auth.uid().
-- ============================================================

ALTER TABLE public.pill_eco_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pill_eco_events_select_own" ON public.pill_eco_events
  FOR SELECT USING (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

CREATE POLICY "pill_eco_events_insert_own" ON public.pill_eco_events
  FOR INSERT WITH CHECK (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

CREATE POLICY "pill_eco_events_update_own" ON public.pill_eco_events
  FOR UPDATE USING (
    ipe_cycle_id IN (SELECT id FROM public.ipe_cycles WHERE user_id = auth.uid())
  );

-- ============================================================
-- Verification
-- ============================================================
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'pill_eco_events'
--   ORDER BY ordinal_position;
-- → deve retornar 12 colunas.
--
-- SELECT policyname FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'pill_eco_events';
-- → deve retornar 3 policies: select_own, insert_own, update_own.
