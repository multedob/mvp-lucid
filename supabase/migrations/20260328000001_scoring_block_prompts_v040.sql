-- ============================================================
-- Migration: scoring_audit engine v1.0 columns
-- Fonte: DESIGN_ENGINE_SCORING_BLOCK v1.0, §3.6 (E1)
-- Adiciona colunas necessárias para o engine real:
--   raw_input  — texto completo do corpus enviado ao LLM (LGPD §10.4)
--   duration_ms — latência da chamada LLM (monitoramento §11)
-- ============================================================

-- raw_input: armazena corpus completo para auditoria e calibração
-- Requer consentimento explícito do respondente (Art. 7°, I LGPD)
-- Política de anonimização: substituir por hash após 6 meses
ALTER TABLE scoring_audit ADD COLUMN IF NOT EXISTS raw_input TEXT;

-- duration_ms: tempo total da chamada LLM em milissegundos
-- Usado para monitoramento de latência p95 (§11.1)
ALTER TABLE scoring_audit ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Comentários para documentação do schema
COMMENT ON COLUMN scoring_audit.raw_input IS 'Corpus completo enviado ao LLM (respondente + pills). LGPD: consentimento explícito, anonimizar após 6 meses.';
COMMENT ON COLUMN scoring_audit.duration_ms IS 'Latência total da chamada LLM em ms. Alerta se p95 > 12000ms.';
