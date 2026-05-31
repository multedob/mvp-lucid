-- Fix 4 — Feedback β: suportar upload de screenshot

-- 1) Coluna screenshot_url na tabela feedback_mvp
ALTER TABLE public.feedback_mvp
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- 2) Bucket privado para screenshots de feedback
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-images', 'feedback-images', false)
ON CONFLICT (id) DO NOTHING;

-- 3) RLS no storage.objects para o bucket feedback-images
-- INSERT: usuário autenticado faz upload apenas em pasta com seu próprio user_id
DROP POLICY IF EXISTS "feedback_images_insert_own" ON storage.objects;
CREATE POLICY "feedback_images_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'feedback-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: apenas service_role (admins via console). Usuários NÃO leem screenshots.
DROP POLICY IF EXISTS "feedback_images_select_service" ON storage.objects;
CREATE POLICY "feedback_images_select_service"
ON storage.objects FOR SELECT TO service_role
USING (bucket_id = 'feedback-images');

-- DELETE: apenas service_role.
DROP POLICY IF EXISTS "feedback_images_delete_service" ON storage.objects;
CREATE POLICY "feedback_images_delete_service"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'feedback-images');