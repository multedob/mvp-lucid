ALTER TABLE public.pill_responses
  ADD COLUMN IF NOT EXISTS prompt_version_used text;

COMMENT ON COLUMN public.pill_responses.prompt_version_used IS
  'Identificador da origem do eco_text. Formato: "eco-det-OP0X-VY" para caminho determinístico ou versão de prompt (ex: "v2.a.1") para caminho LLM. NULL em rows pré-Fase 2-C.';

CREATE INDEX IF NOT EXISTS idx_pill_responses_prompt_version_used
  ON public.pill_responses (prompt_version_used)
  WHERE prompt_version_used IS NOT NULL;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='pill_responses' AND column_name='prompt_version_used';