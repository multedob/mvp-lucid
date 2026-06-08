-- ROLLBACK for: feedback_mvp SELECT policy.
-- Removes the auth.uid()=user_id SELECT policy.
-- Apply ONLY if the new policy is blocking legitimate reads.

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_mvp;
