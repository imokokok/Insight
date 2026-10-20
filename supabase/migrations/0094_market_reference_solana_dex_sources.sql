-- Migration 0094: Solana DEX-derived market-reference sources
--
-- Collector 1.9.0 adds jupiter (Lite tier baseline), dexscreener and
-- geckoterminal as Solana price sources (the CAIP-19 Solana registry
-- previously had CAIP-19 identity but no price provider). All three price
-- Solana SPL assets from public on-chain Solana liquidity; the `exchange`
-- column is free text, so no schema change is required. This migration only
-- refreshes the column documentation that previously named CEX venues
-- exclusively.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

COMMENT ON COLUMN public.market_reference_snapshots.exchange IS
  'Market-reference source. CEX venues: coinbase | kraken | gemini | crypto.com | bitstamp | bitfinex | binance. Solana DEX-derived venues (collector 1.9.0+): jupiter | dexscreener | geckoterminal — prices derived from public on-chain Solana liquidity for the CAIP-19 Solana registry (jupiter Lite tier is the aggregated-liquidity baseline).';

COMMIT;
