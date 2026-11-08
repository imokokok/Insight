-- Migration 0134: bounded catch-up for the snapshot archive job.
--
-- Numbering: 0131 is `0131_hyperevm_chainlink_feeds.sql`, 0132 is
-- `0132_oracle_watch_window_terms.sql` and 0133 is
-- `0133_stagger_and_merge_snapshot_schedule.sql`; this takes the next free
-- number (0134).
--
-- The previous maintenance wrapper archived exactly one day per run. Since cold
-- data also ages exactly one day per day, every missed run became permanent
-- backlog: 2026-11-06 and 2026-11-07 both failed with `job startup timeout`
-- (a database-wide pg_cron startup symptom), leaving 8 days unarchived.
--
-- This keeps the per-day archival contract untouched (advisory lock is still
-- fail-closed, entries are still merged by timestamp, checksum is still verified
-- before the exact source ID set is deleted) and only changes how many days one
-- invocation may drain. Two runs per day at 3 days each give 6 days/day of
-- capacity against 1 day/day of arrivals, i.e. 3x steady-state headroom and a
-- two-day recovery for the current backlog.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.maintain_snapshot_archives(
  p_max_days integer,
  p_max_seconds integer
)
RETURNS TABLE(moved_price bigint, moved_hourly bigint, archive_rows bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
SET lock_timeout = '2s' SET statement_timeout = '45s'
AS $function$
DECLARE
  archive_date date;
  utc_today date := (now() AT TIME ZONE 'UTC')::date;
  started_at timestamptz := clock_timestamp();
  processed integer := 0;
  step_price bigint;
  step_hourly bigint;
  step_rows bigint;
  moved_price_total bigint := 0;
  moved_hourly_total bigint := 0;
  archive_rows_total bigint := 0;
BEGIN
  IF p_max_days <= 0 THEN
    RAISE EXCEPTION 'p_max_days must be positive';
  END IF;
  IF p_max_seconds <= 0 THEN
    RAISE EXCEPTION 'p_max_seconds must be positive';
  END IF;

  LOOP
    EXIT WHEN processed >= p_max_days;
    -- Stop between days, never inside one: a partially archived day would roll
    -- the whole transaction back and lose all progress from this invocation.
    EXIT WHEN (clock_timestamp() - started_at) >= make_interval(secs => p_max_seconds);

    SELECT min(day) INTO archive_date FROM (
      SELECT (min(snapshot_ts) AT TIME ZONE 'UTC')::date AS day
      FROM public.price_snapshots
      WHERE snapshot_ts < (utc_today-7)::timestamp AT TIME ZONE 'UTC'
        AND snapshot_ts >= (utc_today-120)::timestamp AT TIME ZONE 'UTC'
      UNION ALL
      SELECT (min(snapshot_hour) AT TIME ZONE 'UTC')::date AS day
      FROM public.hourly_price_snapshots
      WHERE snapshot_hour < (utc_today-7)::timestamp AT TIME ZONE 'UTC'
        AND snapshot_hour >= (utc_today-120)::timestamp AT TIME ZONE 'UTC'
    ) days;

    EXIT WHEN archive_date IS NULL;

    SELECT s.moved_price, s.moved_hourly, s.archive_rows
      INTO step_price, step_hourly, step_rows
      FROM public.archive_snapshot_day(archive_date) s;

    -- No source rows were removable for this day. Retrying cannot advance the
    -- frontier, so leave the evidence in place and report it instead of spinning
    -- through the remaining day budget.
    EXIT WHEN (step_price + step_hourly) = 0;

    moved_price_total := moved_price_total + step_price;
    moved_hourly_total := moved_hourly_total + step_hourly;
    archive_rows_total := archive_rows_total + step_rows;
    processed := processed + 1;
  END LOOP;

  moved_price := moved_price_total;
  moved_hourly := moved_hourly_total;
  archive_rows := archive_rows_total;
  RETURN NEXT;
END;
$function$;

-- Keep the existing zero-argument entry point (and the cron command text) intact.
CREATE OR REPLACE FUNCTION public.maintain_snapshot_archives()
RETURNS TABLE(moved_price bigint, moved_hourly bigint, archive_rows bigint)
LANGUAGE sql SECURITY INVOKER SET search_path = ''
SET lock_timeout = '2s' SET statement_timeout = '45s'
AS $function$
  SELECT * FROM public.maintain_snapshot_archives(3, 45);
$function$;

REVOKE ALL ON FUNCTION public.maintain_snapshot_archives() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.maintain_snapshot_archives(integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maintain_snapshot_archives() TO service_role;
GRANT EXECUTE ON FUNCTION public.maintain_snapshot_archives(integer, integer) TO service_role;

SELECT cron.unschedule('snapshot-archive-maintenance')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='snapshot-archive-maintenance');
SELECT cron.schedule('snapshot-archive-maintenance','7 19 * * *',
  'SELECT * FROM public.maintain_snapshot_archives()');

-- Second daily attempt: a startup-timeout miss no longer costs a full day of
-- progress. 05:07 UTC stays clear of the 19:00-22:40 cleanup window and the
-- 07:00 snapshot write.
SELECT cron.unschedule('snapshot-archive-maintenance-early')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='snapshot-archive-maintenance-early');
SELECT cron.schedule('snapshot-archive-maintenance-early','7 5 * * *',
  'SELECT * FROM public.maintain_snapshot_archives()');

COMMIT;

-- ROLLBACK (also restores the previous one-day-per-run behavior):
--
-- BEGIN;
-- SELECT cron.unschedule('snapshot-archive-maintenance-early')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='snapshot-archive-maintenance-early');
-- DROP FUNCTION IF EXISTS public.maintain_snapshot_archives(integer, integer);
-- CREATE OR REPLACE FUNCTION public.maintain_snapshot_archives()
-- RETURNS TABLE(moved_price bigint, moved_hourly bigint, archive_rows bigint)
-- LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
-- SET lock_timeout = '2s' SET statement_timeout = '45s'
-- AS $rollback$
-- DECLARE
--   archive_date date;
--   utc_today date := (now() AT TIME ZONE 'UTC')::date;
-- BEGIN
--   SELECT min(day) INTO archive_date FROM (
--     SELECT (min(snapshot_ts) AT TIME ZONE 'UTC')::date AS day
--     FROM public.price_snapshots
--     WHERE snapshot_ts < (utc_today-7)::timestamp AT TIME ZONE 'UTC'
--       AND snapshot_ts >= (utc_today-120)::timestamp AT TIME ZONE 'UTC'
--     UNION ALL
--     SELECT (min(snapshot_hour) AT TIME ZONE 'UTC')::date AS day
--     FROM public.hourly_price_snapshots
--     WHERE snapshot_hour < (utc_today-7)::timestamp AT TIME ZONE 'UTC'
--       AND snapshot_hour >= (utc_today-120)::timestamp AT TIME ZONE 'UTC'
--   ) days;
--   IF archive_date IS NOT NULL THEN
--     RETURN QUERY SELECT * FROM public.archive_snapshot_day(archive_date);
--   ELSE
--     RETURN QUERY SELECT 0::bigint,0::bigint,0::bigint;
--   END IF;
-- END;
-- $rollback$;
-- REVOKE ALL ON FUNCTION public.maintain_snapshot_archives() FROM PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.maintain_snapshot_archives() TO service_role;
-- SELECT cron.unschedule('snapshot-archive-maintenance')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='snapshot-archive-maintenance');
-- SELECT cron.schedule('snapshot-archive-maintenance','7 19 * * *',
--   'SELECT * FROM public.maintain_snapshot_archives()');
-- COMMIT;
