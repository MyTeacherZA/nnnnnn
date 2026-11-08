-- ============================================================================
-- MyTutorZA — Supabase schema
-- ----------------------------------------------------------------------------
-- Paste this whole file into:  Supabase Dashboard → SQL Editor → Run
-- It is IDEMPOTENT: safe to run again on an existing project.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. LEARNER PROFILES  (written by POST /api/profile/sync)
-- ============================================================================
create table if not exists public.student_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,
  full_name           text,
  email               text,
  phone               text,
  date_of_birth       date,
  grade               text,
  country             text,
  nation              text,
  state               text,
  subjects            jsonb not null default '[]'::jsonb,
  trial_started_at    timestamptz default now(),
  trial_expires_at    timestamptz default (now() + interval '3 days'),
  subscription_status text default 'trial',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Add missing columns on older installs (no-ops when they already exist)
alter table public.student_profiles add column if not exists user_id uuid;
alter table public.student_profiles add column if not exists full_name text;
alter table public.student_profiles add column if not exists email text;
alter table public.student_profiles add column if not exists phone text;
alter table public.student_profiles add column if not exists date_of_birth date;
alter table public.student_profiles add column if not exists grade text;
alter table public.student_profiles add column if not exists country text;
alter table public.student_profiles add column if not exists nation text;
alter table public.student_profiles add column if not exists state text;
alter table public.student_profiles add column if not exists subjects jsonb not null default '[]'::jsonb;
alter table public.student_profiles add column if not exists trial_started_at timestamptz default now();
alter table public.student_profiles add column if not exists trial_expires_at timestamptz default (now() + interval '3 days');
alter table public.student_profiles add column if not exists subscription_status text default 'trial';
alter table public.student_profiles add column if not exists created_at timestamptz not null default now();
alter table public.student_profiles add column if not exists updated_at timestamptz not null default now();

-- One row per learner email (case-insensitive) so profile saves never duplicate.
create unique index if not exists student_profiles_email_unique
  on public.student_profiles (lower(email))
  where email is not null;

create index if not exists student_profiles_user_id_idx on public.student_profiles (user_id);

-- ============================================================================
-- 2. FIRMAMENT PROFILE  (one snapshot per learner, replaced on each save)
-- ============================================================================
create table if not exists public.firmament_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.student_profiles(id) on delete cascade,
  cognitive_score   text,
  processing_speed  text,
  retention_profile text,
  scaffold_needs    text,
  firmament_rules   jsonb not null default '[]'::jsonb,
  life_path         jsonb not null default '{}'::jsonb,
  mercury           jsonb not null default '{}'::jsonb,
  cognitive_vector  jsonb not null default '{}'::jsonb,
  raw_answers       jsonb not null default '{}'::jsonb,
  calculated_at     timestamptz default now(),
  created_at        timestamptz not null default now()
);

create index if not exists firmament_profiles_user_id_idx on public.firmament_profiles (user_id);

-- ============================================================================
-- 3. THE 24 ONBOARDING ANSWERS (raw diagnostic inputs)
-- ============================================================================
create table if not exists public.firmament_onboarding_answers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.student_profiles(id) on delete cascade,
  question_id  integer not null,
  answer_label text not null,
  answer_text  text,
  created_at   timestamptz not null default now()
);

create index if not exists firmament_answers_user_id_idx on public.firmament_onboarding_answers (user_id);

-- ============================================================================
-- 4. SPARK NOTES (generated from tutoring conversations)
-- ============================================================================
create table if not exists public.spark_notes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid default auth.uid(),
  subject          text not null,
  grade            text not null,
  topic            text not null,
  title            text not null,
  summary          text not null,
  key_breakdowns   jsonb not null default '[]'::jsonb,
  weak_spots       jsonb not null default '[]'::jsonb,
  spark_bullets    jsonb not null default '[]'::jsonb,
  formulas_rules   jsonb not null default '[]'::jsonb,
  examiner_traps   jsonb not null default '[]'::jsonb,
  flashcards       jsonb not null default '[]'::jsonb,
  cognitive_advice text,
  raw_convo_count  integer default 0,
  created_at       timestamptz not null default now()
);

create index if not exists spark_notes_user_id_idx on public.spark_notes (user_id);

-- ============================================================================
-- 5. TUTORING SESSIONS (chat transcripts)
-- ============================================================================
create table if not exists public.tutoring_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid(),
  subject    text not null,
  grade      text not null,
  language   text default 'English',
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutoring_sessions_user_id_idx on public.tutoring_sessions (user_id);

-- ============================================================================
-- 6. TERM TESTS (pre-generated papers, public read)
-- ============================================================================
create table if not exists public.term_tests (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  grade            text not null,
  term             text not null,
  exam_type        text not null,
  duration_minutes integer not null,
  paper            jsonb not null,
  answer_sheet     jsonb,
  available_from   date,
  generated_at     timestamptz not null default now()
);

-- ============================================================================
-- 7. SUBSCRIPTIONS (pre-wired for PayPal Subscriptions / any provider)
-- ============================================================================
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references public.student_profiles(id) on delete cascade,
  provider                  text not null default 'paypal',
  provider_subscription_id  text unique,
  plan_id                   text,
  status                    text not null default 'pending',
  current_period_end        timestamptz,
  raw_event                 jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- The app can run before Supabase Auth is switched on, so `anon` keeps access.
-- Once Supabase Auth is enabled, signed-in users are additionally scoped to
-- their own rows.
-- ============================================================================
alter table public.student_profiles             enable row level security;
alter table public.firmament_profiles            enable row level security;
alter table public.firmament_onboarding_answers  enable row level security;
alter table public.spark_notes                   enable row level security;
alter table public.tutoring_sessions             enable row level security;
alter table public.term_tests                    enable row level security;
alter table public.subscriptions                 enable row level security;

-- ---- student_profiles ------------------------------------------------------
drop policy if exists "student_profiles anon access" on public.student_profiles;
create policy "student_profiles anon access" on public.student_profiles
  for all to anon using (true) with check (true);

drop policy if exists "student_profiles own rows" on public.student_profiles;
create policy "student_profiles own rows" on public.student_profiles
  for all to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

-- ---- firmament_profiles ----------------------------------------------------
drop policy if exists "firmament_profiles anon access" on public.firmament_profiles;
create policy "firmament_profiles anon access" on public.firmament_profiles
  for all to anon using (true) with check (true);

drop policy if exists "firmament_profiles own rows" on public.firmament_profiles;
create policy "firmament_profiles own rows" on public.firmament_profiles
  for all to authenticated
  using (true) with check (true);

-- ---- firmament_onboarding_answers ------------------------------------------
drop policy if exists "firmament_answers anon access" on public.firmament_onboarding_answers;
create policy "firmament_answers anon access" on public.firmament_onboarding_answers
  for all to anon using (true) with check (true);

drop policy if exists "firmament_answers own rows" on public.firmament_onboarding_answers;
create policy "firmament_answers own rows" on public.firmament_onboarding_answers
  for all to authenticated using (true) with check (true);

-- ---- spark_notes -----------------------------------------------------------
drop policy if exists "spark_notes anon access" on public.spark_notes;
create policy "spark_notes anon access" on public.spark_notes
  for all to anon using (true) with check (true);

drop policy if exists "spark_notes own rows" on public.spark_notes;
create policy "spark_notes own rows" on public.spark_notes
  for all to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

-- ---- tutoring_sessions -----------------------------------------------------
drop policy if exists "tutoring_sessions anon access" on public.tutoring_sessions;
create policy "tutoring_sessions anon access" on public.tutoring_sessions
  for all to anon using (true) with check (true);

drop policy if exists "tutoring_sessions own rows" on public.tutoring_sessions;
create policy "tutoring_sessions own rows" on public.tutoring_sessions
  for all to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

-- ---- term_tests ------------------------------------------------------------
drop policy if exists "term_tests anon access" on public.term_tests;
create policy "term_tests anon access" on public.term_tests
  for all to anon using (true) with check (true);

drop policy if exists "term_tests authenticated read" on public.term_tests;
create policy "term_tests authenticated read" on public.term_tests
  for select to authenticated using (true);

-- ---- subscriptions ---------------------------------------------------------
drop policy if exists "subscriptions anon access" on public.subscriptions;
create policy "subscriptions anon access" on public.subscriptions
  for all to anon using (true) with check (true);

drop policy if exists "subscriptions own rows" on public.subscriptions;
create policy "subscriptions own rows" on public.subscriptions
  for all to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

-- ============================================================================
-- PRIVILEGES (Supabase grants these by default; explicit for safety)
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.student_profiles,
  public.firmament_profiles,
  public.firmament_onboarding_answers,
  public.spark_notes,
  public.tutoring_sessions,
  public.term_tests,
  public.subscriptions
  to anon, authenticated;

-- ============================================================================
-- DONE. Verify with:
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
-- ============================================================================
