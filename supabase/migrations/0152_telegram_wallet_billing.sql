-- Telegram linked users pay from the Insight wallet directly. They should not
-- need to create a separate API key just to use credits in the bot.
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
BEGIN
  IF p_telegram_user_id !~ '^[0-9]{1,24}$'
     OR p_cost IS NULL OR p_cost <= 0 OR p_cost > 10000
     OR p_metering_key IS NULL OR char_length(p_metering_key) > 160
     OR p_metering_key !~ '^telegram:[0-9a-f]{32}:[0-9a-f]{64}$'
     OR p_request_id IS NULL OR char_length(p_request_id) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_REQUEST');
  END IF;

  SELECT l.user_id INTO v_user_id
    FROM public.telegram_account_links AS l
   WHERE l.telegram_user_id = p_telegram_user_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ACCOUNT_NOT_LINKED');
  END IF;

  PERFORM public.ensure_credit_wallet(v_user_id);
  SELECT w.balance, w.frozen INTO v_balance, v_frozen
    FROM public.credit_wallet AS w
   WHERE w.user_id = v_user_id
     FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger AS ledger
     WHERE ledger.metering_key = p_metering_key
       AND ledger.user_id = v_user_id
       AND ledger.kind = 'usage'
       AND ledger.reason = 'telegram_polymarket_assessment'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'balance', v_balance, 'cost', p_cost);
  END IF;

  IF v_balance - v_frozen < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CREDITS', 'balance', v_balance, 'cost', p_cost);
  END IF;

  UPDATE public.credit_wallet
     SET balance = balance - p_cost, updated_at = now()
   WHERE user_id = v_user_id
   RETURNING balance INTO v_balance;

  INSERT INTO public.credit_ledger
    (user_id, api_key_id, delta, balance_after, metering_key, kind, ref_id,
     period_month, source, reason, request_id, meta)
  VALUES
    (v_user_id, NULL, -p_cost, v_balance, p_metering_key, 'usage', p_request_id,
     v_month, 'wallet', 'telegram_polymarket_assessment', p_request_id, p_meta);

  RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'cost', p_cost);
END;
$$;

ALTER FUNCTION public.consume_telegram_credits(text, numeric, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.consume_telegram_credits(text, numeric, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_telegram_credits(text, numeric, text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.consume_telegram_credits(text, numeric, text, text, jsonb) IS
  'Atomically debits a linked Telegram user’s Insight wallet for one trusted assessment. Service-role only and idempotent by metering key.';
