-- ============================================================================
-- MyTutorZA — Referrals schema (idempotent)
-- ============================================================================
-- A referral code belongs to one learner. When a *different* learner uses that
-- code at their first successful paid subscription, a row is recorded against
-- the code owner. On the 30th such paid first-month conversion the owner is
-- owed one free month (provider: 'referral_bonus').
--
-- Safe to re-run. Apply in Supabase SQL Editor AFTER tutoring_persistence.sql.
-- ============================================================================

-- 1. Referral codes: one per learner (optional until someone requests one) ----
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes (code);

-- 2. Referral uses: one row per paid first-month conversion via a code ---------
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  used_by_user_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One owner per new subscription: a user can only be counted once.
  UNIQUE (used_by_user_id)
);

-- 1b. Student profiles may carry the code used at signup so we can credit the referrer later.
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE INDEX IF NOT EXISTS referral_uses_referrer_idx ON public.referral_uses (referrer_user_id, subscribed_at DESC);

-- 3. Bonus grants: one row per free month paid out via referrals --------------
CREATE TABLE IF NOT EXISTS public.referral_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  referral_count_at_grant INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'referral-30',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reason)
);

-- 4. RLS ----------------------------------------------------------------------
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own referral code" ON public.referral_codes;
CREATE POLICY "Users can read own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own referral uses" ON public.referral_uses;
CREATE POLICY "Users can read own referral uses"
  ON public.referral_uses FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Users can read own referral grants" ON public.referral_grants;
CREATE POLICY "Users can read own referral grants"
  ON public.referral_grants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Function the service role/policies can call to atomically credit the 30th
-- referral. Returns true if a bonus was granted this call.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.credit_referral_bonus(_referrer UUID, _referred UUID, _code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_already BOOLEAN;
BEGIN
  -- One referral counts per referred user ever.
  INSERT INTO public.referral_uses (referrer_user_id, used_by_user_id, code)
  VALUES (_referrer, _referred, _code)
  ON CONFLICT (used_by_user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.referral_uses
  WHERE referrer_user_id = _referrer;

  SELECT EXISTS(
    SELECT 1 FROM public.referral_grants WHERE user_id = _referrer AND reason = 'referral-30'
  ) INTO v_already;

  IF v_count >= 30 AND NOT v_already THEN
    INSERT INTO public.referral_grants (user_id, referral_count_at_grant, reason)
    VALUES (_referrer, v_count, 'referral-30');

    -- The bonus is not auto-applied here (no access to tokens) — the server
    -- layer checks referral_grants and extends the subscription as a bonus.
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
