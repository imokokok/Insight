-- Add chain-aware uniqueness to hourly_price_snapshots.
-- The daily-report cron now samples multi-chain providers (e.g. API3 on
-- BSC/Polygon/Arbitrum, Chainlink on Ethereum/Arbitrum/Base) per feed chain,
-- so the previous unique key (snapshot_hour, provider, symbol) would collide.

-- 1. Add chain_id to track which chain a snapshot was sampled from.
--    chain_id=0 means chain-agnostic / legacy rows (Pyth, Supra, DIA, RedStone
--    and any rows written before this migration).
ALTER TABLE "public"."hourly_price_snapshots"
    ADD COLUMN IF NOT EXISTS "chain_id" integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN "public"."hourly_price_snapshots"."chain_id" IS 'Chain ID the snapshot was sampled from (0 for chain-agnostic or legacy rows).';

-- 2. Migrate existing rows to a deterministic chain_id where possible.
--    chain-agnostic providers store chain_id=0; otherwise fall back to the
--    provider's default chain so legacy rows remain addressable.
UPDATE "public"."hourly_price_snapshots"
SET "chain_id" = CASE
    WHEN "provider" IN ('pyth', 'supra', 'dia', 'redstone') THEN 0
    WHEN "provider" = 'chainlink' THEN 1
    WHEN "provider" = 'api3' THEN 1
    WHEN "provider" = 'winklink' THEN 56
    WHEN "provider" = 'twap' THEN 1
    WHEN "provider" = 'reflector' THEN 0
    WHEN "provider" = 'flare' THEN 14
    ELSE 0
END
WHERE "chain_id" = 0;

-- 3. Drop the old provider/symbol-level unique constraint.
ALTER TABLE "public"."hourly_price_snapshots"
    DROP CONSTRAINT IF EXISTS "hourly_price_snapshots_snapshot_hour_provider_symbol_key";

-- 4. Add the new chain-aware unique constraint.
ALTER TABLE "public"."hourly_price_snapshots"
    ADD CONSTRAINT "hourly_price_snapshots_hour_provider_symbol_chain_uq"
    UNIQUE ("snapshot_hour", "provider", "symbol", "chain_id");

-- 5. Index for chain-filtered reads (dashboards, V1 APIs, reports).
CREATE INDEX IF NOT EXISTS "idx_hourly_price_snapshots_chain_id"
    ON "public"."hourly_price_snapshots" ("chain_id");
