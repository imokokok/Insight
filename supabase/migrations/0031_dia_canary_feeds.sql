-- ─── DIA feeds for the Raul canary set (HYPE / ICP / VVV / STG) ───────────────
-- 2026-08-18: activate DIA as a third, key-free oracle source for these four so
-- they can clear the v2 quorum gate (participantCount >= 3) and shed the
-- single-provider failure mode on Ethereum.
--
-- Empirical basis (live DIA API, repeated pulls, 0% price spread, no collision):
--   HYPE  -> Blockchain=Hyperliquid      Address=0x0d01dc56dcaaca66ad901c959b4011ec  ~$59.1
--   ICP   -> Blockchain=InternetComputer  Address=ryjl3-tyaaa-aaaaa-aaaba-cai          ~$2.27
--   VVV   -> Blockchain=Base              Address=0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf ~$12.6
--   STG   -> Blockchain=Ethereum          Address=0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6 ~$0.142
--
-- NOTE on migration 0030: it left DIA/ICP inactive citing a symbol-endpoint flap
-- to an ETH-price match (~$1898). Re-testing on 2026-08-18 shows DIA now serves
-- ICP stably at the correct ~$2.27 (no flap), so ICP is safe to activate here.
--
-- metadata.blockchain is the load-bearing field: getDIAAssetConfigAsync() reads
-- it and routes getAssetPrice to the precise `assetQuotation/{blockchain}/{address}`
-- endpoint (collision-proof) rather than the `/quotation/{symbol}` fallback.
-- HYPE/ICP are native L1 tokens with no ERC-20, so their address is the chain-
-- native identifier DIA indexes them under — NOT an Ethereum contract.
--
-- Idempotent (ON CONFLICT DO UPDATE) — safe to re-apply.

INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('dia', 'HYPE', 0, '0x0d01dc56dcaaca66ad901c959b4011ec', 'HYPE/USD', 8, 'crypto', true, 'dia-live-verified',
   '{"blockchain":"Hyperliquid"}'),
  ('dia', 'ICP', 0, 'ryjl3-tyaaa-aaaaa-aaaba-cai', 'ICP/USD', 8, 'crypto', true, 'dia-live-verified',
   '{"blockchain":"InternetComputer"}'),
  ('dia', 'VVV', 0, '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf', 'VVV/USD', 8, 'crypto', true, 'dia-live-verified',
   '{"blockchain":"Base"}'),
  ('dia', 'STG', 0, '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6', 'STG/USD', 8, 'crypto', true, 'dia-live-verified',
   '{"blockchain":"Ethereum"}')
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
