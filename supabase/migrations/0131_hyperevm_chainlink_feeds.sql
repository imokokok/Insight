-- ─── Chainlink USD feeds on HyperEVM mainnet (chainId 999) ────────────────────
-- 2026-11-08: HyperEVM was already sellable on the x402 rail (USDC/999) for the
-- multichain data and subscription tools, but neither the Blockchain enum nor
-- the Chainlink catalog contained 999, so those tools could take payment yet
-- could not resolve a price. This seeds the USD-quoted Standard Proxy feeds.
--
-- Source: https://reference-data-directory.vercel.app/feeds-hyperliquid-mainnet.json
-- (32 public entries, verified 2026-11-08). Only Standard Proxies for USD pairs
-- are registered here:
--   • 15 SVR/OEV entries are excluded (their 18-decimal proxies are for OEV,
--     normal reads must use the Standard Proxy; decimals are still read live
--     from decimals() at request time). uSOL exists only as an SVR proxy in the
--     directory and is therefore not registered as a USD feed.
--   • Non-USD exchange-rate feeds (BEHYPE/HYPE, WSTHYPE/STHYPE, WHLP/USDT0,
--     KHYPE/HYPE) are excluded because serving them as USD prices would be
--     wrong.
--
-- Empirical basis (live eth_call against https://rpc.hyperliquid.xyz/evm,
-- 2026-11-08): BTC/USD = 0x71A2…7A82 dec=8, ETH/USD = 0x0171…55B0 dec=8 with
-- updatedAt ~21h old under its 86400s heartbeat, HYPE/USD = 0xa5a7…d352 dec=8.
-- KHYPE/USD is 18-decimal, which is why decimals must never be hardcoded to 8.
--
-- Idempotent (ON CONFLICT DO UPDATE) — safe to re-apply / re-run via db push.

INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('chainlink', 'BTC', 999, '0x71A2017296De30F4597B36FBD90b7e8Ec6E97A82', 'BTC / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"btc-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'ETH', 999, '0x017151e74fB3a393673B5B5149F53578c0Fa55B0', 'ETH / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"eth-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'HYPE', 999, '0xa5a72eF19F82A579431186402425593a559ed352', 'HYPE / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"hype-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'KHYPE', 999, '0xC66B2fbDE3879b6Dd9E7a5c6359037CE773D9bcc', 'KHYPE / USD', 18, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"khype-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'SOL', 999, '0x20935EE640be2F556E6f45F7C9092364C464224D', 'SOL / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"sol-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'SUSDE', 999, '0xff8d73F413f0093a14190A987883B5101d7855Dd', 'SUSDE / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"susde-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'THBILL', 999, '0x7B1bf1044C381aA77b2f06Dc93fABe009cEdd6bD', 'THBILL / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"thbill-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'UBTC', 999, '0xd7752D8831a209F5177de52b3b32b5098A7B56b8', 'UBTC / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"ubtc-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'UETH', 999, '0x54EdE484Bb0E589F5eE13e04c84f46eb787c9C6a', 'UETH / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"ueth-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'USDC', 999, '0xA0Adc43ce7AfE3EE7d7eac3C994E178D0620223B', 'USDC / USD', 8, 'stablecoin', true, 'catalog', '{"heartbeat":86400,"path":"usdc-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'USDE', 999, '0x4a3b26809f17fD22ba4c345e4C15d2d89bDa83ee', 'USDE / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"usde-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'USDT', 999, '0x9114446540B4f8E0E310041981f7c1Be6181Ed07', 'USDT / USD', 8, 'stablecoin', true, 'catalog', '{"heartbeat":86400,"path":"usdt-usd","source":"feeds-hyperliquid-mainnet.json"}'),
  ('chainlink', 'XAUT', 999, '0x8908213aaFCaD07d928288e6DF1635720fe3F456', 'XAUT / USD', 8, 'crypto', true, 'catalog', '{"heartbeat":86400,"path":"xaut-usd","source":"feeds-hyperliquid-mainnet.json"}')
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
