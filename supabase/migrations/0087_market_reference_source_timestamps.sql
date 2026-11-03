-- Migration 0087: preserve source-side observation time for licensed CEX feeds.
--
-- Apply this migration before enabling Bitstamp, Bitfinex, or Binance in
-- MARKET_REFERENCE_LICENSED_EXCHANGES. Existing observations remain NULL;
-- the collector writes this field only when the exchange exposes a validated
-- source timestamp.

BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.market_reference_snapshots
  ADD COLUMN IF NOT EXISTS source_observed_at timestamptz;

COMMENT ON COLUMN public.market_reference_snapshots.source_observed_at IS
  'Exchange-side observation timestamp when available and validated. Bitstamp uses the ticker timestamp; Bitfinex uses the latest public trade timestamp; Binance uses the older trade timestamp across the WBTC/USDT and USDT/USD legs. NULL for legacy and sources without a verified source time.';

COMMENT ON COLUMN public.market_reference_snapshots.exchange IS
  'CEX source: coinbase | kraken | gemini | crypto.com | bitstamp | bitfinex | binance. Crypto.com is collected only for direct WBTC/USD spot; Binance WBTC/USD is explicitly derived from its WBTC/USDT and USDT/USD spot markets; optional Bitstamp, Bitfinex, and Binance collection requires written commercial data permission.';

COMMIT;
