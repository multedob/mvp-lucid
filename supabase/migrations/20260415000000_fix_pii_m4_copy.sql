-- ============================================================
-- Fix PII M4 copy — user feedback: unclear what to write
-- Migration: 20260415000000_fix_pii_m4_copy.sql
-- ============================================================
-- Changes:
--   V1: was meta ("how you talk about") → concrete moment
--   V2: clarify the "two moments" ask with explicit instruction
--   V3: add concrete instruction (no change to question)
--   V4: clarify what "what's at stake" means
-- ============================================================

UPDATE public.pill_content_variations
SET content = jsonb_set(
  content,
  '{m4}',
  '{"question":"After these answers — where did you feel the real you, and where did you feel the role performing?","instruction":"Name one concrete moment from your answers where those two parted ways. A sentence or two is enough."}'::jsonb
)
WHERE pill_id = 'PII' AND ipe_level = 1.0 AND variation_key = 'V1' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(
  content,
  '{m4}',
  '{"question":"When did you first feel yourself disappearing into this role, and when did you first notice it was happening?","instruction":"Those are usually two different moments. Describe both, briefly — even if you''re not sure of the dates."}'::jsonb
)
WHERE pill_id = 'PII' AND ipe_level = 1.0 AND variation_key = 'V2' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(
  content,
  '{m4}',
  '{"question":"If your role ended tomorrow, what would you miss most — the work itself, or being the person who does it?","instruction":"Pick one, and say why in a sentence or two. The honest answer is the useful one."}'::jsonb
)
WHERE pill_id = 'PII' AND ipe_level = 1.0 AND variation_key = 'V3' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(
  content,
  '{m4}',
  '{"question":"What would be the hardest part about admitting that something inside you isn''t with your role anymore?","instruction":"Name what you''d lose, or what would become real, if you said it out loud. A few sentences."}'::jsonb
)
WHERE pill_id = 'PII' AND ipe_level = 1.0 AND variation_key = 'V4' AND locale = 'en';

-- Verification query (run separately to confirm):
-- SELECT variation_key, content->'m4' FROM pill_content_variations
-- WHERE pill_id = 'PII' ORDER BY variation_key;
