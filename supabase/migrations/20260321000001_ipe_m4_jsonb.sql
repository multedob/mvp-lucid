-- ============================================================
-- IPE SCHEMA — Patch m4_resposta
-- Migration: 20260321000001_ipe_m4_jsonb.sql
-- Fonte: PILL_I/II/III/IV/V/VI_Prototipo v0.3 — M4 estrutura
-- Motivo: m4_resposta TEXT é insuficiente — M4 tem 2+ subchaves por Pill:
--   PI:  { percepcao, presenca_deslocamento }  ← L4.4 corpus primário
--   PV:  { percepcao, conhecimento_em_campo, presenca_para_outros } ← L4.3 corpus primário
--   PII/PIII/PIV/PVI: { percepcao, presenca_para_outros }  ← L4.4 transversal
-- Depende de: 20260321000000_ipe_schema.sql
-- ============================================================

ALTER TABLE public.pill_responses
  ALTER COLUMN m4_resposta TYPE JSONB
  USING CASE
    WHEN m4_resposta IS NULL THEN NULL
    ELSE jsonb_build_object('percepcao', m4_resposta)
  END;

-- ============================================================
-- Comentário documentando estrutura esperada por Pill
-- (validação ocorre na edge function ipe-pill-session)
--
-- PI:   { "percepcao": "...", "presenca_deslocamento": "..." }
-- PII:  { "percepcao": "...", "presenca_para_outros": "..." }
-- PIII: { "percepcao": "...", "presenca_para_outros": "..." }
-- PIV:  { "percepcao": "...", "presenca_para_outros": "..." }
-- PV:   { "percepcao": "...", "conhecimento_em_campo": "...", "presenca_para_outros": "..." }
-- PVI:  { "percepcao": "...", "presenca_para_outros": "..." }
-- ============================================================

COMMENT ON COLUMN public.pill_responses.m4_resposta IS
  'JSONB com subchaves por Pill: percepcao (todas) + presenca_deslocamento (PI) + conhecimento_em_campo + presenca_para_outros (PV) + presenca_para_outros (PII/PIII/PIV/PVI). Ver PILL_X_Prototipo v0.3.';
