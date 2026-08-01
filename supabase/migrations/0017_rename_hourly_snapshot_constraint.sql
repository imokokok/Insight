-- Rename the chain-aware unique constraint to a stable, short name.
-- The previous migration (0016) created a constraint whose auto-generated
-- name exceeded PostgreSQL's 63-byte NAMEDATALEN limit and was silently
-- truncated. This migration ensures the constraint has a predictable name
-- regardless of how the database was initialized.

-- 1. Drop the truncated constraint that was created by the original 0016
--    wording (only exists on databases that already applied that version).
ALTER TABLE "public"."hourly_price_snapshots"
    DROP CONSTRAINT IF EXISTS "hourly_price_snapshots_snapshot_hour_provider_symbol_chain_id_ke";

-- 2. Drop the target name in case a fresh database already created it
--    from the updated 0016 file.
ALTER TABLE "public"."hourly_price_snapshots"
    DROP CONSTRAINT IF EXISTS "hourly_price_snapshots_hour_provider_symbol_chain_uq";

-- 3. Recreate with the stable short name.
ALTER TABLE "public"."hourly_price_snapshots"
    ADD CONSTRAINT "hourly_price_snapshots_hour_provider_symbol_chain_uq"
    UNIQUE ("snapshot_hour", "provider", "symbol", "chain_id");
