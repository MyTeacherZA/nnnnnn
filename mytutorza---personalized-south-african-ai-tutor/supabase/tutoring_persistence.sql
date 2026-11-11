-- ============================================================================
-- MyTutorZA — Tutoring persistence migration (idempotent)
-- ============================================================================
-- Verified against production on 2026-11-11: `tutoring_sessions` exists but
-- cannot hold the session lock / ingested source, and `study_sessions` and
-- `tutoring_sources` do not exist at all. Running this script brings the
-- database in line with the code.
--
-- Safe to run multiple times. Apply it to the Supabase project pointed at by
-- SUPABASE_URL (SQL Editor -> New query -> paste -> Run).
-- ============================================================================

-- 1. tutoring_sessions: session lock + source link --------------------------
ALTER TABLE public.tutoring_sessions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.tutoring_sessions ADD COLUMN IF NOT EXISTS pdf_name TEXT;
ALTER TABLE public.tutoring_sessions ADD COLUMN IF NOT EXISTS pdf_text TEXT;
ALTER TABLE public.tutoring_sessions ADD COLUMN IF NOT EXISTS pdf_source_id UUID;

-- 2. tutoring_sources: ingested textbook / PDF / text for RAG ----------------
CREATE TABLE IF NOT EXISTS public.tutoring_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  topic TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  chars INTEGER DEFAULT 0,
  table_of_contents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tutoring_sources_user_hash_idx
  ON public.tutoring_sources (user_id, content_hash);

ALTER TABLE public.tutoring_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tutoring sources" ON public.tutoring_sources;
CREATE POLICY "Users can manage own tutoring sources"
  ON public.tutoring_sources
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. match the source id to its session when present -------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tutoring_sessions_source_id_fkey'
      AND table_name = 'tutoring_sessions'
  ) THEN
    ALTER TABLE public.tutoring_sessions
      ADD CONSTRAINT tutoring_sessions_source_id_fkey
      FOREIGN KEY (pdf_source_id) REFERENCES public.tutoring_sources (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. study_sessions: missing RLS-managed progress store ----------------------
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  term TEXT,
  topic TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  firmament_snapshot JSONB DEFAULT '{}'::jsonb,
  roadmap_snapshot JSONB DEFAULT '{}'::jsonb,
  curriculum_snapshot JSONB DEFAULT '{}'::jsonb,
  study_pack JSONB DEFAULT '{}'::jsonb,
  quiz JSONB DEFAULT '[]'::jsonb,
  quiz_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_sessions_user_subject_idx
  ON public.study_sessions (user_id, subject, updated_at DESC);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own study sessions" ON public.study_sessions;
CREATE POLICY "Users can manage own study sessions"
  ON public.study_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5. keep RLS policies consistent for tutoring_sessions ----------------------
ALTER TABLE public.tutoring_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tutoring sessions" ON public.tutoring_sessions;
CREATE POLICY "Users can manage own tutoring sessions"
  ON public.tutoring_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- APPLICATION NOTE (2026-11-11)
-- Until step 3 is applied, the server automatically falls back to storing
-- `pdf_text` as a short inline excerpt and keeps inline source text for the
-- current turn only, so nothing breaks — but full textbook RAG requires this
-- table to exist.
-- ============================================================================
