-- ============================================================================
-- MyTutorZA — admin flag for the Lulu Lavender test profile (idempotent)
-- ============================================================================
-- The server also recognises the name directly, so the app works even before
-- this migration is applied. Running it persists the admin flag in the DB.
-- ============================================================================

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE public.student_profiles
  SET is_admin = true
  WHERE lower(trim(coalesce(full_name, ''))) = 'lulu lavender'
     OR lower(trim(coalesce(email, ''))) = 'lulu lavender';
