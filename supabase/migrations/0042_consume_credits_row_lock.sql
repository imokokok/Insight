-- 0042: Add a row lock to consume_credits — close the concurrent overdraw race.
--
-- The original consume_credits (0039) read the wallet balance, checked
-- `balance - frozen >= cost`, then decremented — three steps in separate
-- SELECT/UPDATE statements. Under READ COMMITTED (the default) two parallel
-- requests for the same user can both observe the same balance, both pass the
-- check, and both decrement, overdrawing the wallet (TOCTOU).
--
-- The REST handler now awaits the charge and withholds the 2xx response on a
-- rejection (see src/lib/api/handler.ts), but consume_credits itself must be
-- authoritative for that guarantee to hold — with a plain check-then-update it
-- could still return ok:true while overdrawing. Locking the wallet row with
-- SELECT ... FOR UPDATE serializes concurrent charges for the same user: the
-- second caller blocks until the first commits, then reads the fresh balance
-- and is correctly rejected with INSUFFICIENT_CREDITS.
--
-- The idempotent-replay check (metering_key already in the ledger) is moved
-- AFTER the lock so a concurrent duplicate of the same logical call is also
-- serialized — previously two racing identical calls could both miss the
-- EXISTS check and both charge.
--
-- Self-contained: depends only on 0039 (credit_wallet).

BEGIN;

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

  PERFORM "public"."ensure_credit_wallet"(v_user);

  -- Row lock: serialize all charges for this user. Any concurrent consume of
  -- the same wallet blocks here until this transaction commits/aborts, so the
  -- balance read below is already the post-commit value of prior charges.
  SELECT "balance", "frozen" INTO v_balance, v_frozen
    FROM "public"."credit_wallet"
   WHERE "user_id" = v_user
     FOR UPDATE;

  -- Idempotent replay (checked while holding the lock): same metering_key
  -- (same logical call / webhook / reconcile re-run) is a no-op.
  IF EXISTS (SELECT 1 FROM "public"."credit_ledger" WHERE "metering_key" = p_metering_key) THEN
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

COMMENT ON FUNCTION "public"."consume_credits"(uuid, numeric, text, text) IS 'Authoritative atomic credit charge. Locks the wallet row (FOR UPDATE) so concurrent requests for the same user are serialized and the check-then-charge cannot overdraw; idempotent on metering_key.';

COMMIT;
