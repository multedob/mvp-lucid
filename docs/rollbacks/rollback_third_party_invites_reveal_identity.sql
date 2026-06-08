-- ROLLBACK for: third_party_invites reveal_identity hardening.
-- Drops the CHECK constraint, NOT NULL, and default.
-- Does NOT revert the backfill (28 rows set to true) — those stay true (safe no-op).
-- Apply ONLY if the constraint blocks a legitimate feature (e.g. masking view shipped).

ALTER TABLE public.third_party_invites
  DROP CONSTRAINT IF EXISTS reveal_identity_must_be_true;

ALTER TABLE public.third_party_invites
  ALTER COLUMN reveal_identity DROP NOT NULL;

ALTER TABLE public.third_party_invites
  ALTER COLUMN reveal_identity DROP DEFAULT;
