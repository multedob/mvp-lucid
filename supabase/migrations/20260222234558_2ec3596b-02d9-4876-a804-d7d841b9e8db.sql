ALTER TABLE public.rag_corpus ADD COLUMN source_author TEXT NOT NULL DEFAULT '';
ALTER TABLE public.rag_corpus ADD COLUMN source_work TEXT NOT NULL DEFAULT '';