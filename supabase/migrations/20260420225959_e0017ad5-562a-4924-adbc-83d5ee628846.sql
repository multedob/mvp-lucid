CREATE TABLE public.pill_eco_events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipe_cycle_id             UUID NOT NULL REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  pill_id                  TEXT NOT NULL CHECK (pill_id IN ('PI', 'PII', 'PIII', 'PIV', 'PV', 'PVI')),
  operator                 TEXT NOT NULL CHECK (operator IN ('OP01', 'OP02', 'OP03', 'OP04', 'OP05', 'OP06')),
  variation                TEXT NOT NULL CHECK (variation IN ('V0', 'V1', 'V2', 'V3')),
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