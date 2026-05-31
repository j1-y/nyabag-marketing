-- ============================================================
-- Nyabag - Supabase Schema
-- Run this full file in your Supabase SQL editor.
-- It is safe to rerun and does not drop existing app data.
-- ============================================================

-- ============================================================
-- Extensions and helpers
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Bookmarks
-- ============================================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url                      TEXT        NOT NULL,
  title                    TEXT        NOT NULL,
  tags                     TEXT[]      NOT NULL DEFAULT '{}',
  palette                  TEXT[]      NOT NULL DEFAULT '{}',
  fonts                    TEXT[]      NOT NULL DEFAULT '{}',
  screenshot_url           TEXT,
  screenshot_path          TEXT,
  screenshot_refreshed_at  TIMESTAMPTZ,
  summary                  TEXT        NOT NULL DEFAULT '',
  metadata_refreshed_at    TIMESTAMPTZ,
  note                     TEXT        NOT NULL DEFAULT '',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_path TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_refreshed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS metadata_refreshed_at TIMESTAMPTZ;

ALTER TABLE bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_url_check,
  DROP CONSTRAINT IF EXISTS bookmarks_title_check,
  DROP CONSTRAINT IF EXISTS bookmarks_screenshot_path_check,
  DROP CONSTRAINT IF EXISTS bookmarks_summary_check,
  DROP CONSTRAINT IF EXISTS bookmarks_note_check,
  ADD CONSTRAINT bookmarks_url_check CHECK (char_length(url) <= 2048),
  ADD CONSTRAINT bookmarks_title_check CHECK (char_length(title) <= 255),
  ADD CONSTRAINT bookmarks_screenshot_path_check CHECK (screenshot_path IS NULL OR char_length(screenshot_path) <= 1024),
  ADD CONSTRAINT bookmarks_summary_check CHECK (char_length(summary) <= 1000),
  ADD CONSTRAINT bookmarks_note_check CHECK (char_length(note) <= 2000);

DROP TRIGGER IF EXISTS bookmarks_updated_at ON bookmarks;
CREATE TRIGGER bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(user_id, created_at DESC);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookmarks" ON bookmarks;
CREATE POLICY "select_own_bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookmarks" ON bookmarks;
CREATE POLICY "insert_own_bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bookmarks" ON bookmarks;
CREATE POLICY "update_own_bookmarks" ON bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookmarks" ON bookmarks;
CREATE POLICY "delete_own_bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL DEFAULT '',
  email        TEXT        NOT NULL DEFAULT '',
  phone        TEXT        NOT NULL DEFAULT '',
  avatar_path  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_name_check,
  DROP CONSTRAINT IF EXISTS profiles_email_check,
  DROP CONSTRAINT IF EXISTS profiles_phone_check,
  DROP CONSTRAINT IF EXISTS profiles_avatar_path_check,
  ADD CONSTRAINT profiles_name_check CHECK (char_length(name) <= 120),
  ADD CONSTRAINT profiles_email_check CHECK (char_length(email) <= 255),
  ADD CONSTRAINT profiles_phone_check CHECK (char_length(phone) <= 40),
  ADD CONSTRAINT profiles_avatar_path_check CHECK (avatar_path IS NULL OR char_length(avatar_path) <= 1024);

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Canvas sections
-- ============================================================

CREATE TABLE IF NOT EXISTS canvas_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL DEFAULT 'Section',
  x           REAL        NOT NULL DEFAULT 60,
  y           REAL        NOT NULL DEFAULT 60,
  width       REAL        NOT NULL DEFAULT 420,
  height      REAL        NOT NULL DEFAULT 300,
  color       TEXT        NOT NULL DEFAULT '#FFFFFF',
  z_index     INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE canvas_sections
  DROP CONSTRAINT IF EXISTS canvas_sections_label_check,
  DROP CONSTRAINT IF EXISTS canvas_sections_color_check,
  DROP CONSTRAINT IF EXISTS canvas_sections_size_check,
  ADD CONSTRAINT canvas_sections_label_check CHECK (char_length(label) BETWEEN 1 AND 120),
  ADD CONSTRAINT canvas_sections_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT canvas_sections_size_check CHECK (width >= 180 AND height >= 120);

DROP TRIGGER IF EXISTS canvas_sections_updated_at ON canvas_sections;
CREATE TRIGGER canvas_sections_updated_at
  BEFORE UPDATE ON canvas_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sections_user_id ON canvas_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_user_created ON canvas_sections(user_id, created_at DESC);

ALTER TABLE canvas_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sections" ON canvas_sections;
CREATE POLICY "select_own_sections" ON canvas_sections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sections" ON canvas_sections;
CREATE POLICY "insert_own_sections" ON canvas_sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sections" ON canvas_sections;
CREATE POLICY "update_own_sections" ON canvas_sections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sections" ON canvas_sections;
CREATE POLICY "delete_own_sections" ON canvas_sections
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Canvas notes
-- ============================================================

CREATE TABLE IF NOT EXISTS canvas_notes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id    UUID        REFERENCES canvas_sections(id) ON DELETE SET NULL,
  type          TEXT        NOT NULL,
  content       TEXT        NOT NULL DEFAULT '',
  media_source  TEXT,
  media_path    TEXT,
  media_mime    TEXT,
  media_name    TEXT,
  x             REAL        NOT NULL DEFAULT 100,
  y             REAL        NOT NULL DEFAULT 100,
  width         REAL        NOT NULL DEFAULT 240,
  height        REAL        NOT NULL DEFAULT 180,
  color         TEXT        NOT NULL DEFAULT '#FFF9C4',
  z_index       INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE canvas_notes
  ADD COLUMN IF NOT EXISTS section_id UUID,
  ADD COLUMN IF NOT EXISTS media_source TEXT,
  ADD COLUMN IF NOT EXISTS media_path TEXT,
  ADD COLUMN IF NOT EXISTS media_mime TEXT,
  ADD COLUMN IF NOT EXISTS media_name TEXT;

ALTER TABLE canvas_notes
  DROP CONSTRAINT IF EXISTS canvas_notes_section_id_fkey,
  DROP CONSTRAINT IF EXISTS canvas_notes_type_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_source_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_path_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_mime_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_name_check,
  ADD CONSTRAINT canvas_notes_section_id_fkey FOREIGN KEY (section_id) REFERENCES canvas_sections(id) ON DELETE SET NULL,
  ADD CONSTRAINT canvas_notes_type_check CHECK (type IN ('text','link','image','video','social')),
  ADD CONSTRAINT canvas_notes_media_source_check CHECK (media_source IS NULL OR media_source IN ('url','upload')),
  ADD CONSTRAINT canvas_notes_media_path_check CHECK (media_path IS NULL OR char_length(media_path) <= 1024),
  ADD CONSTRAINT canvas_notes_media_mime_check CHECK (media_mime IS NULL OR char_length(media_mime) <= 255),
  ADD CONSTRAINT canvas_notes_media_name_check CHECK (media_name IS NULL OR char_length(media_name) <= 255);

DROP TRIGGER IF EXISTS canvas_notes_updated_at ON canvas_notes;
CREATE TRIGGER canvas_notes_updated_at
  BEFORE UPDATE ON canvas_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON canvas_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON canvas_notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_section_id ON canvas_notes(section_id);

ALTER TABLE canvas_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON canvas_notes;
CREATE POLICY "select_own_notes" ON canvas_notes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON canvas_notes;
CREATE POLICY "insert_own_notes" ON canvas_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON canvas_notes;
CREATE POLICY "update_own_notes" ON canvas_notes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON canvas_notes;
CREATE POLICY "delete_own_notes" ON canvas_notes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Storage buckets and policies
-- ============================================================

-- Public bookmark screenshots cached from Microlink. Writes are restricted to each user's own folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('bookmark-screenshots', 'bookmark-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "bookmark_screenshots_select_public" ON storage.objects;
CREATE POLICY "bookmark_screenshots_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'bookmark-screenshots');

DROP POLICY IF EXISTS "bookmark_screenshots_insert_own" ON storage.objects;
CREATE POLICY "bookmark_screenshots_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'bookmark-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "bookmark_screenshots_update_own" ON storage.objects;
CREATE POLICY "bookmark_screenshots_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'bookmark-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'bookmark-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "bookmark_screenshots_delete_own" ON storage.objects;
CREATE POLICY "bookmark_screenshots_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'bookmark-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public profile avatars. Writes are restricted to each user's own folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "profile_avatars_select_public" ON storage.objects;
CREATE POLICY "profile_avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "profile_avatars_insert_own" ON storage.objects;
CREATE POLICY "profile_avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "profile_avatars_update_own" ON storage.objects;
CREATE POLICY "profile_avatars_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "profile_avatars_delete_own" ON storage.objects;
CREATE POLICY "profile_avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Private canvas media uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-media', 'canvas-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "canvas_media_select_own" ON storage.objects;
CREATE POLICY "canvas_media_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'canvas-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "canvas_media_insert_own" ON storage.objects;
CREATE POLICY "canvas_media_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'canvas-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "canvas_media_update_own" ON storage.objects;
CREATE POLICY "canvas_media_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'canvas-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "canvas_media_delete_own" ON storage.objects;
CREATE POLICY "canvas_media_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'canvas-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Force Supabase/PostgREST to refresh its schema cache after new columns,
-- tables, constraints, and policies are created.
NOTIFY pgrst, 'reload schema';
