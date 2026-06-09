-- ─────────────────────────────────────────────────────────────────────────────
-- Creates the `captures` table to track images saved by the browser extension.
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS captures (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path         text NOT NULL,                -- storage path: {userId}/{uuid}.jpg
  capture_url  text,                         -- signed URL (expires after 1 year)
  page_url     text,                         -- source page URL
  page_title   text,                         -- source page title
  original_size   integer,                   -- raw bytes before compression
  compressed_size integer,                   -- bytes after sharp compression
  source       text DEFAULT 'extension',     -- 'extension-visible' | 'extension-scroll'
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for per-user listing newest first
CREATE INDEX IF NOT EXISTS captures_user_created
  ON captures (user_id, created_at DESC);

-- Row-level security
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own captures"
  ON captures FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
