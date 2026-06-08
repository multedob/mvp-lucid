
-- Migration #1: feedback_mvp SELECT policy
CREATE POLICY "Users can view their own feedback"
ON public.feedback_mvp
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Migration #3: third_party_invites reveal_identity hardening (atomic)
UPDATE public.third_party_invites
SET reveal_identity = true
WHERE reveal_identity IS NULL;

ALTER TABLE public.third_party_invites
  ALTER COLUMN reveal_identity SET DEFAULT true;

ALTER TABLE public.third_party_invites
  ALTER COLUMN reveal_identity SET NOT NULL;

ALTER TABLE public.third_party_invites
  ADD CONSTRAINT reveal_identity_must_be_true
  CHECK (reveal_identity = true);
