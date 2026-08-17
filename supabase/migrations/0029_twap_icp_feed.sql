-- ─── TWAP ICP (Internet Computer) on Ethereum ────────────────────────────────
-- 2026-08-17: adds TWAP as a 3rd ICP source on Ethereum (chain 1) so ICP can
-- cross the v2 quorum (participantCount >= 3) alongside Supra (c0) + Switchboard (c0).
--
-- TWAP reads the public on-chain Uniswap V3 pool via RPC — no API key / plan /
-- license. Pool identity chain-verified: 0xd62c876E09B238480995a92f9364Ecdef083c36f
--   token0 = ICP (0x054b8f99d15cc5b35a42a926635977d62692f25b)
--   token1 = WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
--   feeTier = 3000
--
-- NOTE: this only wires the source. At runtime the ICP/WETH pool must hold
-- non-trivial liquidity for TWAP to return a usable price. Deploy + confirm
-- liquidity > 0 before relying on it for the Raul canary.
--
-- Idempotent (ON CONFLICT DO UPDATE) — safe to re-apply.
INSERT INTO oracle_feeds (provider, symbol, chain_id, address, name, decimals, category, is_active, source, metadata)
VALUES
  ('twap', 'ICP', 1,
   '0xd62c876E09B238480995a92f9364Ecdef083c36f',
   'ICP/WETH', 18, 'crypto', true, 'hardcoded',
   '{"feeTier":3000,"token0":"ICP","token1":"WETH"}')
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
