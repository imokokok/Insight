-- Migration 0131: snapshot Oracle Watch window terms at purchase.
--
-- The window plan moved from 300 polls / 30-second minimum interval to
-- 48 polls / 30-minute minimum interval. Existing windows must keep the terms
-- they were sold under: the ALTER defaults backfill every existing row with
-- the old values, while new rows write the new plan values explicitly in
-- src/lib/api/services/oracleWatchWindowService.ts.

BEGIN;

ALTER TABLE "public"."oracle_watch_windows"
    ADD COLUMN IF NOT EXISTS "poll_cap" integer NOT NULL DEFAULT 300,
    ADD COLUMN IF NOT EXISTS "min_poll_interval_seconds" integer NOT NULL DEFAULT 30;

COMMENT ON COLUMN "public"."oracle_watch_windows"."poll_cap" IS
    'Poll budget snapshotted at purchase; existing rows keep the pre-0131 cap of 300.';
COMMENT ON COLUMN "public"."oracle_watch_windows"."min_poll_interval_seconds" IS
    'Minimum poll interval snapshotted at purchase; existing rows keep the pre-0131 interval of 30 seconds.';

COMMIT;
