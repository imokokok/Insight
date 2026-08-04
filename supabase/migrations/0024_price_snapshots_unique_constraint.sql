-- Migration 0024: Unique constraint on price_snapshots
--
-- The price_snapshots table (added in 0023) had no UNIQUE constraint, so a
-- retried cron run or a race within the same process could insert duplicate
-- rows for the same (snapshot_ts, provider, symbol, chain_id). Duplicates
-- pollute ML training data (duplicate samples bias the model) and inflate
-- anomaly-detection counts.
--
-- This migration:
--   1. Deduplicates existing rows (keeps the earliest by id).
--   2. Adds a UNIQUE constraint so future duplicate inserts are rejected.
--
-- The collect-snapshot script is changed to use upsert(ignoreDuplicates: true)
-- so a retry silently no-ops instead of erroring.

BEGIN;

-- ─── 1. Deduplicate existing rows ───────────────────────────────────
-- Keep the row with the smallest id (earliest insert) per natural key.
DELETE FROM public.price_snapshots a
USING public.price_snapshots b
WHERE a.id > b.id
  AND a.snapshot_ts = b.snapshot_ts
  AND a.provider = b.provider
  AND a.symbol = b.symbol
  AND a.chain_id = b.chain_id;

-- ─── 2. Add UNIQUE constraint ───────────────────────────────────────
ALTER TABLE public.price_snapshots
  ADD CONSTRAINT price_snapshots_ts_provider_symbol_chain_key
  UNIQUE (snapshot_ts, provider, symbol, chain_id);

COMMIT;
