-- Migration 0136: move the standalone archive retry out of the business peak.
--
-- Numbering: 0135 is `0135_archive_guard_alignment.sql`; this takes the next
-- free number (0136).
--
-- The active-client guard restored in 0135 is a single instantaneous sample:
-- three concurrent queries at that instant defer the whole run. The 05:07 UTC
-- slot (13:07 Asia/Shanghai) sits in the business peak, and the 2026-11-03 /
-- 11-04 skips were exactly that - a momentary burst of client queries in an
-- otherwise quiet window, costing a full day of archival each time.
--
-- 19:16 UTC (03:16 Asia/Shanghai) is low load and has not shown this problem.
-- This migration moves the standalone retry to 21:07 UTC (05:07 Asia/Shanghai),
-- giving two low-load archival windows per day: 21:07 standalone and 19:16
-- inside `nightly-retention-cleanup`. Capacity stays 6 eligible days/day (3
-- days per run, two runs) against 1 day/day of arrivals.
--
-- The function body is untouched: 3 days / 45 seconds, the active-client guard
-- and the bounded loop all stay as 0135 defined them. `nightly-retention-cleanup`
-- is not touched. The 19:07 standalone job was already removed by 0135, so this
-- migration does not unschedule it again.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

SELECT cron.unschedule('snapshot-archive-maintenance-early')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance-early');
SELECT cron.schedule('snapshot-archive-maintenance-early','7 21 * * *',
  'SELECT * FROM public.maintain_snapshot_archives()');

COMMIT;

-- ROLLBACK: move the standalone retry back to 05:07 UTC.
--
-- BEGIN;
-- SELECT cron.unschedule('snapshot-archive-maintenance-early')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance-early');
-- SELECT cron.schedule('snapshot-archive-maintenance-early','7 5 * * *',
--   'SELECT * FROM public.maintain_snapshot_archives()');
-- COMMIT;
