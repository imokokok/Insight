-- Migration 0144: trim residual Nano cron load after the 2026-11-12/13
-- IO-budget exhaustion + DB outage incident.
--
-- Numbering: production `supabase_migrations.schema_migrations` ends at 0143
-- (`retention_write_and_alert_allowlist`), so 0144 is next.
--
-- Incident evidence (measured 2026-11-13 UTC, cron.job_run_details):
--   * Supabase emailed "disk IO budget exhausted" at 2026-11-12 15:20 UTC
--     (one minute before the monthly billing anchor). The free Nano compute
--     reverts to a 5 MB/s / 250 IOPS baseline once the burst budget drains,
--     and three "IO-wait storm" windows are visible in the cron history:
--     11-08 14:31-18:08, 11-09 14:22-18:07, 11-12 21:54-23:57 UTC, with
--     single runs failing after 10-900 s. The instance then went fully
--     unresponsive between 19:50 and 23:50 UTC on 11-12 and stayed down
--     ~10 hours until a manual management-API restart.
--   * The dominant load (Vercel/GH-Actions read paths on Supabase during the
--     egress crisis) left with the 2026-11-12 Turso read cutover, and the
--     heavy one-off Phase-B backfill is done. What remains on Supabase is the
--     money path, the clock dispatchers, and maintenance jobs.
--   * The cleanup targets are now tiny (price_records ~3.7k rows with a btree
--     on ttl, rate_limits 31 rows, api_keys 0 rows), so their cadence can drop
--     without any product impact.
--
-- Changes (both are pure cadence trims; no function bodies change):
--   1. `price-records-cleanup` every 30 min -> hourly. The DELETE hits
--      `idx_price_records_ttl`; hourly keeps TTL semantics well below the
--      product's price freshness windows.
--   2. `github-dispatch-mark-stale` every 10 min -> every 30 min. It only
--      flips `cron_dispatch_runs` rows stuck in dispatching/running (older
--      than the unchanged 20-minute window) to `timed_out`; a longer marking
--      delay does not affect any consumer (the health watch keys off the
--      collector heartbeat, and the fallback guard reads succeeded rows only).
--      The command text is copied verbatim from production; only the schedule
--      changes.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

SELECT cron.unschedule('price-records-cleanup')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'price-records-cleanup'
);

SELECT cron.schedule(
  'price-records-cleanup',
  '6 * * * *',
  'SELECT public.cleanup_expired_price_records()'
);

SELECT cron.unschedule('github-dispatch-mark-stale')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-mark-stale'
);

SELECT cron.schedule(
  'github-dispatch-mark-stale',
  '1,31 * * * *',
  $cmd$
      UPDATE public.cron_dispatch_runs
      SET status = 'timed_out', completed_at = now(), conclusion = 'no GitHub completion callback'
      WHERE status IN ('dispatching', 'running')
        AND created_at < now() - interval '20 minutes';
    $cmd$
);

COMMIT;
