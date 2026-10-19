-- A vendor's permission to collect a market-data feed is distinct from
-- permission to deliver the underlying quote to customers. Store that boundary
-- with every observation so downstream data products can fail closed.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.market_reference_snapshots
  ADD COLUMN IF NOT EXISTS delivery_policy text NOT NULL DEFAULT 'not-authorized';

ALTER TABLE public.market_reference_snapshots
  DROP CONSTRAINT IF EXISTS market_reference_snapshots_delivery_policy_check;
ALTER TABLE public.market_reference_snapshots
  ADD CONSTRAINT market_reference_snapshots_delivery_policy_check
  CHECK (delivery_policy IN (
    'not-authorized',
    'derived-analytics-only',
    'raw-data-permitted'
  ));

ALTER TABLE public.market_reference_snapshots
  DROP CONSTRAINT IF EXISTS market_reference_snapshots_vendor_delivery_policy_check;
ALTER TABLE public.market_reference_snapshots
  ADD CONSTRAINT market_reference_snapshots_vendor_delivery_policy_check
  CHECK (
    rights_scope <> 'vendor-licensed'
    OR delivery_policy IN ('derived-analytics-only', 'raw-data-permitted')
  );

COMMENT ON COLUMN public.market_reference_snapshots.delivery_policy IS
  'Vendor delivery boundary captured at collection. derived-analytics-only permits Insight analyses but prohibits external raw-market-data delivery; raw-data-permitted requires express written vendor permission.';

COMMIT;
