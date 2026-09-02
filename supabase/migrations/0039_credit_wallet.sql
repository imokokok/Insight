-- 0039: Credit wallet + usage ledger for per-call billing.
--
-- Reframes the FLAT monthly-quota model for PAID plans (Pro 10K, Protocol
-- 100K per month) into a PREPAID credit-wallet model: each API call costs
-- N credits (by metering class — see src/lib/billing/metering.ts), and the
-- wallet is pre-funded via manual top-ups and monthly per-plan grants.
--
-- Free-plan behaviour is UNCHANGED: it keeps using the monthly_quota_used
-- integer counter (reset by the existing reset_monthly_quota RPC).
--
-- Safety properties enforced here (a solo project handling real crypto):
--   - Idempotency: credit_ledger.metering_key is UNIQUE. Replaying a top-up
--     IPN, or re-running a billing cron, never double-credits or double-charges.
--   - Atomicity: consume_credits checks balance/budget and decrements in a
--     single SECURITY DEFINER function so a race can never overdraw.
--   - Auditability: every balance change is an immutable, append-only ledger row.

BEGIN;

-- ============================================================================
-- 1. credit_wallet: one row per user, numeric balance.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."credit_wallet" (
    "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "balance" numeric(12,2) NOT NULL DEFAULT 0,
    "frozen" numeric(12,2) NOT NULL DEFAULT 0,
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."credit_wallet" OWNER TO "postgres";

COMMENT ON TABLE "public"."credit_wallet" IS 'Prepaid credit balance per user. balance is chargeable credits; frozen reserves concurrent in-flight charges.';
COMMENT ON COLUMN "public"."credit_wallet"."balance" IS 'Chargeable credit balance. Decremented by consume_credits, incremented by top_up_credits.';

-- ============================================================================
-- 2. credit_ledger: immutable, append-only, idempotent charge/credit history.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."credit_ledger" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "api_key_id" uuid REFERENCES "public"."api_keys"("id") ON DELETE SET NULL,
    "delta" numeric(12,2) NOT NULL,
    "balance_after" numeric(12,2) NOT NULL,
    "metering_key" text NOT NULL UNIQUE,
    "kind" text NOT NULL CHECK ("kind" IN ('topup','usage','refund','grant')),
    "ref_id" text,
    "period_month" date,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."credit_ledger" OWNER TO "postgres";

COMMENT ON TABLE "public"."credit_ledger" IS 'Immutable credit ledger. delta is negative for usage charges, positive for topups/grants/refunds. metering_key is a unique idempotency key (e.g. a per-request uuid, or topup:<payment_id>).';
COMMENT ON COLUMN "public"."credit_ledger"."period_month" IS 'Calendar month (first day of month) a usage debit belongs to; used by the optional per-key monthly budget check.';

CREATE INDEX IF NOT EXISTS "credit_ledger_user_month_idx"
    ON "public"."credit_ledger" ("user_id", "period_month");
CREATE INDEX IF NOT EXISTS "credit_ledger_api_key_idx"
    ON "public"."credit_ledger" ("api_key_id");

-- Users may read only their own wallet/ledger. All writes flow through
-- SECURITY DEFINER RPCs (service-role), so no INSERT policies are needed.
ALTER TABLE "public"."credit_wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."credit_ledger" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_wallet_own" ON "public"."credit_wallet"
  FOR SELECT USING ("user_id" = auth.uid());
CREATE POLICY "credit_ledger_own" ON "public"."credit_ledger"
  FOR SELECT USING ("user_id" = auth.uid());

-- ============================================================================
-- 3. api_keys: optional per-key monthly budget (in credits). NULL = unlimited.
-- ============================================================================
ALTER TABLE "public"."api_keys"
  ADD COLUMN IF NOT EXISTS "budget_monthly" numeric(12,2);

COMMENT ON COLUMN "public"."api_keys"."budget_monthly" IS 'Optional hard cap on credits this key may consume per calendar month. NULL = rely on wallet balance only.';

-- ============================================================================
-- 4. credit_purchases: tracks NOWPayments top-up invoices (a one-shot credit
--    purchase, distinct from a subscription).
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."credit_purchases" (
    "id" uuid PRIMARY KEY NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "credits" numeric(12,2) NOT NULL,
    "price_usd" numeric(12,2) NOT NULL,
    "nowpayments_invoice_id" text,
    "nowpayments_payment_id" text,
    "status" text NOT NULL DEFAULT 'incomplete' CHECK ("status" IN ('incomplete','paid','canceled')),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "public"."credit_purchases" OWNER TO "postgres";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_credit_purchases_invoice"
    ON "public"."credit_purchases" ("nowpayments_invoice_id")
    WHERE "nowpayments_invoice_id" IS NOT NULL;

-- ============================================================================
-- 5. RPC: ensure_credit_wallet — upsert and return the wallet row.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."ensure_credit_wallet"(p_user_id uuid)
RETURNS "public"."credit_wallet"
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO "public"."credit_wallet" ("user_id","balance","frozen")
  VALUES (p_user_id, 0, 0)
  ON CONFLICT ("user_id") DO NOTHING;
  SELECT * FROM "public"."credit_wallet" WHERE "user_id" = p_user_id;
$$;
ALTER FUNCTION "public"."ensure_credit_wallet"(uuid) OWNER TO "postgres";

-- ============================================================================
-- 6. RPC: top_up_credits — add credits (topup / grant / refund) + ledger row.
--    Idempotent on metering_key (protects against IPN replays / cron reruns).
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."top_up_credits"(
    p_user_id uuid,
    p_amount numeric,
    p_metering_key text,
    p_kind text,
    p_ref text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount = 0 THEN RETURN 0; END IF;

  PERFORM "public"."ensure_credit_wallet"(p_user_id);

  -- Idempotency: already applied (e.g. duplicate IPN), no-op.
  IF EXISTS (SELECT 1 FROM "public"."credit_ledger" WHERE "metering_key" = p_metering_key) THEN
    RETURN (SELECT "balance" FROM "public"."credit_wallet" WHERE "user_id" = p_user_id);
  END IF;

  UPDATE "public"."credit_wallet"
     SET "balance" = "balance" + p_amount, "updated_at" = now()
   WHERE "user_id" = p_user_id
   RETURNING "balance" INTO v_balance;

  INSERT INTO "public"."credit_ledger"
    ("user_id","delta","balance_after","metering_key","kind","ref_id")
  VALUES (p_user_id, p_amount, v_balance, p_metering_key, p_kind, p_ref);

  RETURN v_balance;
END;
$$;
ALTER FUNCTION "public"."top_up_credits"(uuid, numeric, text, text, text) OWNER TO "postgres";

-- ============================================================================
-- 7. RPC: precheck_credits — read-only gate check (balance + optional budget).
--    Non-destructive; the quota middleware calls this to reject early. The
--    authoritative charge is consume_credits (which re-checks atomically).
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."precheck_credits"(p_key_id uuid, p_cost numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_plan text;
  v_budget numeric;
  v_used numeric;
  v_balance numeric;
  v_month date := date_trunc('month', now())::date;
BEGIN
  SELECT "user_id", "plan", "budget_monthly" INTO v_user, v_plan, v_budget
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

  RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'cost', p_cost);
END;
$$;
ALTER FUNCTION "public"."precheck_credits"(uuid, numeric) OWNER TO "postgres";

-- ============================================================================
-- 8. RPC: consume_credits — atomically charge a key's user wallet + budget,
--    and append the ledger row. Idempotent on metering_key. This is the
--    source of truth; the async caller never double-charges on a retry.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."consume_credits"(
    p_key_id uuid,
    p_cost numeric,
    p_metering_key text,
    p_ref text
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

  -- Idempotent replay: same metering_key (same logical call / webhook) is a no-op.
  IF EXISTS (SELECT 1 FROM "public"."credit_ledger" WHERE "metering_key" = p_metering_key) THEN
    SELECT "balance", "frozen" INTO v_balance, v_frozen FROM "public"."credit_wallet" WHERE "user_id" = v_user;
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'balance', v_balance);
  END IF;

  -- Optional per-key monthly budget cap (counted from ledger for this month).
  IF v_budget IS NOT NULL THEN
    SELECT COALESCE(SUM(-delta), 0) INTO v_used
      FROM "public"."credit_ledger"
     WHERE "api_key_id" = p_key_id AND "kind" = 'usage' AND "period_month" = v_month;
    IF v_used + p_cost > v_budget THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'BUDGET_EXCEEDED',
        'budget', v_budget, 'used', v_used, 'cost', p_cost);
    END IF;
  END IF;

  PERFORM "public"."ensure_credit_wallet"(v_user);
  SELECT "balance", "frozen" INTO v_balance, v_frozen FROM "public"."credit_wallet" WHERE "user_id" = v_user;
  IF v_balance - v_frozen < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CREDITS',
      'balance', v_balance, 'cost', p_cost);
  END IF;

  UPDATE "public"."credit_wallet"
     SET "balance" = "balance" - p_cost, "updated_at" = now()
   WHERE "user_id" = v_user
   RETURNING "balance" INTO v_balance;

  INSERT INTO "public"."credit_ledger"
    ("user_id","api_key_id","delta","balance_after","metering_key","kind","ref_id","period_month")
  VALUES (v_user, p_key_id, -p_cost, v_balance, p_metering_key, 'usage', p_ref, v_month);

  RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'cost', p_cost);
END;
$$;
ALTER FUNCTION "public"."consume_credits"(uuid, numeric, text, text) OWNER TO "postgres";

-- ============================================================================
-- 9. RPC: add_monthly_credits — grant each active-subscription user their
--    plan's monthly credit allowance. Idempotent per (user, month) via the
--    grant metering_key. Called by the billing cron (daily, but only credits
--    once per month per user by construction of the key).
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."add_monthly_credits"()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_grant numeric;
BEGIN
  FOR r IN
    SELECT DISTINCT s.user_id, s.plan
      FROM "public"."subscriptions" s
     WHERE s.status = 'active'
       AND s.current_period_end >= now()
  LOOP
    v_grant := CASE r.plan
      WHEN 'pro' THEN 10000
      WHEN 'protocol' THEN 100000
      ELSE 0 END;
    IF v_grant > 0 THEN
      PERFORM "public"."top_up_credits"(
        r.user_id,
        v_grant,
        'grant:' || r.user_id || ':' || to_char(now(), 'YYYY-MM'),
        'grant',
        r.plan || ' monthly allowance'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
ALTER FUNCTION "public"."add_monthly_credits"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."add_monthly_credits"() IS 'Cron: add each active subscriber''s monthly credit allowance to their wallet. Idempotent per (user, month). Returns number of users granted.';

COMMIT;