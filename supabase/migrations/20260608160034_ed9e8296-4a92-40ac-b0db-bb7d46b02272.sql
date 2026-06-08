
-- Migration #2: restringir SELECT em prompt_versions ao service_role.
-- Remove exposição pública dos prompts internos de scoring.

DROP POLICY IF EXISTS "prompt_versions_select_all" ON public.prompt_versions;

REVOKE SELECT ON public.prompt_versions FROM anon;
REVOKE SELECT ON public.prompt_versions FROM authenticated;
GRANT ALL ON public.prompt_versions TO service_role;
