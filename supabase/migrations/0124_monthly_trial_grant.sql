-- 2026-11: free allowance stays ONE-TIME (400 credits), not monthly.
--
-- This migration is a deliberate reversal of the earlier draft that extended
-- `add_monthly_credits()` to grant 400 credits per verified user per month.
-- The authoritative pricing review (2026-11-07 v2.1, §5.4) rejected monthly
-- reset: it multiplies free-tier cost by 12 and amplifies bulk-signup abuse.
-- The one-time grant remains in `POST /api/billing/signup-grant` with the
-- idempotent key `signup:<user_id>`.
--
-- This file is idempotent: it only re-creates `add_monthly_credits()` with the
-- subscription ladder from 0123 and has no free-tier loop. If the earlier
-- monthly draft was applied anywhere, re-running this stops any FUTURE monthly
-- trial grant; already-issued credits are not clawed back (they are real
-- wallet balance and must not be silently removed).
--
-- Subscription ladder is unchanged: Starter 25K / Team 120K / Scale 500K
-- credits, with `top_up_credits` idempotency on the grant metering key.

BEGIN;

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
      WHEN 'developer' THEN 25000
      WHEN 'team'      THEN 120000
      WHEN 'scale'     THEN 500000
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

COMMIT;
