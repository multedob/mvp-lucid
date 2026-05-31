-- Add short slug to third_party_invites for friendlier /c/{slug} URLs.
-- Existing token column stays as the primary identifier internally.

ALTER TABLE public.third_party_invites
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill: generate 8-char alphanumeric slug for any existing rows.
DO $$
DECLARE
  r record;
  candidate text;
  charset text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i int;
BEGIN
  FOR r IN SELECT id FROM public.third_party_invites WHERE slug IS NULL LOOP
    LOOP
      candidate := '';
      FOR i IN 1..8 LOOP
        candidate := candidate || substr(charset, 1 + floor(random() * length(charset))::int, 1);
      END LOOP;
      BEGIN
        UPDATE public.third_party_invites SET slug = candidate WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- retry with new candidate
      END;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS third_party_invites_slug_key
  ON public.third_party_invites (slug);

ALTER TABLE public.third_party_invites
  ALTER COLUMN slug SET NOT NULL;