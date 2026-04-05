-- ============================================================
-- Migration: 20260405000000_fix_block_id_l34cp.sql
-- Bug: constraint block_responses_block_id_check rejeita 'L3.4_CP'
-- L3.4_CP é bloco válido (PIPELINE_EXECUCAO §3.3 — mutex L3.4 condicional)
-- servido para qualquer usuário em que shouldActivateL34Condicional = false
-- (maioria dos perfis B e todos os A — estimativa: >60% dos respondentes)
-- Impacto: insert em block_responses falhava silenciosamente no engine,
-- corrompendo o estado do questionário para esses usuários.
-- Fix: ampliar regex para aceitar sufixo _CP opcional.
-- ============================================================

-- Drop constraint antiga
ALTER TABLE public.block_responses
  DROP CONSTRAINT IF EXISTS block_responses_block_id_check;

-- Recriar aceitando L3.4_CP
-- Padrão: L{1-4}.{1-4} com sufixo opcional _CP
ALTER TABLE public.block_responses
  ADD CONSTRAINT block_responses_block_id_check
  CHECK (block_id ~ '^L[1-4]\.[1-4](_CP)?$');

-- Verificação
-- SELECT conname, consrc
--   FROM pg_constraint
--   WHERE conrelid = 'public.block_responses'::regclass
--     AND conname = 'block_responses_block_id_check';
-- → deve retornar: (block_id ~ '^L[1-4]\.[1-4](_CP)?$')
