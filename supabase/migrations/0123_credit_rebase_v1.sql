-- 2026-11 credit rebase: $0.004/credit → $0.001/credit.
--
-- USD list prices are unchanged (C1 $0.002, C2 $0.004, C3 $0.02, C4 $0.04).
-- Every SKU now costs 4× the credits, so existing wallet balances are
-- multiplied by 4 in one transaction. Subscription quotas and pack credits
-- are scaled in application configuration, preserving their USD value.
--
-- Idempotency: one ledger row per user with metering_key
-- `credit_rebase_v1:<user_id>`; a wallet carrying that marker is never
-- scaled twice.

BEGIN;

WITH original AS (
  SELECT
    w."user_id",
    w."balance" AS old_balance
  FROM "public"."credit_wallet" w
  WHERE (w."balance" <> 0 OR w."frozen" <> 0)
    AND NOT EXISTS (
      SELECT 1 FROM "public"."credit_ledger" l
      WHERE l."metering_key" = 'credit_rebase_v1:' || w."user_id"::text
    )
),
scaled AS (
  UPDATE "public"."credit_wallet" w
  SET
    "balance" = (w."balance" * 4)::numeric(12,2),
    "frozen" = (w."frozen" * 4)::numeric(12,2),
    "updated_at" = now()
  FROM original o
  WHERE w."user_id" = o."user_id"
  RETURNING w."user_id", w."balance" AS new_balance
)
INSERT INTO "public"."credit_ledger"
  ("user_id","delta","balance_after","metering_key","kind","ref_id")
SELECT
  s."user_id",
  (s."new_balance" - o."old_balance")::numeric(12,2),
  s."new_balance",
  'credit_rebase_v1:' || s."user_id"::text,
  'grant',
  'credit_rebase_v1'
FROM scaled s
JOIN original o ON o."user_id" = s."user_id"
ON CONFLICT ("metering_key") DO NOTHING;

-- Published subscription ladder: Starter 25K, Team 120K, Scale 500K credits.
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
