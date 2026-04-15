-- ============================================================
-- M4 instruction consistency — PI, PIII, PIV, PV, PVI
-- Migration: 20260415000002_m4_instruction_consistency.sql
-- ============================================================
-- Rationale (user feedback):
--   M4 questions were often good, but instructions told users
--   "just notice" without telling them WHAT to write or HOW MUCH.
--   Applies the pattern established for PII M4: always include
--   explicit length guidance + a concrete hint of what to capture.
--
-- Keeps original questions intact; rewrites only the `instruction`
-- subfield of each m4 variation. Preserves the reflective tone.
-- ============================================================

-- ─── PI (Belonging) ──────────────────────────────────────────
UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"One sentence is enough. Write what stayed with you — a word, an image, a feeling."'::jsonb)
WHERE pill_id = 'PI' AND ipe_level = 1.0 AND variation_key = 'V1' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Name what was hard to own. One sentence. You don''t need to resolve it — just name it."'::jsonb)
WHERE pill_id = 'PI' AND ipe_level = 1.0 AND variation_key = 'V2' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Write the difference in a sentence or two. Not which is true — which felt more familiar."'::jsonb)
WHERE pill_id = 'PI' AND ipe_level = 1.0 AND variation_key = 'V3' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Write the sentence. Then, in one more line, say whether it felt like relief or exposure to write it."'::jsonb)
WHERE pill_id = 'PI' AND ipe_level = 1.0 AND variation_key = 'V4' AND locale = 'en';

-- ─── PIII (Presence ↔ Distance) ──────────────────────────────
UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"One or two sentences. What shifted between now and then — in the words themselves?"'::jsonb)
WHERE pill_id = 'PIII' AND ipe_level = 1.0 AND variation_key = 'V1' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Count if you can. Then in a sentence, name what you think shifted between blaming and defending."'::jsonb)
WHERE pill_id = 'PIII' AND ipe_level = 1.0 AND variation_key = 'V2' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"A sentence or two. If it feels earned, describe the cost. If it''s still being negotiated, describe the weight."'::jsonb)
WHERE pill_id = 'PIII' AND ipe_level = 1.0 AND variation_key = 'V3' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Be honest in a sentence or two. Saying ''I can live with it'' and saying ''it hurts'' are both valid answers."'::jsonb)
WHERE pill_id = 'PIII' AND ipe_level = 1.0 AND variation_key = 'V4' AND locale = 'en';

-- ─── PIV (Clarity ↔ Action) ──────────────────────────────────
UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"One sentence. Name what''s in the gap — doubt, weight, someone specific, or something you haven''t named yet."'::jsonb)
WHERE pill_id = 'PIV' AND ipe_level = 1.0 AND variation_key = 'V1' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"A sentence or two. Describe what you actually did just now — not what you think you should do."'::jsonb)
WHERE pill_id = 'PIV' AND ipe_level = 1.0 AND variation_key = 'V2' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Pick one in a sentence. Then say, in one more line, what made that one pull harder."'::jsonb)
WHERE pill_id = 'PIV' AND ipe_level = 1.0 AND variation_key = 'V3' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Name which one in a sentence. Don''t try to reconcile them — just say which one feels more like you right now."'::jsonb)
WHERE pill_id = 'PIV' AND ipe_level = 1.0 AND variation_key = 'V4' AND locale = 'en';

-- ─── PV (Inside ↔ Outside) ───────────────────────────────────
UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"One word or one sentence. Don''t explain the word — just let it stand."'::jsonb)
WHERE pill_id = 'PV' AND ipe_level = 1.0 AND variation_key = 'V1' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"A word is enough. Or a sentence. Say what the opening actually is — even if imprecise."'::jsonb)
WHERE pill_id = 'PV' AND ipe_level = 1.0 AND variation_key = 'V2' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"One sentence. Which pull is stronger — and what are you afraid would happen if you let the other one win?"'::jsonb)
WHERE pill_id = 'PV' AND ipe_level = 1.0 AND variation_key = 'V3' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Write the question itself — not an answer to it. A sentence is enough."'::jsonb)
WHERE pill_id = 'PV' AND ipe_level = 1.0 AND variation_key = 'V4' AND locale = 'en';

-- ─── PVI (Movement ↔ Pause) ──────────────────────────────────
UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"First answer, one sentence. Then in one more line, what made you answer that way."'::jsonb)
WHERE pill_id = 'PVI' AND ipe_level = 1.0 AND variation_key = 'V1' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"A sentence is enough. Name where your attention actually went — not where you wish it had gone."'::jsonb)
WHERE pill_id = 'PVI' AND ipe_level = 1.0 AND variation_key = 'V2' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"The word, and then one sentence: is it a complaint or a description? The distinction matters."'::jsonb)
WHERE pill_id = 'PVI' AND ipe_level = 1.0 AND variation_key = 'V3' AND locale = 'en';

UPDATE public.pill_content_variations
SET content = jsonb_set(content, '{m4,instruction}', '"Name both voices in a sentence. Then in one more line, say which one you trust more and why."'::jsonb)
WHERE pill_id = 'PVI' AND ipe_level = 1.0 AND variation_key = 'V4' AND locale = 'en';

-- ─── Verification (run separately) ──────────────────────────
-- SELECT pill_id, variation_key, content->'m4'->>'instruction' AS instr
-- FROM public.pill_content_variations
-- WHERE ipe_level = 1.0 AND locale = 'en' AND content ? 'm4'
-- ORDER BY pill_id, variation_key;
