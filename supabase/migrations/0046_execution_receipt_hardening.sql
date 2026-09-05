-- Migration 0046: make Execution Receipts durable and reconstructable.
-- A UID is a digest, not object storage: persist the complete signed envelope.

BEGIN;

ALTER TABLE public.execution_receipts
  ADD COLUMN IF NOT EXISTS destination_pre_trade_uid text,
  ADD COLUMN IF NOT EXISTS binding_mode text,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS receipt_payload jsonb;

COMMENT ON COLUMN public.execution_receipts.receipt_payload IS
  'Complete signed ExecutionReceipt envelope, including data, EIP-712 descriptor and signature. The UID alone cannot reconstruct this payload.';

COMMENT ON TABLE public.execution_receipts IS
  'Durable complete Execution Receipt evidence store. Issuance waits for an idempotent upsert before returning the signed envelope.';

CREATE INDEX IF NOT EXISTS execution_receipts_destination_pre_trade_uid_idx
  ON public.execution_receipts (destination_pre_trade_uid)
  WHERE destination_pre_trade_uid IS NOT NULL;

-- PostgREST upsert needs a non-partial unique target. PostgreSQL still permits
-- multiple NULL values, so this preserves legacy unsigned rows.
DROP INDEX IF EXISTS public.execution_receipts_uid_key;
CREATE UNIQUE INDEX execution_receipts_uid_key
  ON public.execution_receipts (uid);

DROP POLICY IF EXISTS users_view_own_execution_receipts ON public.execution_receipts;
CREATE POLICY users_view_own_execution_receipts ON public.execution_receipts
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );

COMMIT;
