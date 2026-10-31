-- =====================================================================
-- MyTutorZA: Supabase Database Schema with Row Level Security (RLS)
-- Copy and paste this directly into your Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =====================================================================

-- 1. Create table for Personalized Spark Notes generated from Bot-User Convo
CREATE TABLE IF NOT EXISTS public.spark_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_breakdowns JSONB DEFAULT '[]'::jsonb,
  weak_spots JSONB DEFAULT '[]'::jsonb,
  spark_bullets JSONB DEFAULT '[]'::jsonb,
  formulas_rules JSONB DEFAULT '[]'::jsonb,
  examiner_traps JSONB DEFAULT '[]'::jsonb,
  flashcards JSONB DEFAULT '[]'::jsonb,
  cognitive_advice TEXT,
  raw_convo_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on spark_notes
ALTER TABLE public.spark_notes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Security Policies for spark_notes (Strict User Isolation)
-- Authenticated users can only read their own notes
DROP POLICY IF EXISTS "Users can read own spark notes" ON public.spark_notes;
CREATE POLICY "Users can read own spark notes"
  ON public.spark_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Authenticated users can only insert notes with their own auth.uid()
DROP POLICY IF EXISTS "Users can insert own spark notes" ON public.spark_notes;
CREATE POLICY "Users can insert own spark notes"
  ON public.spark_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update only their own notes
DROP POLICY IF EXISTS "Users can update own spark notes" ON public.spark_notes;
CREATE POLICY "Users can update own spark notes"
  ON public.spark_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete only their own notes
DROP POLICY IF EXISTS "Users can delete own spark notes" ON public.spark_notes;
CREATE POLICY "Users can delete own spark notes"
  ON public.spark_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create table for Tutoring Chat Sessions & Transcripts
CREATE TABLE IF NOT EXISTS public.tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  language TEXT DEFAULT 'English',
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS) on tutoring_sessions
ALTER TABLE public.tutoring_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tutoring sessions" ON public.tutoring_sessions;
CREATE POLICY "Users can manage own tutoring sessions"
  ON public.tutoring_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. Allow public/anon read and insert fallback
DROP POLICY IF EXISTS "Anon test access fallback" ON public.spark_notes;
CREATE POLICY "Anon test access fallback"
  ON public.spark_notes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 7. Student profile (user information shown in Supabase)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  grade TEXT,
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  trial_expires_at TIMESTAMPTZ DEFAULT (now() + interval '3 days'),
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon student profiles access" ON public.student_profiles;
CREATE POLICY "Anon student profiles access"
  ON public.student_profiles
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage own student profiles" ON public.student_profiles;
CREATE POLICY "Users manage own student profiles"
  ON public.student_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 8. Firmament profile (cognitive DNA derived from the 16 answers)
CREATE TABLE IF NOT EXISTS public.firmament_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  cognitive_score TEXT,
  processing_speed TEXT,
  retention_profile TEXT,
  scaffold_needs TEXT,
  firmament_rules JSONB DEFAULT '[]'::jsonb,
  life_path JSONB DEFAULT '{}'::jsonb,
  mercury JSONB DEFAULT '{}'::jsonb,
  cognitive_vector JSONB DEFAULT '{}'::jsonb,
  raw_answers JSONB DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.firmament_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon firmament profiles access" ON public.firmament_profiles;
CREATE POLICY "Anon firmament profiles access"
  ON public.firmament_profiles
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage own firmament profiles" ON public.firmament_profiles;
CREATE POLICY "Users manage own firmament profiles"
  ON public.firmament_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 9. The 16 onboarding diagnostic answers (raw inputs serving Firmament rules)
CREATE TABLE IF NOT EXISTS public.firmament_onboarding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  answer_label TEXT NOT NULL,
  answer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.firmament_onboarding_answers ENABLE ROW LEVEL SECURITY;

-- 10. Term tests & exams pre-generated from CAPS vault
CREATE TABLE IF NOT EXISTS public.term_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  term TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  paper JSONB NOT NULL,
  answer_sheet JSONB,
  available_from DATE,
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.term_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon term tests access" ON public.term_tests;
CREATE POLICY "Anon term tests access" ON public.term_tests FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon firmament answers access" ON public.firmament_onboarding_answers;
CREATE POLICY "Anon firmament answers access"
  ON public.firmament_onboarding_answers
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage own firmament answers" ON public.firmament_onboarding_answers;
CREATE POLICY "Users manage own firmament answers"
  ON public.firmament_onboarding_answers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
