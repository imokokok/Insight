-- 0040: Billing fixes.
--
-- 1. Grant subscription credit allowances PER BILLING CYCLE instead of per
--    calendar month, so a 30-day subscription straddling a month boundary is
--    not credited twice.
--
--    Old behaviour: key = grant:<user>:YYYY-MM  → a monthly sub active
--    2026-01-20..02-19 got a full January grant (webhook activation) PLUS a
--    full February grant (cron on 02-01) = two allowances for one 30-day cycle.
--
--    New behaviour:
--      - monthly sub: one allowance per subscription row (one billing cycle)
--        → key grant:<user>:sub:<subId>
--      - yearly  sub: one allowance per calendar month while active
--        → key grant:<user>:sub:<subId>:YYYY-MM  (12 allowances per year)
--
--    Keys match the webhook's first-cycle grant, so activation + cron are
--    idempotent; the cron also recovers a cycle whose webhook grant failed.
--
-- 2. Drop the user UPDATE and INSERT RLS policies on subscriptions. Users
--    never write subscriptions through the user client (checkout/webhook use
--    the service role), but the policies let a user fabricate an active
--    subscription row, which the grant cron would credit against.

BEGIN;

-- ============================================================================
-- 1. Interval-aware monthly credit grants.
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
      WHEN 'pro' THEN 10000
      WHEN 'protocol' THEN 100000
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

COMMENT ON FUNCTION "public"."add_monthly_credits"() IS 'Cron: grant each active subscriber their credit allowance. Monthly subs get one allowance per billing cycle; yearly subs get one per calendar month. Idempotent via the grant metering key (matches the webhook first-cycle grant).';

-- ============================================================================
-- 2. Remove user write access to subscriptions (webhook is the only writer).
-- ============================================================================
DROP POLICY IF EXISTS "subscriptions_update_own" ON "public"."subscriptions";
DROP POLICY IF EXISTS "subscriptions_insert_own" ON "public"."subscriptions";

COMMIT;
