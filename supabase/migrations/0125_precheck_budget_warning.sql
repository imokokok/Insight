-- ============================================================================
-- 0125 — expose the spend-cap 80% signal from precheck_credits.
--
-- api_keys.budget_monthly is a per-key monthly spend cap enforced by
-- precheck_credits/consume_credits (see 0039/0042). A hard stop with no
-- advance warning is hostile to operators, so the read-only precheck now also
-- returns the month's used credits and the budget, and flags the call that
-- brings the key to >=80% of its cap.
--
-- Read-only: no wallet or ledger write path changes. consume_credits remains
-- the authoritative charge and still re-checks the cap atomically.
-- ============================================================================

BEGIN;

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

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_balance,
    'cost', p_cost,
    'budget', v_budget,
    'used', v_used,
    'budget_warning', (v_budget IS NOT NULL AND (v_used + p_cost) >= v_budget * 0.8)
  );
END;
$$;
ALTER FUNCTION "public"."precheck_credits"(uuid, numeric) OWNER TO "postgres";

COMMIT;
