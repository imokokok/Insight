-- A NOWPayments invoice can accept a later payment even after an individual
-- payment expires. Only orders for which invoice creation never succeeded may
-- be cleaned up by age.
BEGIN;

CREATE OR REPLACE FUNCTION public.cleanup_incomplete_subscriptions()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscriptions
     SET status = 'canceled', updated_at = now()
   WHERE status = 'incomplete'
     AND nowpayments_invoice_id IS NULL
     AND created_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.cleanup_incomplete_subscriptions() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.cleanup_incomplete_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_incomplete_subscriptions() TO service_role;

-- Earlier versions canceled invoice-backed orders on a payment-level
-- expired/failed event or the 24-hour cleanup. Rows with a completed payment
-- retain their payment ID and are deliberately excluded (refund/expiry audit).
UPDATE public.subscriptions
   SET status = 'incomplete', updated_at = now()
 WHERE status = 'canceled'
   AND nowpayments_invoice_id IS NOT NULL
   AND nowpayments_payment_id IS NULL;

UPDATE public.credit_purchases
   SET status = 'incomplete', updated_at = now()
 WHERE status = 'canceled'
   AND nowpayments_invoice_id IS NOT NULL
   AND nowpayments_payment_id IS NULL;

COMMENT ON FUNCTION public.cleanup_incomplete_subscriptions() IS
  'Cancel only old incomplete orders for which no NOWPayments invoice was ever created; payable invoices remain open.';

COMMIT;
