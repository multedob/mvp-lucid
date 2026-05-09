-- ============================================================
-- Pill audio — RLS pra third-party (terceiros respondendo o questionário)
-- Migration: 20260507000001_pill_audio_third_party.sql
-- ============================================================
-- Contexto: terceiros não estão autenticados (auth.uid() = null), então
-- as policies originais (que comparam auth.uid()::text com folder name)
-- bloqueavam todo upload feito pelo terceiro respondendo.
--
-- Path convention pro third-party: {invite_id}/{token}/{question_id}_third-party.{ext}
-- Validação: regex UUID v4 no primeiro segmento do path.
-- (Validação completa do invite acontece server-side via edge functions
--  third-party-validate-link e third-party-submit-response.)
-- ============================================================

-- Limpa versões anteriores (idempotente)
DROP POLICY IF EXISTS "pill_audio_third_party_insert" ON storage.objects;
DROP POLICY IF EXISTS "pill_audio_third_party_update" ON storage.objects;

-- INSERT: aceita upload pra qualquer path cujo primeiro segmento seja UUID válido.
CREATE POLICY "pill_audio_third_party_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pill-audio'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- UPDATE: re-take de áudio (mesmo path com upsert)
CREATE POLICY "pill_audio_third_party_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pill-audio'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- READ: NÃO criamos policy pública. Download/transcrição acontece via edge
-- function `transcribe-audio` rodando com service_role (bypass RLS).
