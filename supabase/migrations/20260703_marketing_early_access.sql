CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.early_access_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT early_access_signups_email_check CHECK (char_length(email) BETWEEN 3 AND 255),
  CONSTRAINT early_access_signups_source_check CHECK (char_length(source) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_early_access_signups_email_lower
  ON public.early_access_signups (lower(email));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS early_access_signups_updated_at ON public.early_access_signups;
CREATE TRIGGER early_access_signups_updated_at
  BEFORE UPDATE ON public.early_access_signups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.early_access_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "early_access_no_public_read" ON public.early_access_signups;
CREATE POLICY "early_access_no_public_read" ON public.early_access_signups
  FOR SELECT
  USING (false);
