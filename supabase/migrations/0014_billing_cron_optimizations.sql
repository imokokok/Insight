-- Optimize billing cron operations: add targeted indexes and move bulk
-- UPDATEs into server-side RPCs to avoid serializing large RETURNING sets
-- over the network and reduce the chance of Vercel 504 timeouts.

-- ============================================================================
-- 1. Indexes
-- ============================================================================

-- Speeds up downgradeExpiredTrials(): trial_ends_at < now() AND plan = 'pro'.
-- Partial index is kept small because only trial keys have trial_ends_at set.
CREATE INDEX IF NOT EXISTS idx_api_keys_plan_trial_ends_at
  ON public.api_keys (plan, trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- Speeds up resetMonthlyQuota(): plan != 'enterprise'.
-- Enterprise keys are a small subset; excluding them keeps the index compact.
CREATE INDEX IF NOT EXISTS idx_api_keys_non_enterprise_plan
  ON public.api_keys (plan)
  WHERE plan != 'enterprise';

-- ============================================================================
-- 2. RPC: downgrade expired Pro trials back to Free
-- ============================================================================

CREATE OR REPLACE FUNCTION public.downgrade_expired_trials()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.api_keys
    SET plan = 'free',
        rate_limit = 5,
        trial_ends_at = NULL,
        updated_at = now()
    WHERE trial_ends_at IS NOT NULL
      AND trial_ends_at < now()
      AND plan = 'pro'
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

ALTER FUNCTION public.downgrade_expired_trials() OWNER TO "postgres";

COMMENT ON FUNCTION public.downgrade_expired_trials() IS
  'Downgrades API keys whose Pro trial has expired back to the Free plan. Called daily by the billing cron.';

-- ============================================================================
-- 3. RPC: reset monthly quota counters on the 1st of each month
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_monthly_quota()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_next_reset timestamp with time zone;
BEGIN
  v_next_reset := now() + interval '1 month';

  WITH updated AS (
    UPDATE public.api_keys
    SET monthly_quota_used = 0,
        quota_reset_at = v_next_reset,
        updated_at = now()
    WHERE plan != 'enterprise'
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

ALTER FUNCTION public.reset_monthly_quota() OWNER TO "postgres";

COMMENT ON FUNCTION public.reset_monthly_quota() IS
  'Resets monthly_quota_used to 0 for all non-enterprise keys on the 1st of each month. Called by the billing cron.';
