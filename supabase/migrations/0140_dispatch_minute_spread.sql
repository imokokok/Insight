-- Migration 0140: remove the only same-minute cron collision, and record why
-- the 13 dispatchers stay on their current minute offsets.
--
-- Numbering: 0134-0139 are merged on main (0138/0139 in af6d11a3), so 0140 is
-- the next free number.
--
-- 2026-11-08 production inventory: 18 cron jobs = 13 dispatch jobs + 5
-- maintenance jobs. The 13 dispatch jobs already occupy distinct minutes:
--
--   snapshot-collect              0,15,30,45   slot boundary +0
--   turso-price-project           3,18,33,48   boundary +3
--   turso-snapshot-fallback       7,22,37,52   boundary +7
--   turso-projection-fallback     10,25,40,55  boundary +10
--   turso-snapshot-second-probe   12,27,42,57  boundary +12
--   coverage-slo                  9,24,39,54
--   mark-stale                    1,11,21,31,41,51
--   monad-dex-market              5,20,35,50
--   oracle-watch                  8            hourly
--   reputation                    13           every 2 hours
--   safety-outcome                14           every 2 hours
--   feed-cadence                  02:23        daily
--   daily-report                  00:16        daily
--
-- Expanded minute-by-minute over a full day, the only exact (hour, minute)
-- collision is 21:07 UTC: `snapshot-archive-maintenance-early` (added by 0136
-- at `7 21 * * *`) shares the minute with the hourly
-- `github-dispatch-turso-snapshot-fallback` (`7 * * *`).
--
-- The five slot-aligned offsets encode a deliberate delay after the 15-minute
-- slot boundary. Moving any of them would change which observations a probe
-- can see, so they are not touched here. pg_cron has minute granularity only;
-- two jobs that must share a minute cannot be separated within that minute.
--
-- `snapshot-archive-maintenance-early` carries no slot-delay meaning: 0136
-- describes it as a low-load archival retry. Moving it 21:07 -> 21:17 UTC
-- keeps both archival windows (21:17 and 19:16 inside nightly retention) in the
-- same off-peak period, keeps the 3-day-per-run x 2-runs-per-day capacity, and
-- removes the only collision.
--
-- Scope note: the `job startup timeout` failures observed in
-- `cron.job_run_details` are not caused by same-minute scheduling. Successful
-- dispatcher runs take 20-90 ms; failed runs wait 239-483 seconds for a worker.
-- That is worker-pool starvation (`max_worker_processes = 6`) and/or a pg_net
-- backlog, not minute overlap. Re-spacing minutes cannot fix it; the next
-- capacity layer is `max_worker_processes`, which needs a platform-level
-- change, not another pg_cron shuffle.

BEGIN;

SELECT cron.unschedule('snapshot-archive-maintenance-early')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance-early'
);

SELECT cron.schedule(
  'snapshot-archive-maintenance-early',
  '17 21 * * *',
  'SELECT * FROM public.maintain_snapshot_archives()'
);

COMMIT;

-- ROLLBACK: move the standalone archival retry back onto 21:07 UTC.
--
-- BEGIN;
-- SELECT cron.unschedule('snapshot-archive-maintenance-early')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance-early');
-- SELECT cron.schedule('snapshot-archive-maintenance-early','7 21 * * *',
--   'SELECT * FROM public.maintain_snapshot_archives()');
-- COMMIT;
