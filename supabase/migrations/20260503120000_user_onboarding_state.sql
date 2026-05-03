-- A2 — Source of truth de onboarding (substitui localStorage flags)
-- Cria tabela user_onboarding_state como single source of truth.
-- Design: timestamps nullable em vez de booleans → NULL = não feito; preenchido = feito + quando.

-- ─── Tabela ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_onboarding_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_confirmed_at timestamptz,
  consent_given_at timestamptz,
  letter_seen_at   timestamptz,
  name_set_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_onboarding_state IS
  'Single source of truth para flags de onboarding (substitui localStorage). NULL = step não feito; timestamp = step concluído.';

-- ─── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.user_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uos_select_own"
  ON public.user_onboarding_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "uos_insert_own"
  ON public.user_onboarding_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "uos_update_own"
  ON public.user_onboarding_state FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Trigger: cria registro vazio quando user é criado ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_onboarding_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_onboarding();

-- ─── Trigger: updated_at automático ────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_user_onboarding_state_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_onboarding_state_set_updated_at ON public.user_onboarding_state;
CREATE TRIGGER user_onboarding_state_set_updated_at
  BEFORE UPDATE ON public.user_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_onboarding_state_updated_at();

-- ─── Backfill para users já existentes (zerados) ───────────────────
-- Decisão (Bruno 03/mai): não há users reais ainda → todos refazem onboarding.
INSERT INTO public.user_onboarding_state (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
