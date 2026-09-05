-- Billing v3: expand the self-serve plan ladder and align recurring grants.
--
-- Developer: 60,000 credits/month, 60 req/min
-- Team:      300,000 credits/month, 300 req/min
-- Scale:   1,000,000 credits/month, 1,200 req/min
-- Enterprise remains unlimited. Payment processing and renewal semantics are
-- unchanged; this migration only updates plan capacity and database support.

BEGIN;

ALTER TABLE "public"."api_keys" DROP CONSTRAINT IF EXISTS "api_keys_plan_check";
ALTER TABLE "public"."api_keys"
  ADD CONSTRAINT "api_keys_plan_check"
  CHECK ("plan" IN ('developer', 'team', 'scale', 'enterprise'));

ALTER TABLE "public"."subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_plan_check";
ALTER TABLE "public"."subscriptions"
  ADD CONSTRAINT "subscriptions_plan_check"
  CHECK ("plan" IN ('developer', 'team', 'scale', 'enterprise'));

-- Bring existing active keys onto the new plan rate limits. Enterprise stays
-- unlimited, while explicit non-plan limits are intentionally normalized so
-- every key matches the published subscription contract.
UPDATE "public"."api_keys"
SET "rate_limit" = CASE "plan"
  WHEN 'developer' THEN 60
  WHEN 'team' THEN 300
  WHEN 'scale' THEN 1200
  WHEN 'enterprise' THEN -1
  ELSE "rate_limit"
END,
"updated_at" = now()
WHERE "plan" IN ('developer', 'team', 'scale', 'enterprise');

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
      WHEN 'developer' THEN 60000
      WHEN 'team'      THEN 300000
      WHEN 'scale'     THEN 1000000
      ELSE 0 END;
    IF v_grant > 0 THEN
      IF r.interval = 'year' THEN
        v_key := 'grant:' || r.user_id || ':sub:' || r.id || ':' || to_char(now(), 'YYYY-MM');
        v_ref := r.plan || ' monthly allowance';
      ELSE
        v_key := 'grant:' || r.user_id || ':sub:' || r.id;
        v_ref := r.plan || ' cycle allowance';
      END IF;

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

COMMENT ON FUNCTION "public"."add_monthly_credits"() IS
  'Cron: grant active Developer 60K, Team 300K, or Scale 1M credits. Monthly subscriptions receive one grant per subscription row; yearly subscriptions receive one grant per calendar month. Idempotent via metering key.';

-- Existing subscribers may already have received the old 10K/50K allowance
-- under the same idempotency key. Credit only the difference for the current
-- cycle/month; subscribers without an existing grant will receive the full new
-- allowance on the next cron run.
DO $$
DECLARE
  r record;
  v_existing_key text;
  v_adjustment_key text;
  v_delta numeric;
BEGIN
  FOR r IN
    SELECT s.id, s.user_id, s.plan, s.interval
      FROM public.subscriptions s
     WHERE s.status = 'active'
       AND s.current_period_end >= now()
       AND s.plan IN ('developer', 'team')
  LOOP
    v_existing_key := CASE
      WHEN r.interval = 'year'
        THEN 'grant:' || r.user_id || ':sub:' || r.id || ':' || to_char(now(), 'YYYY-MM')
      ELSE 'grant:' || r.user_id || ':sub:' || r.id
    END;
    v_adjustment_key := 'pricing-v3-adjustment:' || v_existing_key;
    v_delta := CASE r.plan
      WHEN 'developer' THEN 50000
      WHEN 'team' THEN 250000
      ELSE 0
    END;

    IF v_delta > 0 AND EXISTS (
      SELECT 1 FROM public.credit_ledger WHERE metering_key = v_existing_key
    ) THEN
      PERFORM public.top_up_credits(
        r.user_id,
        v_delta,
        v_adjustment_key,
        'grant',
        r.plan || ' billing v3 allowance adjustment'
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.downgrade_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
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
        rate_limit = 60,
        updated_at = now()
    WHERE k.user_id IN (SELECT user_id FROM to_downgrade)
      AND k.plan IN ('developer', 'team', 'scale')
      AND k.is_active = true
    RETURNING k.id
  )
  SELECT count(*) INTO v_count FROM updated_keys;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.downgrade_expired_subscriptions() OWNER TO "postgres";

COMMENT ON FUNCTION public.downgrade_expired_subscriptions() IS
  'Daily cron: cancel subscriptions past period_end and downgrade active self-serve API keys to Developer at 60 req/min. Wallet balance remains usable.';

COMMIT;
