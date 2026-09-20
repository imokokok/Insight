-- Add the verified Base USDC/WETH Uniswap V3 pool to the authoritative feed
-- registry. The TWAP discovery path only verifies existing database rows, so a
-- migration is required before this new hardcoded pool can participate in
-- production consensus and Coverage SLO sampling.
--
-- Verified on 2026-09-21:
--   factory: 0x33128a8fC17869897dcE68Ed026d694621f6FDfD
--   pool:    0x6c561B446416E1A00E8E93E221854d6eA4171372
--   pair:    WETH/USDC, fee tier 3000
--   checks:  factory getPool match, non-zero liquidity, observe([1800, 0])

BEGIN;

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
  metadata,
  consecutive_failures,
  deactivated_reason,
  deactivated_at,
  absent_discovery_runs,
  last_discovery_at
)
VALUES (
  'twap',
  'USDC',
  8453,
  '0x6c561B446416E1A00E8E93E221854d6eA4171372',
  'WETH/USDC',
  18,
  'stablecoin',
  true,
  'hardcoded',
  '{"feeTier":3000,"token0":"WETH","token1":"USDC","verification":"factory+liquidity+observe-1800","verifiedAt":"2026-09-21"}'::jsonb,
  0,
  NULL,
  NULL,
  0,
  now()
)
ON CONFLICT (provider, symbol, chain_id)
DO UPDATE SET
  address = EXCLUDED.address,
  name = EXCLUDED.name,
  decimals = EXCLUDED.decimals,
  category = EXCLUDED.category,
  is_active = true,
  source = EXCLUDED.source,
  metadata = EXCLUDED.metadata,
  consecutive_failures = 0,
  deactivated_reason = NULL,
  deactivated_at = NULL,
  absent_discovery_runs = 0,
  last_discovery_at = now(),
  updated_at = now();

COMMIT;
