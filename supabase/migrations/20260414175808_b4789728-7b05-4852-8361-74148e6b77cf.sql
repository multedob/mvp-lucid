CREATE TABLE public.pill_content_variations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pill_id         TEXT NOT NULL
                  CHECK (pill_id IN ('PI','PII','PIII','PIV','PV','PVI')),
  ipe_level       NUMERIC(2,1) NOT NULL DEFAULT 1.0
                  CHECK (ipe_level IN (1.0, 2.0, 2.5, 3.0)),
  variation_key   TEXT NOT NULL
                  CHECK (variation_key IN ('V1','V2','V3','V4')),
  locale          TEXT NOT NULL DEFAULT 'en'
                  CHECK (locale IN ('en','pt','es')),
  content         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pill_id, ipe_level, variation_key, locale)
);

CREATE INDEX idx_pcv_pill_ipe ON public.pill_content_variations(pill_id, ipe_level);

CREATE TABLE public.questionnaire_content_variations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id        TEXT NOT NULL,
  ipe_level       NUMERIC(2,1) NOT NULL DEFAULT 1.0,
  variation_key   TEXT NOT NULL
                  CHECK (variation_key IN ('V1','V2','V3')),
  locale          TEXT NOT NULL DEFAULT 'en'
                  CHECK (locale IN ('en','pt','es')),
  content         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (block_id, ipe_level, variation_key, locale)
);

CREATE INDEX idx_qcv_block_ipe ON public.questionnaire_content_variations(block_id, ipe_level);

ALTER TABLE public.pill_responses
  ADD COLUMN variation_key TEXT;

ALTER TABLE public.block_responses
  ADD COLUMN rotation_variation_key TEXT;

ALTER TABLE public.pill_content_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_content_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pill content"
  ON public.pill_content_variations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read questionnaire content"
  ON public.questionnaire_content_variations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages pill content"
  ON public.pill_content_variations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages questionnaire content"
  ON public.questionnaire_content_variations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);