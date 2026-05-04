-- AFC ONB-6 — adiciona warmup como step do onboarding.
-- Reutiliza padrão de timestamp nullable (NULL = não feito; preenchido = feito + quando).

ALTER TABLE public.user_onboarding_state
  ADD COLUMN IF NOT EXISTS warmup_completed_at timestamptz;

COMMENT ON COLUMN public.user_onboarding_state.warmup_completed_at IS
  'AFC ONB-6: marca quando user completou (ou pulou via "decidir depois") o mini-eco warm-up.';
