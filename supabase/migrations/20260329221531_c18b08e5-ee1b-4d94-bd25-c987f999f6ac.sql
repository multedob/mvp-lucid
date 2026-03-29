-- Block L1.1: Deactivate old + insert v0.4.5
UPDATE prompt_versions SET active = false, deprecated_at = NOW() WHERE component = 'scoring_block_L1.1' AND version != 'v0.4.5' AND active = true;
DELETE FROM prompt_versions WHERE component = 'scoring_block_L1.1' AND version = 'v0.4.5';
