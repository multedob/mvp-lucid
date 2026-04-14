-- ============================================================
-- CONTENT VARIATIONS — Pill & Questionnaire rotation system
-- Migration: 20260414000000_content_variations.sql
-- Purpose: Store variation content for pills (M1-M4) and
--          questionnaire blocks to prevent repetition across cycles
-- ============================================================

-- ============================================================
-- 1. pill_content_variations
-- Stores complete pill content per variation (V1-V4) per IPE level.
-- One row = all moments (M1-M4) for one pill+variation+ipe_level.
-- Selection unit: one variation_key per pill per cycle.
-- ============================================================

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
  -- content schema:
  -- {
  --   "m1": {
  --     "phrase": "string",
  --     "tension_label": "string"
  --   },
  --   "m2": {
  --     "scene": "string (full narrative)",
  --     "question": "string (question about character)"
  --   },
  --   "m3_1": {
  --     "question": "string",
  --     "pole_left": "string",
  --     "pole_right": "string",
  --     "context": "string (scoring context, not shown to user)"
  --   },
  --   "m3_2": {
  --     "scenario": "string",
  --     "framing": "string (e.g. 'What do you give up — and who else is affected?')",
  --     "options": [
  --       {
  --         "key": "A",
  --         "text": "string",
  --         "followup": "string",
  --         "followup_type": "cost" | "question"
  --       }
  --     ]
  --   },
  --   "m3_3": {
  --     "q1": "string (alignment moment)",
  --     "q2": "string (what made it possible)",
  --     "q_transversal": "string (L1.3 coverage)",
  --     "scoring_note": "string (hidden, for LLM context)"
  --   },
  --   "m4": {
  --     "question": "string",
  --     "instruction": "string (sub-text)"
  --   }
  -- }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pill_id, ipe_level, variation_key, locale)
);

CREATE INDEX idx_pcv_pill_ipe ON public.pill_content_variations(pill_id, ipe_level);

-- ============================================================
-- 2. questionnaire_content_variations
-- Rotation variants for questionnaire principal questions.
-- INDEPENDENT of calibration variants (variantes in questions.ts).
-- Selection: per-block per-cycle, weighted random.
-- ============================================================

CREATE TABLE public.questionnaire_content_variations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id        TEXT NOT NULL,
  ipe_level       NUMERIC(2,1) NOT NULL DEFAULT 1.0,
  variation_key   TEXT NOT NULL
                  CHECK (variation_key IN ('V1','V2','V3')),
  locale          TEXT NOT NULL DEFAULT 'en'
                  CHECK (locale IN ('en','pt','es')),
  content         JSONB NOT NULL,
  -- content schema:
  -- {
  --   "principal": "string (main question text)",
  --   "hint": "string | null (italic sub-text)",
  --   "fallback": "string (I don't remember alternative)",
  --   "subfallback": "string | null (second-level fallback)"
  -- }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (block_id, ipe_level, variation_key, locale)
);

CREATE INDEX idx_qcv_block_ipe ON public.questionnaire_content_variations(block_id, ipe_level);

-- ============================================================
-- 3. Add variation tracking to existing tables
-- ============================================================

-- Track which pill variation was used per pill per cycle
ALTER TABLE public.pill_responses
  ADD COLUMN variation_key TEXT;

-- Track which rotation variant was shown for each questionnaire block
ALTER TABLE public.block_responses
  ADD COLUMN rotation_variation_key TEXT;

-- ============================================================
-- 4. RLS Policies
-- pill_content_variations and questionnaire_content_variations
-- are READ-ONLY for authenticated users (content is public).
-- Writes are admin/service-role only (via migrations/seeds).
-- ============================================================

ALTER TABLE public.pill_content_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_content_variations ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read content variations
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

-- Service role can manage content (for seeding/updates)
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
