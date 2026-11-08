-- Migration 0132: snapshot Oracle Watch window terms at purchase.
--
-- Numbering: 0131 is claimed on feat/hyperevm-chainlink by
-- 0131_hyperevm_chainlink_feeds.sql (the HyperEVM Chainlink 999 feed backfill),
-- so this migration takes the next free number. Deploy both migrations; their
-- order is independent (different tables), but neither may be skipped:
--   1. 0131_hyperevm_chainlink_feeds.sql  — oracle_feeds backfill for chain 999
--   2. 0132_oracle_watch_window_terms.sql — oracle_watch_windows terms snapshot
--
-- The window plan moved from 300 polls / 30-second minimum interval to
-- 48 polls / 30-minute minimum interval. Existing windows must keep the terms
-- they were sold under: this migration backfills every existing row with the
-- old values, while new rows write the new plan values explicitly in
-- src/lib/api/services/oracleWatchWindowService.ts.
--
-- Idempotent and safe on databases that never had these columns: the columns
-- are added without constraints, NULLs are backfilled, then the defaults and
-- NOT NULL constraints are applied. Re-running the migration is a no-op for
-- already-migrated rows and never rewrites a snapshotted term.

BEGIN;

ALTER TABLE "public"."oracle_watch_windows"
    ADD COLUMN IF NOT EXISTS "poll_cap" integer,
    ADD COLUMN IF NOT EXISTS "min_poll_interval_seconds" integer;

-- Legacy rows (and rows sold before this deploy) keep the old terms.
UPDATE "public"."oracle_watch_windows"
SET "poll_cap" = 300
WHERE "poll_cap" IS NULL;

UPDATE "public"."oracle_watch_windows"
SET "min_poll_interval_seconds" = 30
WHERE "min_poll_interval_seconds" IS NULL;

ALTER TABLE "public"."oracle_watch_windows"
    ALTER COLUMN "poll_cap" SET DEFAULT 300,
    ALTER COLUMN "poll_cap" SET NOT NULL,
    ALTER COLUMN "min_poll_interval_seconds" SET DEFAULT 30,
    ALTER COLUMN "min_poll_interval_seconds" SET NOT NULL;

COMMENT ON COLUMN "public"."oracle_watch_windows"."poll_cap" IS
    'Poll budget snapshotted at purchase; rows sold before 0132 keep 300.';
COMMENT ON COLUMN "public"."oracle_watch_windows"."min_poll_interval_seconds" IS
    'Minimum poll interval snapshotted at purchase; rows sold before 0132 keep 30 seconds.';

COMMIT;
