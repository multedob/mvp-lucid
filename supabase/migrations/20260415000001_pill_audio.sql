-- ============================================================
-- Pill audio recording + transcription
-- Migration: 20260415000001_pill_audio.sql
-- ============================================================
-- Adds audio storage + transcription columns to pill_responses.
-- Creates private storage bucket `pill-audio` with per-user RLS.
--
-- Fields:
--   m2/m4_audio_url          — path inside pill-audio bucket
--   m2/m4_transcription_live — what Web Speech API captured (browser-side)
--   m2/m4_transcription_final — Whisper-polished final text
--   m2/m4_audio_duration_ms  — recorded length in ms
--
-- The user-visible response text lives in existing m2_resposta / m4_resposta
-- columns (written from the textarea — which gets the Whisper final text
-- after transcription, then may be edited by the user before submit).
-- ============================================================

-- 1. Columns on pill_responses
ALTER TABLE public.pill_responses
  ADD COLUMN IF NOT EXISTS m2_audio_url              TEXT,
  ADD COLUMN IF NOT EXISTS m2_transcription_live     TEXT,
  ADD COLUMN IF NOT EXISTS m2_transcription_final    TEXT,
  ADD COLUMN IF NOT EXISTS m2_audio_duration_ms      INTEGER,
  ADD COLUMN IF NOT EXISTS m4_audio_url              TEXT,
  ADD COLUMN IF NOT EXISTS m4_transcription_live     TEXT,
  ADD COLUMN IF NOT EXISTS m4_transcription_final    TEXT,
  ADD COLUMN IF NOT EXISTS m4_audio_duration_ms      INTEGER;

-- 2. Private storage bucket for pill audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pill-audio',
  'pill-audio',
  false,                                           -- private
  10485760,                                        -- 10 MB per file cap
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. RLS policies on storage.objects for pill-audio
-- Path convention: {user_id}/{cycle_id}/{pill_id}_{moment}.webm
-- Owner = first path segment.

-- Drop any prior versions to keep the migration idempotent
DROP POLICY IF EXISTS "pill_audio_owner_read"   ON storage.objects;
DROP POLICY IF EXISTS "pill_audio_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "pill_audio_owner_update" ON storage.objects;

CREATE POLICY "pill_audio_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pill-audio'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pill_audio_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pill-audio'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pill_audio_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pill-audio'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Intentionally no DELETE policy for regular users — deletions must go
-- through service role (e.g. account deletion edge function).

-- 4. Verification query (run separately):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'pill_responses' AND column_name LIKE '%audio%';
-- SELECT id, public FROM storage.buckets WHERE id = 'pill-audio';
