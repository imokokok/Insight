-- 0060_band_protocol_v3_feeds.sql
--
-- Seed the committed BandChain v3 Concurrent Price Stream fallback universe.
-- Live discovery remains authoritative and may add or deactivate signals, but
-- these rows make Band usable immediately after a database migration instead
-- of waiting for the weekly discovery job.
--
-- Band signal IDs are not EVM contract addresses. chain_id = 0 deliberately
-- identifies BandChain/non-EVM evidence; callers must not relabel a REST
-- observation as evidence produced on their requested EVM chain.

WITH band_crypto(symbol) AS (
  SELECT unnest(ARRAY[
    '1INCH', 'AAVE', 'ADA', 'ASTR', 'ATOM', 'AVAX', 'BAND', 'BAT', 'BNB',
    'BTC', 'BTT', 'CAKE', 'CELO', 'COTI', 'CRO', 'CRV', 'DAI', 'DOGE',
    'DOT', 'DYDX', 'ETH', 'FLOW', 'GCOTI', 'GLMR', 'ICX', 'INJ', 'JST',
    'KNC', 'LINK', 'LTC', 'NFT', 'NIGHT', 'OKB', 'ONE', 'OP', 'OSMO',
    'POL', 'PYUSD', 'RLUSD', 'ROSE', 'S', 'SCRT', 'SHIB', 'SOL', 'SUI',
    'SUN', 'SUSHI', 'TIA', 'TRX', 'TUSD', 'UNI', 'USDC', 'USDT', 'WBTC',
    'XLM', 'XRP'
  ]::text[])
),
band_fiat(symbol) AS (
  SELECT unnest(ARRAY[
    'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'EUR', 'GBP', 'HKD', 'INR',
    'JPY', 'KRW', 'MYR', 'NZD', 'PHP', 'PLN', 'RUB', 'SEK', 'SGD', 'THB',
    'TRY', 'TWD', 'XAU'
  ]::text[])
),
band_signals AS (
  SELECT symbol, 'CS'::text AS namespace FROM band_crypto
  UNION ALL
  SELECT symbol, 'FS'::text AS namespace FROM band_fiat
)
INSERT INTO public.oracle_feeds (
  provider,
  symbol,
  chain_id,
  address,
  name,
  decimals,
  category,
  is_active,
  source,
  metadata
)
SELECT
  'band',
  symbol || '/USD',
  0,
  namespace || ':' || symbol || '-USD',
  symbol || ' / USD',
  9,
  CASE
    WHEN symbol = 'XAU' THEN 'commodity'
    WHEN namespace = 'FS' THEN 'forex'
    WHEN symbol = ANY (ARRAY['DAI', 'PYUSD', 'RLUSD', 'TUSD', 'USDC', 'USDT']) THEN 'stablecoin'
    ELSE 'crypto'
  END,
  true,
  'bandchain-v3-static-fallback',
  jsonb_build_object('signalId', namespace || ':' || symbol || '-USD')
FROM band_signals
ON CONFLICT (provider, symbol, chain_id)
DO UPDATE SET
  address = EXCLUDED.address,
  name = EXCLUDED.name,
  decimals = EXCLUDED.decimals,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  source = EXCLUDED.source,
  metadata = EXCLUDED.metadata,
  updated_at = now();

COMMENT ON COLUMN public.oracle_feeds.address IS
  'Primary feed identifier: contract address (Chainlink/WINKLink/TWAP), feed ID (Pyth/Flare), pair index as string (Supra), dAPI name (API3), asset address (DIA), contract ID (Reflector), or Band v3 signal ID';

COMMENT ON COLUMN public.oracle_feeds.metadata IS
  'Provider-specific data: {blockchain, pairIndex, feedId, dapiName, feeTier, token0, token1, contractId, signalId, ...}';
