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
  false,
  10485760,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. RLS policies on storage.objects for pill-audio
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