-- ─────────────────────────────────────────────────────────────────────────────
-- Creates the `captures` storage bucket used by the Nyabag browser extension
-- to store compressed page screenshots.
--
-- Run this once in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the bucket (private, max 10 MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'captures',
  'captures',
  false,
  10485760,   -- 10 MB per file (server compresses to ~100–400 KB before upload)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policy: each user can only read/write inside their own subfolder.
--    The path pattern is: {userId}/{uuid}.jpg
--    storage.foldername(name)[1] extracts the first path segment (the userId).

DO $$
BEGIN
  -- Drop existing policy if re-running this migration
  DROP POLICY IF EXISTS "Users own their captures" ON storage.objects;

  CREATE POLICY "Users own their captures"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'captures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'captures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Note: the Next.js API routes use the service-role key to upload on behalf
-- of the user, so the admin client bypasses RLS. The policy above is a safety
-- net for any direct client-side access (e.g., future dashboard Captures view).
-- ─────────────────────────────────────────────────────────────────────────────
