-- TA-S6.1b — Estende kind na tabela echoes
-- Adiciona 'warmup_deep_reading' ao CHECK existente.
-- Permite que o deep reading inicial (gerado a partir só do warmup, pré-ciclo)
-- viva na mesma tabela `echoes`, separado por kind.

ALTER TABLE public.echoes DROP CONSTRAINT IF EXISTS echoes_kind_check;
ALTER TABLE public.echoes ADD CONSTRAINT echoes_kind_check
  CHECK (kind IN ('warmup', 'warmup_deep_reading', 'ipe1', 'ipe2'));
