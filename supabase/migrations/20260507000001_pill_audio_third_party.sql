-- ============================================================
-- Pill audio — RLS pra third-party (terceiros respondendo o questionário)
-- Migration: 20260507000001_pill_audio_third_party.sql
-- ============================================================
-- Contexto: terceiros não estão autenticados (auth.uid() = null), então
-- as policies originais (que comparam auth.uid()::text com folder name)
-- bloqueavam todo upload feito pelo terceiro respondendo.
--
-- Path convention pro third-party: {invite_id}/{token}/{question_id}_third-party.{ext}
-- Verificação: o primeiro segmento (folder name) tem que ser um invite_id válido
-- e o invite tem que estar em status 'pending' ou 'submitted' (impede uploads
-- pra invites revogados/expirados).
-- ============================================================

-- INSERT: terceiro pode fazer upload se folder = invite_id válido e ativo.
DROP POLICY IF EXISTS "pill_audio_third_party_insert" ON storage.objects;
CREATE POLICY "pill_audio_third_party_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pill-audio'
    AND EXISTS (
      SELECT 1 FROM public.third_party_invites tpi
      WHERE tpi.id::text = (storage.foldername(name))[1]
        AND tpi.status IN ('pending', 'submitted')
    )
  );

-- UPDATE: re-take de áudio (mesmo path com upsert) precisa de policy de update.
DROP POLICY IF EXISTS "pill_audio_third_party_update" ON storage.objects;
CREATE POLICY "pill_audio_third_party_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pill-audio'
    AND EXISTS (
      SELECT 1 FROM public.third_party_invites tpi
      WHERE tpi.id::text = (storage.foldername(name))[1]
        AND tpi.status IN ('pending', 'submitted')
    )
  );

-- READ: NÃO criamos policy pública. Download/transcrição acontece via edge
-- function `transcribe-audio` rodando com service_role (bypass RLS). Mantém
-- privacidade do áudio (terceiros não conseguem listar/baixar áudios alheios).

-- Verificação manual:
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%pill_audio%';
