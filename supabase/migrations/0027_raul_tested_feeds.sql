-- 0027_raul_tested_feeds.sql
--
-- Seed oracle_feeds rows for assets Raul (ThoughtProof) tested that Insight was
-- missing coverage for. Mirrors the code changes in:
--   - src/lib/oracles/constants/switchboardConstants.ts  (switchboardSymbols + SWITCHBOARD_FEED_IDS)
--   - src/lib/oracles/constants/supportedSymbols.ts     (redstoneSymbols)
--
-- Idempotent: re-applying (e.g. after a manual SQL Editor paste) only updates
-- the same rows via ON CONFLICT, so it is safe to run more than once.
--
-- Sources:
--   * Switchboard WEIGHTED/USD Surge feed hashes, pulled from the live catalogue
--     (GET /stream/surge_feeds) and each verified via GET /v2/update/{hash} -> 200.
--   * RedStone symbols are fetched by symbol (address = symbol).

-- ─── Switchboard (chain-agnostic c0) ─────────────────────────────────────────
INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('switchboard', 'STG',    0, 'fd7a2e4bac42db5ca96a8a50592aedbe5101c87ca46bb8da1565fe9a99102056', 'STG/USD',     18, 'crypto',     true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"fd7a2e4bac42db5ca96a8a50592aedbe5101c87ca46bb8da1565fe9a99102056","source_type":"surge-weighted"}'),
  ('switchboard', 'TAO',    0, '3a06687cf8ccf9c5155c33b4faa539d2aab759447dd46bcf4a87f6a8363a7ba5', 'TAO/USD',     18, 'crypto',     true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"3a06687cf8ccf9c5155c33b4faa539d2aab759447dd46bcf4a87f6a8363a7ba5","source_type":"surge-weighted"}'),
  ('switchboard', 'POPCAT', 0, 'e3cfb81941ca1dec019eec5a29d686fdde6e2d51e2b13f33a68cde2b72c72cc0', 'POPCAT/USD',  18, 'crypto',     true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"e3cfb81941ca1dec019eec5a29d686fdde6e2d51e2b13f33a68cde2b72c72cc0","source_type":"surge-weighted"}'),
  ('switchboard', 'PYUSD',  0, '9ac21ccc4e8778c25119fa13a1e876f24a4bc42ca4f5912a05bec75759fa66d9', 'PYUSD/USD',   18, 'stablecoin',  true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"9ac21ccc4e8778c25119fa13a1e876f24a4bc42ca4f5912a05bec75759fa66d9","source_type":"surge-weighted"}'),
  ('switchboard', 'VVV',    0, '422f7dfd33dbe4066716777ac1a0e740009672d33fae47c66a5c0bbe70f13d1f', 'VVV/USD',     18, 'crypto',     true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"422f7dfd33dbe4066716777ac1a0e740009672d33fae47c66a5c0bbe70f13d1f","source_type":"surge-weighted"}'),
  ('switchboard', 'USDD',   0, '3922ac076865b648c1e5fac88deed65127f2496ba91ff3d7ba85c8a852f6b381', 'USDD/USD',    18, 'stablecoin',  true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"3922ac076865b648c1e5fac88deed65127f2496ba91ff3d7ba85c8a852f6b381","source_type":"surge-weighted"}'),
  ('switchboard', 'WIF',    0, '4195292b62f36aa94717ed48d3309fff60f1499c96f9dcf65165b85fc9ceeb96', 'WIF/USD',     18, 'crypto',     true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"4195292b62f36aa94717ed48d3309fff60f1499c96f9dcf65165b85fc9ceeb96","source_type":"surge-weighted"}'),
  ('switchboard', 'XRP',    0, '4403dfe267ac4f30e15c10e21fb8ddfc4a4d42f69f2ca3d88c18c657f0ff8710', 'XRP/USD',     18, 'crypto',     true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"4403dfe267ac4f30e15c10e21fb8ddfc4a4d42f69f2ca3d88c18c657f0ff8710","source_type":"surge-weighted"}'),
  ('switchboard', 'FRAX',   0, '15eef02c4b3a0d1c3d830756d483ec265eee9b403952ea468de649d32c63f2b5', 'FRAX/USD',    18, 'stablecoin',  true, 'switchboard-crossbar', '{"quote":"USD","feedHash":"15eef02c4b3a0d1c3d830756d483ec265eee9b403952ea468de649d32c63f2b5","source_type":"surge-weighted"}')
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

-- ─── RedStone (chain-agnostic c0, fetched by symbol) ────────────────────────
-- Active: confirmed served by RedStone's `redstone-rapid` feed (verified 200).
-- Inactive (ICP, STG): RedStone's rapid feed returns HTTP 500 for these — kept
-- as rows but disabled so they are not reported as live coverage they cannot give.
INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source)
VALUES
  ('redstone', 'TAO',   0, 'TAO',    'TAO/USD',    8, 'crypto',    true,  'redstone-live-verified'),
  ('redstone', 'HYPE',  0, 'HYPE',   'HYPE/USD',   8, 'crypto',    true,  'redstone-live-verified'),
  ('redstone', 'MEGA',  0, 'MEGA',   'MEGA/USD',   8, 'crypto',    true,  'redstone-live-verified'),
  ('redstone', 'PYUSD', 0, 'PYUSD',  'PYUSD/USD',  8, 'stablecoin', true, 'redstone-live-verified'),
  ('redstone', 'ICP',   0, 'ICP',    'ICP/USD',    8, 'crypto',    false, 'redstone-live-verified'),
  ('redstone', 'STG',   0, 'STG',    'STG/USD',    8, 'crypto',    false, 'redstone-live-verified')
ON CONFLICT (provider, symbol, chain_id)
DO UPDATE SET
  address   = EXCLUDED.address,
  name      = EXCLUDED.name,
  decimals  = EXCLUDED.decimals,
  category  = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  source    = EXCLUDED.source,
  updated_at = now();
