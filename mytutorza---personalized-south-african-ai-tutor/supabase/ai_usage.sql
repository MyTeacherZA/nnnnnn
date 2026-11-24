-- ============================================================================
-- MyTutorZA — AI usage metering migration (idempotent)
-- ============================================================================
-- Creates the `ai_usage` ledger that backs:
--   * GET /api/ai/usage            → per-user usage summary + monthly quota
--   * AI_QUOTA_EXCEEDED 402s      → client opens the subscription modal
--
-- Safe to run multiple times. Apply it to the Supabase project pointed at by
-- SUPABASE_URL (SQL Editor -> New query -> paste -> Run).

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  agent TEXT NOT NULL DEFAULT 'tutoring',
  provider TEXT NOT NULL DEFAULT 'unconfigured',
  model TEXT NOT NULL DEFAULT 'unknown',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx
  ON public.ai_usage (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_agent_created_idx
  ON public.ai_usage (agent, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai usage" ON public.ai_usage;
CREATE POLICY "Users can view own ai usage"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service-role writes bypass RLS (server-side metering only).
DROP POLICY IF EXISTS "Service role manages ai usage" ON public.ai_usage;
CREATE POLICY "Service role manages ai usage"
  ON public.ai_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
