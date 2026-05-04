-- TA-S5.1 — tabela `echoes` (genérica)
-- AFC ONB-6: source unificado para ecos do produto.
-- kind discriminator: 'warmup' (pré-ciclo) | 'ipe1' (futuro) | 'ipe2' (futuro)
-- cycle_id nullable porque warmup acontece antes do primeiro ciclo IPE.

CREATE TABLE IF NOT EXISTS public.echoes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind               TEXT NOT NULL CHECK (kind IN ('warmup', 'ipe1', 'ipe2')),
  cycle_id           UUID REFERENCES public.ipe_cycles(id) ON DELETE CASCADE,
  questions          JSONB NOT NULL,
  responses          JSONB NOT NULL,
  eco_text           TEXT NOT NULL,
  follow_up_question TEXT,
  nodes_used         TEXT[],
  model              TEXT NOT NULL,
  latency_ms         INTEGER,
  raw_payload        JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.echoes IS
  'Source unificado de ecos do produto. kind=warmup (pré-ciclo, AFC ONB-6) | ipe1 | ipe2 (futuro).';
COMMENT ON COLUMN public.echoes.cycle_id IS
  'NULL quando kind=warmup (acontece antes do primeiro ciclo IPE).';
COMMENT ON COLUMN public.echoes.nodes_used IS
  'IDs dos nodes RAG (rag_corpus.node_id) usados no enrichment.';

CREATE INDEX IF NOT EXISTS idx_echoes_user  ON public.echoes(user_id);
CREATE INDEX IF NOT EXISTS idx_echoes_kind  ON public.echoes(kind);
CREATE INDEX IF NOT EXISTS idx_echoes_cycle ON public.echoes(cycle_id) WHERE cycle_id IS NOT NULL;

-- ─── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.echoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "echoes_select_own" ON public.echoes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "echoes_insert_own" ON public.echoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Edge functions usam service_role e bypassam RLS — não precisa policy de service_role.
