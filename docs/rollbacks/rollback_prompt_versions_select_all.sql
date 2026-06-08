-- ROLLBACK for: restrict_prompt_versions_select.
-- Restores permissive public SELECT policy on prompt_versions.
-- Apply ONLY if frontend/edge regressions confirm a dependency on anon/authenticated read.

GRANT SELECT ON public.prompt_versions TO anon, authenticated;

CREATE POLICY "prompt_versions_select_all"
ON public.prompt_versions
FOR SELECT
TO public
USING (true);
