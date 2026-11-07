-- 0125: Ledger semantics (source/reason/request_id/meta) + pending settlement
-- reconciliation.
--
-- Authoritative pricing review 2026-11-07 v2.1, §1.1 row 10 and §8:
--   - every ledger row must carry `source` (signup|x402|subscription|wallet),
--     `reason` (the billed SKU / batch outcome), `request_id`, and `meta`
--     so "batch charges only successes", "no data is free" and "timeout is
--     free" are provable from the bill.
--   - §1.1 row 9 / §8.3: a DB/RPC failure must not silently give the service
--     away. The request path records a pending settlement row; the billing
--     cron retries it idempotently. C4 stays fail-closed in application code.
--
-- All statements are idempotent (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF
-- NOT EXISTS / CREATE OR REPLACE). Adding defaulted parameters changes the
-- function signature, so the old overloads are dropped first to avoid
-- PostgREST ambiguity; existing callers with fewer arguments still resolve
-- because the new parameters have defaults.

BEGIN;

-- ============================================================================
-- 1. Ledger columns.
-- ============================================================================
ALTER TABLE "public"."credit_ledger"
  ADD COLUMN IF NOT EXISTS "source" text,
  ADD COLUMN IF NOT EXISTS "reason" text,
  ADD COLUMN IF NOT EXISTS "request_id" text,
  ADD COLUMN IF NOT EXISTS "meta" jsonb;

-- `source` is a closed set; NULL is allowed for historical rows written
-- before 0125 (a CHECK passes on NULL). `free` covers waived / zero-priced
-- calls: a 0-delta row that proves the request delivered no billable value.
ALTER TABLE "public"."credit_ledger"
  DROP CONSTRAINT IF EXISTS "credit_ledger_source_check";
ALTER TABLE "public"."credit_ledger"
  ADD CONSTRAINT "credit_ledger_source_check"
  CHECK ("source" IS NULL OR "source" IN ('signup','x402','subscription','wallet','free'));

COMMENT ON COLUMN "public"."credit_ledger"."source" IS
  'Funding source: signup | x402 | subscription | wallet | free (waived/zero-priced).';
COMMENT ON COLUMN "public"."credit_ledger"."reason" IS
  'Free-text billed SKU or outcome (e.g. prices.batch, batch_partial, insufficient_data, upstream_empty, timeout, monthly_grant, signup_grant). Not constrained by a CHECK so new SKUs do not require a migration; the documented vocabulary lives here.';
COMMENT ON COLUMN "public"."credit_ledger"."request_id" IS
  'Client-visible request/receipt id (X-Credit-Receipt).';
COMMENT ON COLUMN "public"."credit_ledger"."meta" IS
  'Per-charge detail such as {"requested":N,"charged":M} for batches.';

CREATE INDEX IF NOT EXISTS "credit_ledger_request_id_idx"
  ON "public"."credit_ledger" ("request_id");

-- `waiver` is a 0-delta audit row for zero-charge outcomes (insufficient_data,
-- timeout, no usable data). It is deliberately a distinct kind so it can
-- never be mistaken for a usage debit and never participates in budget sums.
ALTER TABLE "public"."credit_ledger"
  DROP CONSTRAINT IF EXISTS "credit_ledger_kind_check";
ALTER TABLE "public"."credit_ledger"
  ADD CONSTRAINT "credit_ledger_kind_check"
  CHECK ("kind" IN ('topup','usage','refund','grant','waiver'));

-- ============================================================================
-- 2. Pending settlements: written when the charge RPC fails, replayed by cron.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."credit_pending_settlements" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "api_key_id" uuid NOT NULL REFERENCES "public"."api_keys"("id") ON DELETE CASCADE,
    "cost" numeric(12,2) NOT NULL,
    "metering_key" text NOT NULL UNIQUE,
    "ref" text,
    "source" text,
    "reason" text,
    "request_id" text,
    "meta" jsonb,
    "status" text NOT NULL DEFAULT 'pending'
      CHECK ("status" IN ('pending','settled','abandoned')),
    "attempts" integer NOT NULL DEFAULT 0,
    "last_error" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."credit_pending_settlements" OWNER TO "postgres";

COMMENT ON TABLE "public"."credit_pending_settlements" IS
  'Charges the ledger could not record because consume_credits failed. Replayed by settle_pending_credits(); settled rows keep the original metering_key, so reconciliation never double-charges.';

CREATE INDEX IF NOT EXISTS "credit_pending_settlements_status_idx"
  ON "public"."credit_pending_settlements" ("status", "id");

ALTER TABLE "public"."credit_pending_settlements" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. consume_credits: add source/reason/request_id/meta.
-- ============================================================================
DROP FUNCTION IF EXISTS "public"."consume_credits"(uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION "public"."consume_credits"(
    p_key_id uuid,
    p_cost numeric,
    p_metering_key text,
    p_ref text,
    p_source text DEFAULT NULL,
    p_reason text DEFAULT NULL,
    p_request_id text DEFAULT NULL,
    p_meta jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_plan text;
  v_budget numeric;
  v_used numeric;
  v_balance numeric;
  v_frozen numeric;
  v_month date := date_trunc('month', now())::date;
BEGIN
  SELECT "user_id", "plan", "budget_monthly" INTO v_user, v_plan, v_budget
    FROM "public"."api_keys" WHERE "id" = p_key_id;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'KEY_NOT_FOUND');
  END IF;

  PERFORM "public"."ensure_credit_wallet"(v_user);

  -- Row lock: serialize all charges for this user (see 0042).
  SELECT "balance", "frozen" INTO v_balance, v_frozen
    FROM "public"."credit_wallet"
   WHERE "user_id" = v_user
     FOR UPDATE;

  IF EXISTS (SELECT 1 FROM "public"."credit_ledger" WHERE "metering_key" = p_metering_key) THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'balance', v_balance);
  END IF;

  IF v_budget IS NOT NULL THEN
    SELECT COALESCE(SUM(-delta), 0) INTO v_used
      FROM "public"."credit_ledger"
     WHERE "api_key_id" = p_key_id AND "kind" = 'usage' AND "period_month" = v_month;
    IF v_used + p_cost > v_budget THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'BUDGET_EXCEEDED',
        'budget', v_budget, 'used', v_used, 'cost', p_cost);
    END IF;
  END IF;

  IF v_balance - v_frozen < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CREDITS',
      'balance', v_balance, 'cost', p_cost);
  END IF;

  UPDATE "public"."credit_wallet"
     SET "balance" = "balance" - p_cost, "updated_at" = now()
   WHERE "user_id" = v_user
   RETURNING "balance" INTO v_balance;

  INSERT INTO "public"."credit_ledger"
    ("user_id","api_key_id","delta","balance_after","metering_key","kind","ref_id",
     "period_month","source","reason","request_id","meta")
  VALUES (v_user, p_key_id, -p_cost, v_balance, p_metering_key, 'usage', p_ref,
     v_month, p_source, p_reason, p_request_id, p_meta);

  RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'cost', p_cost);
END;
$$;

ALTER FUNCTION "public"."consume_credits"(uuid, numeric, text, text, text, text, text, jsonb)
  OWNER TO "postgres";

COMMENT ON FUNCTION "public"."consume_credits"(uuid, numeric, text, text, text, text, text, jsonb) IS
  'Authoritative atomic credit charge. Locks the wallet row (FOR UPDATE) so concurrent requests for the same user are serialized; idempotent on metering_key. Records source/reason/request_id/meta for audit.';

-- ============================================================================
-- 4. top_up_credits: add source/reason/request_id/meta.
-- ============================================================================
DROP FUNCTION IF EXISTS "public"."top_up_credits"(uuid, numeric, text, text, text);

CREATE OR REPLACE FUNCTION "public"."top_up_credits"(
    p_user_id uuid,
    p_amount numeric,
    p_metering_key text,
    p_kind text,
    p_ref text DEFAULT NULL,
    p_source text DEFAULT NULL,
    p_reason text DEFAULT NULL,
    p_request_id text DEFAULT NULL,
    p_meta jsonb DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount = 0 THEN RETURN 0; END IF;

  PERFORM "public"."ensure_credit_wallet"(p_user_id);

  IF EXISTS (SELECT 1 FROM "public"."credit_ledger" WHERE "metering_key" = p_metering_key) THEN
    RETURN (SELECT "balance" FROM "public"."credit_wallet" WHERE "user_id" = p_user_id);
  END IF;

  UPDATE "public"."credit_wallet"
     SET "balance" = "balance" + p_amount, "updated_at" = now()
   WHERE "user_id" = p_user_id
   RETURNING "balance" INTO v_balance;

  INSERT INTO "public"."credit_ledger"
    ("user_id","delta","balance_after","metering_key","kind","ref_id",
     "source","reason","request_id","meta")
  VALUES (p_user_id, p_amount, v_balance, p_metering_key, p_kind, p_ref,
     p_source, p_reason, p_request_id, p_meta);

  RETURN v_balance;
END;
$$;

ALTER FUNCTION "public"."top_up_credits"(uuid, numeric, text, text, text, text, text, text, jsonb)
  OWNER TO "postgres";

-- ============================================================================
-- 5. precheck_credits: always return budget/used so callers can raise the 80%
--    spend-cap warning (pricing audit §1.1 row 12).
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."precheck_credits"(p_key_id uuid, p_cost numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_budget numeric;
  v_used numeric;
  v_balance numeric;
  v_month date := date_trunc('month', now())::date;
BEGIN
  SELECT "user_id", "budget_monthly" INTO v_user, v_budget
    FROM "public"."api_keys" WHERE "id" = p_key_id;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'KEY_NOT_FOUND');
  END IF;

  IF v_budget IS NOT NULL THEN
    SELECT COALESCE(SUM(-delta), 0) INTO v_used
      FROM "public"."credit_ledger"
     WHERE "api_key_id" = p_key_id AND "kind" = 'usage' AND "period_month" = v_month;
    IF v_used + p_cost > v_budget THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'BUDGET_EXCEEDED',
        'budget', v_budget, 'used', v_used, 'cost', p_cost);
    END IF;
  END IF;

  SELECT "balance" INTO v_balance FROM "public"."credit_wallet" WHERE "user_id" = v_user;
  IF v_balance IS NULL THEN v_balance := 0; END IF;
  IF v_balance < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CREDITS',
      'balance', v_balance, 'cost', p_cost);
  END IF;

  RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'cost', p_cost,
    'budget', v_budget, 'used', COALESCE(v_used, 0));
END;
$$;

ALTER FUNCTION "public"."precheck_credits"(uuid, numeric) OWNER TO "postgres";

-- ============================================================================
-- 6. Pending settlement writers/readers.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."record_pending_settlement"(
    p_key_id uuid,
    p_cost numeric,
    p_metering_key text,
    p_ref text DEFAULT NULL,
    p_source text DEFAULT NULL,
    p_reason text DEFAULT NULL,
    p_request_id text DEFAULT NULL,
    p_meta jsonb DEFAULT NULL,
    p_error text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO "public"."credit_pending_settlements"
    ("api_key_id","cost","metering_key","ref","source","reason","request_id","meta",
     "status","attempts","last_error")
  VALUES (p_key_id, p_cost, p_metering_key, p_ref, p_source, p_reason, p_request_id, p_meta,
     'pending', 1, p_error)
  ON CONFLICT ("metering_key") DO UPDATE
    SET "attempts" = "public"."credit_pending_settlements"."attempts" + 1,
        "last_error" = EXCLUDED."last_error",
        "updated_at" = now()
  RETURNING "id" INTO v_id;
  RETURN v_id;
END;
$$;

ALTER FUNCTION "public"."record_pending_settlement"(uuid, numeric, text, text, text, text, text, jsonb, text)
  OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."settle_pending_credits"(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_result jsonb;
  v_settled integer := 0;
  v_abandoned integer := 0;
  v_pending integer := 0;
BEGIN
  FOR r IN
    SELECT * FROM "public"."credit_pending_settlements"
     WHERE "status" = 'pending'
     ORDER BY "id"
     LIMIT GREATEST(p_limit, 1)
     FOR UPDATE SKIP LOCKED
  LOOP
    SELECT "public"."consume_credits"(
      r."api_key_id", r."cost", r."metering_key", r."ref",
      r."source", r."reason", r."request_id", r."meta"
    ) INTO v_result;

    IF v_result ? 'ok' AND (v_result->>'ok')::boolean THEN
      UPDATE "public"."credit_pending_settlements"
         SET "status" = 'settled', "last_error" = NULL, "updated_at" = now()
       WHERE "id" = r."id";
      v_settled := v_settled + 1;
    ELSIF v_result->>'reason' IN ('INSUFFICIENT_CREDITS','KEY_NOT_FOUND','BUDGET_EXCEEDED') THEN
      UPDATE "public"."credit_pending_settlements"
         SET "status" = 'abandoned', "last_error" = v_result->>'reason', "updated_at" = now()
       WHERE "id" = r."id";
      v_abandoned := v_abandoned + 1;
    ELSE
      UPDATE "public"."credit_pending_settlements"
         SET "attempts" = "attempts" + 1,
             "last_error" = COALESCE(v_result->>'reason', 'unconfirmed'),
             "updated_at" = now()
       WHERE "id" = r."id";
      v_pending := v_pending + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('settled', v_settled, 'abandoned', v_abandoned, 'pending', v_pending);
END;
$$;

ALTER FUNCTION "public"."settle_pending_credits"(integer) OWNER TO "postgres";

-- ============================================================================
-- 7. Monthly subscription grant records its source/reason.
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
        PERFORM "public"."top_up_credits"(
          r.user_id, v_grant, v_key, 'grant', v_ref,
          'subscription', 'monthly_grant', NULL, NULL
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

ALTER FUNCTION "public"."add_monthly_credits"() OWNER TO "postgres";

-- ============================================================================
-- 8. Waived credits: append a 0-delta audit row without touching the wallet.
--    Used for insufficient_data / timeout / no-usable-data outcomes so the bill
--    itself proves the request was free. A separate kind (`waiver`) and a
--    `waive:`-prefixed metering key keep it out of the usage idempotency space:
--    a later real charge for the same logical request is not blocked.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."record_waived_credit"(
    p_key_id uuid,
    p_metering_key text,
    p_ref text DEFAULT NULL,
    p_source text DEFAULT 'free',
    p_reason text DEFAULT NULL,
    p_request_id text DEFAULT NULL,
    p_meta jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_balance numeric;
BEGIN
  SELECT "user_id" INTO v_user FROM "public"."api_keys" WHERE "id" = p_key_id;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'KEY_NOT_FOUND');
  END IF;

  PERFORM "public"."ensure_credit_wallet"(v_user);
  SELECT "balance" INTO v_balance FROM "public"."credit_wallet" WHERE "user_id" = v_user;
  IF v_balance IS NULL THEN v_balance := 0; END IF;

  -- Idempotent on the waiver key: a retried free outcome writes one row.
  IF EXISTS (SELECT 1 FROM "public"."credit_ledger" WHERE "metering_key" = p_metering_key) THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'balance', v_balance);
  END IF;

  INSERT INTO "public"."credit_ledger"
    ("user_id","api_key_id","delta","balance_after","metering_key","kind","ref_id",
     "period_month","source","reason","request_id","meta")
  VALUES (v_user, p_key_id, 0, v_balance, p_metering_key, 'waiver', p_ref,
     date_trunc('month', now())::date, COALESCE(p_source, 'free'), p_reason,
     p_request_id, p_meta);

  RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'waived', true);
END;
$$;

ALTER FUNCTION "public"."record_waived_credit"(uuid, text, text, text, text, text, jsonb)
  OWNER TO "postgres";

COMMENT ON FUNCTION "public"."record_waived_credit"(uuid, text, text, text, text, text, jsonb) IS
  'Append a 0-delta waiver ledger row (kind=waiver, source=free) for insufficient_data/timeout/no-data outcomes. Never changes the wallet or budget.';

COMMIT;
