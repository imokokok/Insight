-- ─── Chainlink TBTC feed on Ethereum mainnet ──────────────────────────────────
-- 2026-08-22: restore the chainlink/TBTC oracle feed so tBTC collateral positions
-- in the pre-trade safety check resolve instead of 500-ing with
-- "Failed to fetch prices for: chainlink/tBTC".
--
-- Root cause: the committed Chainlink catalog (chainlinkCatalog.json, v2026-08-18)
-- already lists TBTC on chain 1 with the correct, healthy proxy address, but the
-- discovery/verify pass never wrote a chainlink/TBTC row into oracle_feeds. The
-- sync lookup resolves feeds DB-first; with no DB row AND a warm in-memory cache
-- (which is seeded only from the DB) the catalog fallback was never reached, so
-- TBTC was permanently unresolvable. See chainlinkDataSources/index.ts
-- getChainlinkPriceFeed — the cache-miss fallback to the catalog is now restored,
-- and this row makes the DB authoritative for TBTC as well.
--
-- Empirical basis (live on-chain read, 2026-08-22): proxy 0x8350b7De6a6a2C1368E7D4Bd968190e13E354297
-- serves "TBTC / USD", decimals 8, price ~$77,694, fresh (sub-day updatedAt).
--
-- Idempotent (ON CONFLICT DO UPDATE) — safe to re-apply / re-run via db push.

INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('chainlink', 'TBTC', 1, '0x8350b7De6a6a2C1368E7D4Bd968190e13E354297', 'TBTC / USD', 8, 'crypto', true, 'catalog',
   '{"note":"tBTC v2 feed on Ethereum mainnet"}')
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
