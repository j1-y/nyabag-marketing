-- ============================================================
-- Nyabag — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID helpers
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Bookmarks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL CHECK (char_length(url) <= 2048),
  title       TEXT        NOT NULL CHECK (char_length(title) <= 255),
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  palette     TEXT[]      NOT NULL DEFAULT '{}',
  fonts       TEXT[]      NOT NULL DEFAULT '{}',
  note        TEXT        NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookmarks_updated_at ON bookmarks;
CREATE TRIGGER bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags    ON bookmarks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(user_id, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rows — enforced at DB level
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

-- ── Canvas Notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canvas_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('text','link','image','video')),
  content     TEXT        NOT NULL DEFAULT '',
  media_source TEXT       CHECK (media_source IN ('url','upload')),
  media_path   TEXT       CHECK (media_path IS NULL OR char_length(media_path) <= 1024),
  media_mime   TEXT       CHECK (media_mime IS NULL OR char_length(media_mime) <= 255),
  media_name   TEXT       CHECK (media_name IS NULL OR char_length(media_name) <= 255),
  x           REAL        NOT NULL DEFAULT 100,
  y           REAL        NOT NULL DEFAULT 100,
  width       REAL        NOT NULL DEFAULT 240,
  height      REAL        NOT NULL DEFAULT 180,
  color       TEXT        NOT NULL DEFAULT '#FFF9C4',
  z_index     INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS canvas_notes_updated_at ON canvas_notes;
CREATE TRIGGER canvas_notes_updated_at
  BEFORE UPDATE ON canvas_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_notes_user_id      ON canvas_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON canvas_notes(user_id, created_at DESC);

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

-- Add media metadata to existing installs
ALTER TABLE canvas_notes
  ADD COLUMN IF NOT EXISTS media_source TEXT CHECK (media_source IN ('url','upload')),
  ADD COLUMN IF NOT EXISTS media_path   TEXT CHECK (media_path IS NULL OR char_length(media_path) <= 1024),
  ADD COLUMN IF NOT EXISTS media_mime   TEXT CHECK (media_mime IS NULL OR char_length(media_mime) <= 255),
  ADD COLUMN IF NOT EXISTS media_name   TEXT CHECK (media_name IS NULL OR char_length(media_name) <= 255);

-- Private canvas media uploads
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
