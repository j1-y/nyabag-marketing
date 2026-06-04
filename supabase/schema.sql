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
-- Early access signups
-- ============================================================

CREATE TABLE IF NOT EXISTS early_access_signups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'landing',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE early_access_signups
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'landing',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE early_access_signups
  DROP CONSTRAINT IF EXISTS early_access_signups_email_check,
  DROP CONSTRAINT IF EXISTS early_access_signups_source_check,
  ADD CONSTRAINT early_access_signups_email_check CHECK (char_length(email) <= 255),
  ADD CONSTRAINT early_access_signups_source_check CHECK (char_length(source) <= 80);

CREATE UNIQUE INDEX IF NOT EXISTS idx_early_access_signups_email_lower
  ON early_access_signups (lower(email));

DROP TRIGGER IF EXISTS early_access_signups_updated_at ON early_access_signups;
CREATE TRIGGER early_access_signups_updated_at
  BEFORE UPDATE ON early_access_signups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE early_access_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_early_access_signups" ON early_access_signups;
CREATE POLICY "insert_early_access_signups" ON early_access_signups
  FOR INSERT WITH CHECK (true);

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
  content_json  JSONB,
  content_format TEXT       NOT NULL DEFAULT 'plain',
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
  ADD COLUMN IF NOT EXISTS media_name TEXT,
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'plain';

ALTER TABLE canvas_notes
  DROP CONSTRAINT IF EXISTS canvas_notes_section_id_fkey,
  DROP CONSTRAINT IF EXISTS canvas_notes_type_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_content_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_content_format_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_source_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_path_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_mime_check,
  DROP CONSTRAINT IF EXISTS canvas_notes_media_name_check,
  ADD CONSTRAINT canvas_notes_section_id_fkey FOREIGN KEY (section_id) REFERENCES canvas_sections(id) ON DELETE SET NULL,
  ADD CONSTRAINT canvas_notes_type_check CHECK (type IN ('text','text_frame','link','image','video','social')),
  ADD CONSTRAINT canvas_notes_content_check CHECK (char_length(content) <= 12000),
  ADD CONSTRAINT canvas_notes_content_format_check CHECK (content_format IN ('plain', 'rich')),
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

-- ============================================================
-- Admin dashboard
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE admin_users.user_id = is_admin.user_id
  );
$$;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check,
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin'));

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_admins" ON admin_users;
CREATE POLICY "admin_users_select_admins" ON admin_users
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_users_insert_admins" ON admin_users;
CREATE POLICY "admin_users_insert_admins" ON admin_users
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_users_update_admins" ON admin_users;
CREATE POLICY "admin_users_update_admins" ON admin_users
  FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_users_delete_admins" ON admin_users;
CREATE POLICY "admin_users_delete_admins" ON admin_users
  FOR DELETE USING (is_admin(auth.uid()));

ALTER TABLE early_access_signups
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS current_tool TEXT,
  ADD COLUMN IF NOT EXISTS pain_point TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

ALTER TABLE early_access_signups
  DROP CONSTRAINT IF EXISTS early_access_signups_name_check,
  DROP CONSTRAINT IF EXISTS early_access_signups_role_check,
  DROP CONSTRAINT IF EXISTS early_access_signups_current_tool_check,
  DROP CONSTRAINT IF EXISTS early_access_signups_pain_point_check,
  DROP CONSTRAINT IF EXISTS early_access_signups_status_check,
  DROP CONSTRAINT IF EXISTS early_access_signups_notes_check,
  ADD CONSTRAINT early_access_signups_name_check CHECK (name IS NULL OR char_length(name) <= 120),
  ADD CONSTRAINT early_access_signups_role_check CHECK (role IS NULL OR char_length(role) <= 120),
  ADD CONSTRAINT early_access_signups_current_tool_check CHECK (current_tool IS NULL OR char_length(current_tool) <= 160),
  ADD CONSTRAINT early_access_signups_pain_point_check CHECK (pain_point IS NULL OR char_length(pain_point) <= 2000),
  ADD CONSTRAINT early_access_signups_status_check CHECK (status IN ('new', 'contacted', 'replied', 'invited', 'onboarded', 'not_interested')),
  ADD CONSTRAINT early_access_signups_notes_check CHECK (notes IS NULL OR char_length(notes) <= 2000);

DROP POLICY IF EXISTS "insert_early_access_signups" ON early_access_signups;

DROP POLICY IF EXISTS "early_access_insert_public" ON early_access_signups;
CREATE POLICY "early_access_insert_public" ON early_access_signups
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "early_access_select_admins" ON early_access_signups;
CREATE POLICY "early_access_select_admins" ON early_access_signups
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "early_access_update_admins" ON early_access_signups;
CREATE POLICY "early_access_update_admins" ON early_access_signups
  FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "early_access_delete_admins" ON early_access_signups;
CREATE POLICY "early_access_delete_admins" ON early_access_signups
  FOR DELETE USING (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS email_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  subject       TEXT        NOT NULL,
  preview_text  TEXT,
  html_content  TEXT        NOT NULL,
  text_content  TEXT,
  status        TEXT        NOT NULL DEFAULT 'draft',
  created_by    UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS preview_text TEXT,
  ADD COLUMN IF NOT EXISTS text_content TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE email_templates
  DROP CONSTRAINT IF EXISTS email_templates_name_check,
  DROP CONSTRAINT IF EXISTS email_templates_slug_check,
  DROP CONSTRAINT IF EXISTS email_templates_subject_check,
  DROP CONSTRAINT IF EXISTS email_templates_status_check,
  ADD CONSTRAINT email_templates_name_check CHECK (char_length(name) BETWEEN 1 AND 120),
  ADD CONSTRAINT email_templates_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  ADD CONSTRAINT email_templates_subject_check CHECK (char_length(subject) BETWEEN 1 AND 200),
  ADD CONSTRAINT email_templates_status_check CHECK (status IN ('draft', 'active', 'archived'));

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_admins" ON email_templates;
CREATE POLICY "email_templates_admins" ON email_templates
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS email_sends (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID        REFERENCES email_templates(id),
  recipient_email   TEXT        NOT NULL,
  recipient_name    TEXT,
  subject           TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending',
  resend_email_id   TEXT,
  error_message     TEXT,
  sent_by           UUID        REFERENCES auth.users(id),
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_sends
  DROP CONSTRAINT IF EXISTS email_sends_recipient_email_check,
  DROP CONSTRAINT IF EXISTS email_sends_subject_check,
  DROP CONSTRAINT IF EXISTS email_sends_status_check,
  ADD CONSTRAINT email_sends_recipient_email_check CHECK (char_length(recipient_email) <= 255),
  ADD CONSTRAINT email_sends_subject_check CHECK (char_length(subject) BETWEEN 1 AND 200),
  ADD CONSTRAINT email_sends_status_check CHECK (status IN ('pending', 'sent', 'failed'));

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_sends_admins" ON email_sends;
CREATE POLICY "email_sends_admins" ON email_sends
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id  UUID        REFERENCES auth.users(id),
  action         TEXT        NOT NULL,
  entity_type    TEXT,
  entity_id      TEXT,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_activity_logs
  DROP CONSTRAINT IF EXISTS admin_activity_logs_action_check,
  ADD CONSTRAINT admin_activity_logs_action_check CHECK (char_length(action) BETWEEN 1 AND 160);

ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_activity_logs_admins" ON admin_activity_logs;
CREATE POLICY "admin_activity_logs_admins" ON admin_activity_logs
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO email_templates (
  name,
  slug,
  subject,
  preview_text,
  html_content,
  text_content,
  status
)
VALUES (
  'Nyabag Early Access Welcome',
  'nyabag-early-access-welcome',
  'You''re early to Nyabag',
  'Thanks for joining Nyabag Early Access. You''re one of the first people on the list.',
  '<p>Hi {{firstName}},</p><p>Thanks for joining Nyabag Early Access. You''re one of the first people on the list.</p><p>Nyabag is a design memory workspace for saving references, notes, and visual context.</p><p><a href="{{nyabagUrl}}">Visit Nyabag</a></p>',
  'Hi {{firstName}}, Thanks for joining Nyabag Early Access. You''re one of the first people on the list. Visit {{nyabagUrl}}',
  'draft'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO email_templates (
  name,
  slug,
  subject,
  preview_text,
  html_content,
  text_content,
  status
)
VALUES (
  'Template Mark 1',
  'template-mark-1',
  'Thanks for signing up!',
  'Thank you for joining the Nyabag early access list.',
  $template_mark_1$
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Thanks for signing up!</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#7b7b7b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f1;margin:0;padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:720px;max-width:720px;margin:0 auto;">
            <tr>
              <td style="padding:0 0 40px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="left" valign="middle">
                      <img src="{{nyabagUrl}}/nyabag-logo-email.png" width="204" alt="Nyabag" style="display:block;width:204px;height:auto;border:0;">
                    </td>
                    <td align="right" valign="middle">
                      <span style="display:inline-block;border:1.5px solid #16c82f;border-radius:8px;color:#16c82f;font-size:16px;font-weight:700;line-height:20px;padding:11px 15px;">
                        <span style="font-size:19px;vertical-align:-1px;">&#128274;</span>
                        <span style="display:inline-block;padding-left:8px;">EARLY ACCESS</span>
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #cfcfcf;border-radius:14px;background:#ffffff;overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="background-color:#202020;background-image:radial-gradient(circle,#3c3c3c 1.5px,transparent 1.5px);background-size:24px 24px;padding:60px 48px 0 48px;">
                      <h1 style="margin:0 0 54px 0;color:#e5e5e5;font-size:48px;line-height:1.1;font-weight:800;letter-spacing:-0.5px;">Thanks for signing up!</h1>
                      <img src="{{nyabagUrl}}/template-mark-1-dashboard.png" width="626" alt="Nyabag dashboard preview" style="display:block;width:626px;max-width:100%;height:auto;border:0;">
                      <img src="{{nyabagUrl}}/template-mark-1-dashboard.png" width="626" alt="Nyabag dashboard preview" style="display:block;width:626px;max-width:100%;height:auto;border:0;">
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 29px 26px 29px;">
                      <div style="font-size:27px;line-height:1.5;font-weight:400;color:#7b7b7b;">
                        <p style="margin:0 0 40px 0;">Hey,</p>
                        <p style="margin:0 0 42px 0;">Thank you for joining the Nyabag early access list.<br>I’m Jayanth, the guy behind Nyabag. I’m building it from a problem I kept running into myself: saving design inspiration everywhere, then never being able to find the right reference when I actually needed it.</p>
                        <p style="margin:0 0 42px 0;">Browser bookmarks, screenshots, WhatsApp links, Telegram saves, Notion dumps, random folders, the whole chaos buffet.</p>
                        <p style="margin:0 0 42px 0;">Nyabag is meant to become a second memory for design. A calmer place to collect visual references, websites, notes, and ideas, then retrieve them naturally when you’re designing.</p>
                        <p style="margin:0 0 42px 0;">You’ll be one of the first people I invite when the early version is ready.</p>
                        <p style="margin:0 0 42px 0;">Before that, I’d love to know:</p>
                        <p style="margin:0 0 42px 0;">What do you currently use to save design inspiration? And what frustrates you the most about that workflow?</p>
                        <p style="margin:0 0 42px 0;">A short reply is more than enough.</p>
                        <p style="margin:0;">Thanks again,<br>Jayanth</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
$template_mark_1$,
  'Hey,

Thank you for joining the Nyabag early access list.
I’m Jayanth, the guy behind Nyabag. I’m building it from a problem I kept running into myself: saving design inspiration everywhere, then never being able to find the right reference when I actually needed it.

Browser bookmarks, screenshots, WhatsApp links, Telegram saves, Notion dumps, random folders, the whole chaos buffet.

Nyabag is meant to become a second memory for design. A calmer place to collect visual references, websites, notes, and ideas, then retrieve them naturally when you’re designing.

You’ll be one of the first people I invite when the early version is ready.

Before that, I’d love to know:

What do you currently use to save design inspiration? And what frustrates you the most about that workflow?

A short reply is more than enough.

Thanks again,
Jayanth',
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  preview_text = EXCLUDED.preview_text,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Force Supabase/PostgREST to refresh its schema cache after new columns,
-- tables, constraints, and policies are created.
NOTIFY pgrst, 'reload schema';
