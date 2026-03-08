-- ============================================================
-- 002_b2_3_source_author_exception.sql
-- B2.3 — Exceção formal: source_author vazio em nodes de síntese
-- Backlog item: B2.3
-- Decisão: source_author = '' é permitido APENAS quando
--          source_work = 'Cross-structural synthesis'.
-- Nodes afetados: F3-N7, F3-N8
-- Depende de: 20260101000000_001_lucid_schema_v3_3.sql
-- ============================================================

-- Guarda: tabela deve existir antes de prosseguir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'rag_corpus'
  ) THEN
    RAISE EXCEPTION 'rag_corpus não existe. Aplicar 20260101000000_001_lucid_schema_v3_3.sql primeiro.';
  END IF;
END;
$$;

-- Registro formal da exceção como comentário de coluna
COMMENT ON COLUMN public.rag_corpus.source_author IS
  'Autor canônico da obra fonte. '
  'EXCEÇÃO FORMAL (B2.3): nodes F3-N7 e F3-N8 possuem source_author = '''' '
  'porque derivam de síntese interna do corpus (source_work = ''Cross-structural synthesis'') '
  'sem autor externo atribuível. Esta ausência é intencional e protegida por constraint.';

-- Constraint permanente: source_author vazio só permitido em sínteses internas
-- Garante proteção contínua em todos os INSERTs e UPDATEs futuros
ALTER TABLE public.rag_corpus
  ADD CONSTRAINT rag_corpus_source_author_exception
  CHECK (
    source_author != ''
    OR source_work = 'Cross-structural synthesis'
  );
