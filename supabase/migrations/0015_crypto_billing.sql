-- Crypto billing migration: replace Creem MoR with NOWPayments crypto invoices.
--
-- Background: Creem (and Stripe/Lemon Squeezy/Paddle) all refuse crypto-related
-- businesses, so we switch to NOWPayments for USDC-denominated subscriptions.
-- NOWPayments has no subscription concept — each invoice is a one-shot payment
-- for one billing cycle. The application maintains subscription state in the
-- existing `subscriptions` table, computing `current_period_end` when the
-- `finished` IPN arrives.
--
-- Non-destructive: legacy Creem rows keep their `stripe_*` values for audit.
-- New NOWPayments rows write `nowpayments_invoice_id` / `nowpayments_payment_id`
-- and leave `stripe_*` NULL.

-- ============================================================================
-- 1. subscriptions: relax stripe_* NOT NULL (no longer written for new rows),
--    add NOWPayments columns + payment_provider discriminator.
-- ============================================================================

ALTER TABLE public.subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN stripe_subscription_id DROP NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS nowpayments_invoice_id text,
  ADD COLUMN IF NOT EXISTS nowpayments_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'nowpayments';

-- Allow 'nowpayments' alongside legacy 'creem' values (payment_provider is a
-- free text column; no CHECK constraint added to keep it forward-compatible).
COMMENT ON COLUMN public.subscriptions.payment_provider IS 'Payment channel that created this subscription: "nowpayments" (current) or "creem" (legacy, kept for historical rows).';
COMMENT ON COLUMN public.subscriptions.nowpayments_invoice_id IS 'NOWPayments invoice ID (from POST /v1/invoice). Used as the primary lookup key for IPN callbacks.';
COMMENT ON COLUMN public.subscriptions.nowpayments_payment_id IS 'NOWPayments payment ID (set when the finished IPN arrives).';

COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'LEGACY — Creem customer ID. No longer written for new rows. Kept for historical audit.';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'LEGACY — Creem subscription ID. No longer written for new rows. Kept for historical audit.';

-- Partial unique index: each NOWPayments invoice maps to exactly one subscription row.
-- NULL invoice_ids (legacy Creem rows) do not conflict with each other.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_nowpayments_invoice
  ON public.subscriptions(nowpayments_invoice_id)
  WHERE nowpayments_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_nowpayments_payment
  ON public.subscriptions(nowpayments_payment_id)
  WHERE nowpayments_payment_id IS NOT NULL;


-- ============================================================================
-- 2. RPC: downgrade_expired_subscriptions
--    Called daily by the billing cron. Scans subscriptions whose
--    current_period_end < now() AND status = 'active', marks them canceled,
--    and downgrades the user's API keys to free — BUT only if the user has
--    NO other active, unexpired subscription (handles the renewal overlap
--    case where a fresh subscription coexists with an expiring one).
--
--    Mirrors the pattern of downgrade_expired_trials (migration 0014):
--    SECURITY DEFINER, returns the affected row count via GET DIAGNOSTICS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.downgrade_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Single statement with three CTEs:
  --   1. expired: mark active-but-past-period rows as canceled, return user_ids
  --   2. to_downgrade: users from (1) who have NO remaining active+unexpired
  --      subscription (i.e. they didn't renew). The NOT EXISTS subquery sees
  --      the statement-start snapshot, where expired rows still have
  --      period_end < now, so they correctly don't count as "remaining".
  --   3. updated_keys: downgrade those users' API keys to free, count rows.
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
    SET plan = 'free',
        rate_limit = 5,
        trial_ends_at = NULL,
        updated_at = now()
    WHERE k.user_id IN (SELECT user_id FROM to_downgrade)
      AND k.plan IN ('pro', 'protocol')
      AND k.is_active = true
    RETURNING k.id
  )
  SELECT count(*) INTO v_count FROM updated_keys;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.downgrade_expired_subscriptions() OWNER TO "postgres";

COMMENT ON FUNCTION public.downgrade_expired_subscriptions() IS 'Daily cron: cancel subscriptions past their period_end and downgrade API keys to free for users with no remaining active subscription. Returns the number of API keys downgraded.';


-- ============================================================================
-- 3. RPC: cleanup_incomplete_subscriptions
--    Marks subscription rows stuck in "incomplete" status (user abandoned
--    checkout, or IPN was lost) as canceled after 24 hours. Prevents the
--    subscriptions table from accumulating zombie incomplete rows.
--    Returns the number of rows cleaned up.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_incomplete_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE status = 'incomplete'
    AND created_at < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.cleanup_incomplete_subscriptions() OWNER TO "postgres";

COMMENT ON FUNCTION public.cleanup_incomplete_subscriptions() IS 'Daily cron: cancel incomplete subscription rows older than 24 hours (abandoned checkouts or lost IPNs). Returns the number of rows cleaned up.';
