-- ─── ICP: remove the off-market TWAP pool (was a false 3rd v2 source) ────────
-- 2026-08-17 diagnostic (scripts/_diag_icp_*.ts):
--   * The TWAP ICP/WETH Uniswap V3 pool (0xd62c8…c36f) is the ONLY ICP pool on
--     Ethereum UniV3 and reports ICP ~50% above market (thin + un-arbitraged).
--     Wiring it as a 3rd source BLOCKs ICP on deviation/spread/agreement no
--     matter the v2 quorum — see migration 0029, which this supersedes.
--   * We also evaluated DIA as a replacement 3rd source. DIA's API DOES serve
--     ICP (~$2.26, within ~1% of market) BUT it FLAPS: on repeated calls it
--     returns ~$1898 (an ETH-price symbol-mapping collision), which would make
--     DIA the extreme outlier and BLOCK ICP anyway. DIA is therefore NOT a
--     reliable 3rd source — left INACTIVE. See scripts/_diag_dia_bug.ts.
--   * Exhaustive ICP source audit on Ethereum (chain 1):
--       supra      ✅ active,  ~$2.26, fresh        → participant
--       switchboard ✅ active, ~$2.26, fresh         → participant
--       flare      active but chain 14 (Flare net)  → excluded from chain-1 check
--       redstone   ❌ HTTP 500 (rapid feed)          → not viable
--       winklink   ❌ no ICP feed (only BTC/ETH/TRX) → not supported
--       reflector  ❌ inactive (Stellar)              → not applicable
--       twap       ❌ off-market +50% outlier         → removed below
--       dia        ❌ flapping / unreliable           → left inactive
--     ⇒ Only 2 trustworthy market sources exist for ICP on Ethereum, so under
--       the v2 quorum gate (≥3) ICP BLOCKs by design with INSUFFICIENT_COVERAGE.
--       This is correct safety behavior, not a code bug.
--
-- This migration ONLY deactivates the off-market twap/ICP/1 feed (row kept for
-- audit; is_active=false). It does NOT touch DIA.
--
-- Idempotent — safe to re-apply. Migration order > 0029, so a later
-- `supabase db push` cannot resurrect the off-market pool.

-- Deactivate the off-market TWAP ICP pool.
UPDATE oracle_feeds
SET is_active = false,
    updated_at = now()
WHERE provider = 'twap'
  AND symbol = 'ICP'
  AND chain_id = 1;
