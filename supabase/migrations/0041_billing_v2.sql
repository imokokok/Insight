-- 0041: Billing v2 — Codex-style paid platform (single credit-wallet model).
--
-- Collapses the three parallel counting systems (free monthly-quota counter,
-- Pro/Protocol feature tiers, credit wallet) into ONE credit-wallet model:
--
--   - NO free tier, NO trial. Plan values collapse to developer/team/enterprise.
--   - ALL features are open to any paying user. The only gate is the credit
--     wallet balance vs the per-call cost (src/lib/billing/metering.ts).
--   - Subscriptions grant a monthly credit allowance per billing cycle
--     (Developer 10K / Team 50K); extra credits are topped up on demand via
--     prepaid packs (no subscription required).
--   - Expired subscriptions downgrade keys to developer (still credit-metered,
--     any wallet balance remains usable), never to a "free" state.
--
-- Drops the legacy free-plan machinery: increment_api_key_quota,
-- reset_monthly_quota, get_daily_endpoint_usage, downgrade_expired_trials and
-- the monthly_quota_used / quota_reset_at / trial_ends_at columns.
--
-- Self-contained: depends only on 0039 (credit_wallet). 0040 may be skipped —
-- its interval-aware grant logic is folded into add_monthly_credits() v2 here,
-- and the RLS tightening is replayed idempotently.

BEGIN;

-- ============================================================================
-- 1. Rename legacy plan values → developer / team, with matching rate limits.
-- ============================================================================
-- Note: within one UPDATE all expressions see the OLD row, so the CASE on
-- "plan" below refers to the pre-rename value.
UPDATE "public"."api_keys"
   SET "plan" = CASE "plan"
         WHEN 'free'     THEN 'developer'
         WHEN 'pro'      THEN 'developer'
         WHEN 'protocol' THEN 'team'
         ELSE "plan"
       END,
       "rate_limit" = CASE "plan"
         WHEN 'protocol' THEN 60
         WHEN 'free'     THEN 30
         WHEN 'pro'      THEN 30
         ELSE "rate_limit"
       END,
       "updated_at" = now()
 WHERE "plan" IN ('free', 'pro', 'protocol');

UPDATE "public"."subscriptions"
   SET "plan" = CASE "plan"
         WHEN 'pro'      THEN 'developer'
         WHEN 'protocol' THEN 'team'
         ELSE "plan"
       END,
       "updated_at" = now()
 WHERE "plan" IN ('pro', 'protocol');

-- ============================================================================
-- 2. Rebuild plan CHECK constraints (developer / team / enterprise only).
-- ============================================================================
ALTER TABLE "public"."api_keys" DROP CONSTRAINT IF EXISTS "api_keys_plan_check";
ALTER TABLE "public"."api_keys"
  ADD CONSTRAINT "api_keys_plan_check"
  CHECK ("plan" IN ('developer', 'team', 'enterprise'));

ALTER TABLE "public"."subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_plan_check";
ALTER TABLE "public"."subscriptions"
  ADD CONSTRAINT "subscriptions_plan_check"
  CHECK ("plan" IN ('developer', 'team', 'enterprise'));

-- Developer is the base tier — align the column default with it (the API key
-- creation path sets rate_limit explicitly from plan config in code anyway).
ALTER TABLE "public"."api_keys" ALTER COLUMN "rate_limit" SET DEFAULT 30;

-- ============================================================================
-- 3. Drop legacy free-plan / trial machinery (RPCs, indexes, columns).
-- ============================================================================
DROP FUNCTION IF EXISTS "public"."downgrade_expired_trials"();
DROP FUNCTION IF EXISTS "public"."increment_api_key_quota"(uuid);
DROP FUNCTION IF EXISTS "public"."reset_monthly_quota"();
DROP FUNCTION IF EXISTS "public"."get_daily_endpoint_usage"(uuid, text);

DROP INDEX IF EXISTS "public"."idx_api_keys_plan_trial_ends_at";
DROP INDEX IF EXISTS "public"."idx_api_keys_trial_ends_at";

ALTER TABLE "public"."api_keys" DROP COLUMN IF EXISTS "trial_ends_at";
ALTER TABLE "public"."api_keys" DROP COLUMN IF EXISTS "monthly_quota_used";
ALTER TABLE "public"."api_keys" DROP COLUMN IF EXISTS "quota_reset_at";

-- ============================================================================
-- 4. add_monthly_credits v2 — grants to the single credit wallet.
--    Developer 10K / Team 50K per billing cycle, idempotent via metering key.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."add_monthly_credits"()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_grant numeric;
  v_key text;
  v_ref text;
BEGIN
  FOR r IN
    SELECT s.id, s.user_id, s.plan, s.interval
      FROM "public"."subscriptions" s
     WHERE s.status = 'active'
       AND s.current_period_end >= now()
  LOOP
    v_grant := CASE r.plan
      WHEN 'developer' THEN 10000
      WHEN 'team'      THEN 50000
      ELSE 0 END;
    IF v_grant > 0 THEN
      IF r.interval = 'year' THEN
        -- Yearly: one allowance per calendar month while active.
        v_key := 'grant:' || r.user_id || ':sub:' || r.id || ':' || to_char(now(), 'YYYY-MM');
        v_ref := r.plan || ' monthly allowance';
      ELSE
        -- Monthly: one allowance per billing cycle (per subscription row).
        v_key := 'grant:' || r.user_id || ':sub:' || r.id;
        v_ref := r.plan || ' cycle allowance';
      END IF;

      -- top_up_credits is idempotent on metering_key, so this is a no-op for
      -- an already-granted cycle (webhook grant, or an earlier cron run) and
      -- recovers a cycle whose webhook grant failed. Count only actual grants.
      IF NOT EXISTS (
        SELECT 1 FROM "public"."credit_ledger" WHERE "metering_key" = v_key
      ) THEN
        PERFORM "public"."top_up_credits"(r.user_id, v_grant, v_key, 'grant', v_ref);
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
ALTER FUNCTION "public"."add_monthly_credits"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."add_monthly_credits"() IS 'Cron: grant each active subscriber their credit allowance (Developer 10K / Team 50K). Monthly subs get one allowance per billing cycle; yearly subs get one per calendar month. Idempotent via the grant metering key (matches the webhook first-cycle grant).';

-- ============================================================================
-- 5. downgrade_expired_subscriptions v2 — cancel expired subs and downgrade
--    keys to developer (credit-metered), never to a "free" tier.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.downgrade_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Single statement with three CTEs:
  --   1. expired: mark active-but-past-period rows as canceled, return user_ids
  --   2. to_downgrade: users from (1) who have NO remaining active+unexpired
  --      subscription (i.e. they didn't renew). The NOT EXISTS subquery sees
  --      the statement-start snapshot, where expired rows still have
  --      period_end < now, so they correctly don't count as "remaining".
  --   3. updated_keys: downgrade those users' API keys to developer (base
  --      tier, credit-metered — any wallet balance remains usable).
  WITH expired AS (
    UPDATE public.subscriptions
    SET status = 'canceled', updated_at = now()
    WHERE status = 'active' AND current_period_end < now()
    RETURNING user_id
  ),
  to_downgrade AS (
    SELECT DISTINCT e.user_id
    FROM expired e
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = e.user_id
        AND s.status = 'active'
        AND s.current_period_end >= now()
    )
  ),
  updated_keys AS (
    UPDATE public.api_keys k
    SET plan = 'developer',
        rate_limit = 30,
        updated_at = now()
    WHERE k.user_id IN (SELECT user_id FROM to_downgrade)
      AND k.plan IN ('developer', 'team')
      AND k.is_active = true
    RETURNING k.id
  )
  SELECT count(*) INTO v_count FROM updated_keys;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.downgrade_expired_subscriptions() OWNER TO "postgres";

COMMENT ON FUNCTION public.downgrade_expired_subscriptions() IS 'Daily cron: cancel subscriptions past their period_end and downgrade API keys to developer (base tier, credit-metered; wallet balance remains usable). Returns the number of API keys downgraded.';

-- ============================================================================
-- 6. RLS tightening from 0040 (idempotent replay — safe to re-run).
-- ============================================================================
DROP POLICY IF EXISTS "subscriptions_update_own" ON "public"."subscriptions";
DROP POLICY IF EXISTS "subscriptions_insert_own" ON "public"."subscriptions";

COMMIT;
