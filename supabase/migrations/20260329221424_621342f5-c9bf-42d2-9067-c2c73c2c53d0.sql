-- Migration: scoring_block_prompts v0.4.5
-- Step 0: Deactivate ALL v0.4.2 scoring block prompts
UPDATE prompt_versions
SET active = false, deprecated_at = NOW()
WHERE version = 'v0.4.2'
  AND active = true
  AND component LIKE 'scoring_block_L%';