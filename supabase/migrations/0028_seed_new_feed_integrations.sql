-- 0028_seed_new_feed_integrations.sql
--
-- Seed oracle_feeds rows for the new oracle feed integrations added in the
-- recent commits that the `feed-discovery.yml` GitHub Action CANNOT write on
-- its own.
--
-- Root cause: `feed-discovery.yml` runs `scripts/sync-feeds.ts` in `discover`
-- mode. For providers with a live-API discoverer (chainlink/supra/dia/redstone/
-- api3/flare/switchboard) discovery fetches the live catalogue and upserts new
-- feeds. But for winklink / twap / twap-token / reflector the "discover" path is
-- only `verifyExistingFeeds()` — it re-verifies ALREADY-active DB rows and adds
-- NOTHING new. Those providers' rows are only ever written by `seed` mode
-- (`feedSyncService.fullSync`), which the workflow does NOT run.
--
-- So the new feeds committed for these providers live ONLY in hardcoded
-- constants (used as a DB-empty fallback) and are absent from the `oracle_feeds`
-- table. Because `resolveProvidersForSymbol` (consensus / pre-trade quorum)
-- requires a DB-verified active row once a provider has ANY active feed, those
-- new symbols are silently excluded from cross-oracle coverage.
--
-- This migration makes them explicit, reproducible DB rows — mirroring how
-- 0027 seeded the Switchboard/RedStone Raul set. It must be applied separately
-- from the weekly action (via `supabase db push` or a SQL Editor paste).
--
-- Idempotent: re-applying only updates the same rows via ON CONFLICT, so it is
-- safe to run more than once.

-- ─── WINkLink (TRON mainnet, chain-agnostic c0) ───────────────────────────────
-- Added 2026-08-16 (commit 5496fef3): verified-live TRON mainnet USD feeds.
INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('winklink', 'U',       0, 'TX6DsYNoMurRqnY9tRHuj4MnBoW76jVKa3', 'U-USD',        8, 'crypto',     true, 'hardcoded', NULL),
  ('winklink', 'BTTOLD',  0, 'TEEnwU47Fgx4Ehii7Xs9bLWK3XKo4fs6sV', 'BTTOLD-USD',   8, 'crypto',     true, 'hardcoded', NULL),
  ('winklink', 'SUNOLD',  0, 'TEEuSdqyv2NFREtNoUXMTDSmJVK3KCuLac', 'SUNOLD-USD',   8, 'crypto',     true, 'hardcoded', NULL)
ON CONFLICT (provider, symbol, chain_id)
DO UPDATE SET
  address   = EXCLUDED.address,
  name      = EXCLUDED.name,
  decimals  = EXCLUDED.decimals,
  category  = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  source    = EXCLUDED.source,
  updated_at = now();

-- ─── Reflector (Stellar, chain-agnostic c0) ──────────────────────────────────
-- Added 2026-08-16 (commit 6437613a): 24 forex/commodity feeds restored from the
-- live Pulse contract. All share the forex contract; decimals = 14.
-- category mirrors getAssetClass(); XAU resolves to 'commodity' (contractType
-- stays 'crypto' per seedReflectorFeedsFromHardcoded's rule).
INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('reflector', 'EUR',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'EUR/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'GBP',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'GBP/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'CAD',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'CAD/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'BRL',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'BRL/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'JPY',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'JPY/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'CNY',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'CNY/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'MXN',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'MXN/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'KRW',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'KRW/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'TRY',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'TRY/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'ARS',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'ARS/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'PEN',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'PEN/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'VES',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'VES/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'CLP',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'CLP/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'CRC',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'CRC/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'CDF',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'CDF/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'COP',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'COP/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'HKD',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'HKD/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'INR',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'INR/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'NGN',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'NGN/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'PHP',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'PHP/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'RUB',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'RUB/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'ZAR',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'ZAR/USD',   14, 'forex',     true, 'hardcoded', '{"contractType":"forex"}'),
  ('reflector', 'XAU',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'XAU/USD',   14, 'commodity', true, 'hardcoded', '{"contractType":"crypto"}'),
  ('reflector', 'KES',  0, 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC', 'KES/USD',   14, 'crypto',    true, 'hardcoded', '{"contractType":"crypto"}')
ON CONFLICT (provider, symbol, chain_id)
DO UPDATE SET
  address   = EXCLUDED.address,
  name      = EXCLUDED.name,
  decimals  = EXCLUDED.decimals,
  category  = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  source    = EXCLUDED.source,
  updated_at = now();

-- ─── TWAP (Uniswap V3 pools, multi-chain) ────────────────────────────────────
-- Added 2026-08-16 (commit 624b1014): 13 verified pools. decimals = 18;
-- metadata carries the pool fee tier + token pair (consumed by the TWAP price
-- client and getTwapPoolConfigAsync). All categories are 'crypto'.
INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('twap', 'MKR',   1,      '0xe8c6c9227491C0a8156A0106A0204d881BB7E531', 'MKR/WETH',  18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"MKR","token1":"WETH"}'),
  ('twap', 'COMP',  1,      '0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6', 'COMP/WETH', 18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"COMP","token1":"WETH"}'),
  ('twap', 'COMP',  42161,  '0x642E621DC9a68A3165557B58d56abdC5444faCB3', 'COMP/WETH', 18, 'crypto', true, 'hardcoded', '{"feeTier":10000,"token0":"COMP","token1":"WETH"}'),
  ('twap', 'SNX',   1,      '0xEDe8dd046586d22625Ae7fF2708F879eF7bdb8CF', 'SNX/WETH',  18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"SNX","token1":"WETH"}'),
  ('twap', 'SNX',   10,     '0x0392b358CE4547601BEFa962680BedE836606ae2', 'WETH/SNX',  18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"WETH","token1":"SNX"}'),
  ('twap', 'CRV',   1,      '0x919Fa96e88d67499339577Fa202345436bcDaf79', 'WETH/CRV',  18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"WETH","token1":"CRV"}'),
  ('twap', 'CRV',   42161,  '0xa95b0F5a65a769d82AB4F3e82842E45B8bbAf101', 'CRV/WETH',  18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"CRV","token1":"WETH"}'),
  ('twap', 'SUSHI', 1,      '0x73A6a761FE483bA19DeBb8f56aC5bbF14c0cdad1', 'SUSHI/WETH',18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"SUSHI","token1":"WETH"}'),
  ('twap', 'SUSHI', 42161,  '0xEB79e6aBFb3DCf64DA8B0967C3C61fdf57E84542', 'WETH/SUSHI',18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"WETH","token1":"SUSHI"}'),
  ('twap', 'BAL',   1,      '0xDC2c21F1B54dDaF39e944689a8f90cb844135cc9', 'BAL/WETH',  18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"BAL","token1":"WETH"}'),
  ('twap', 'LDO',   1,      '0xa3f558aebAecAf0e11cA4b2199cC5Ed341edfd74', 'LDO/WETH',  18, 'crypto', true, 'hardcoded', '{"feeTier":3000,"token0":"LDO","token1":"WETH"}'),
  ('twap', 'STETH', 1,      '0x63818BbDd21E69bE108A23aC1E84cBf66399Bd7D', 'STETH/WETH',18, 'crypto', true, 'hardcoded', '{"feeTier":10000,"token0":"STETH","token1":"WETH"}'),
  ('twap', 'RETH',  1,      '0xa4e0faA58465A2D369aa21B3e42d43374c6F9613', 'RETH/WETH', 18, 'crypto', true, 'hardcoded', '{"feeTier":500,"token0":"RETH","token1":"WETH"}')
ON CONFLICT (provider, symbol, chain_id)
DO UPDATE SET
  address   = EXCLUDED.address,
  name      = EXCLUDED.name,
  decimals  = EXCLUDED.decimals,
  category  = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  source    = EXCLUDED.source,
  metadata  = EXCLUDED.metadata,
  updated_at = now();
