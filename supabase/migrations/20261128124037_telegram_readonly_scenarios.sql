-- Preserve the existing wallet debit contract while assigning auditable
-- scene-specific ledger reasons. No wallet authorization or transaction data
-- is involved in these read-only assessments.
CREATE OR REPLACE FUNCTION public.consume_telegram_credits(
  p_telegram_user_id text,
  p_cost numeric,
  p_metering_key text,
  p_request_id text,
  p_meta jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_frozen numeric;
  v_month date := date_trunc('month', now())::date;
  v_product text := COALESCE(p_meta->>'product', 'polymarket_assessment');
  v_reason text;
BEGIN
  IF v_product NOT IN ('polymarket_assessment', 'base_lending', 'hyperliquid_perps', 'dex_swap')
     OR p_telegram_user_id !~ '^[0-9]{1,24}$'
     OR p_cost IS NULL OR p_cost <= 0 OR p_cost > 10000
     OR p_metering_key IS NULL OR char_length(p_metering_key) > 160
     OR p_metering_key !~ '^telegram:[0-9a-f]{32}:[0-9a-f]{64}$'
     OR p_request_id IS NULL OR char_length(p_request_id) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_REQUEST');
  END IF;
  v_reason := 'telegram_' || v_product || '_assessment';

  SELECT l.user_id INTO v_user_id FROM public.telegram_account_links AS l WHERE l.telegram_user_id = p_telegram_user_id;
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'ACCOUNT_NOT_LINKED'); END IF;

  PERFORM public.ensure_credit_wallet(v_user_id);
  SELECT w.balance, w.frozen INTO v_balance, v_frozen FROM public.credit_wallet AS w WHERE w.user_id = v_user_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger AS ledger
    WHERE ledger.metering_key = p_metering_key AND ledger.user_id = v_user_id
      AND ledger.kind = 'usage' AND ledger.reason = v_reason
  ) THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'balance', v_balance, 'cost', p_cost);
  END IF;
  IF v_balance - v_frozen < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CREDITS', 'balance', v_balance, 'cost', p_cost);
  END IF;

  UPDATE public.credit_wallet SET balance = balance - p_cost, updated_at = now()
  WHERE user_id = v_user_id RETURNING balance INTO v_balance;
  INSERT INTO public.credit_ledger
    (user_id, api_key_id, delta, balance_after, metering_key, kind, ref_id, period_month, source, reason, request_id, meta)
  VALUES
    (v_user_id, NULL, -p_cost, v_balance, p_metering_key, 'usage', p_request_id, v_month, 'wallet', v_reason, p_request_id, p_meta);
  RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'cost', p_cost);
END;
$$;

ALTER FUNCTION public.consume_telegram_credits(text, numeric, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.consume_telegram_credits(text, numeric, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_telegram_credits(text, numeric, text, text, jsonb) TO service_role;
