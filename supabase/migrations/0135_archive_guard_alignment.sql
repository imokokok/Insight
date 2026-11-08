-- Migration 0135: restore the archive I/O guard and remove the 19:07 duplicate.
--
-- Numbering: 0134 is `0134_archive_catchup_bound.sql`; this takes the next free
-- number (0135).
--
-- 0133 merged the nightly retention jobs and unscheduled
-- `snapshot-archive-maintenance`, invoking archive maintenance from
-- `run_daily_retention()` at 19:16 UTC. 0134 then recreated the standalone job
-- at 19:07 and added `snapshot-archive-maintenance-early` at 05:07, so the two
-- migrations together schedule three archival invocations per day. 19:07 and
-- 19:16 are nine minutes apart; `archive_snapshot_day` raises when it cannot
-- take the advisory lock, so the nightly step would fail instead of waiting.
--
-- 0134 also dropped the 0098 guard that skips archival while client queries are
-- active: the bounded loop only checked day and time budgets. The active-client
-- check is the real Nano disk-I/O protection and is restored here for every run,
-- not just catch-up. The "in-flight snapshot dispatch" guard is intentionally
-- removed: archival only moves rows older than `utc_today-7`, so it cannot
-- conflict with an in-flight collection; concurrent archival is already
-- serialized by the advisory lock; and that check overlapped the 19:00/05:00
-- dispatch windows by construction, permanently disabling the run (the
-- 2026-11-01..11-05 skips).
--
-- Net effect: two archival invocations per day (05:07 standalone, 19:16 inside
-- `nightly-retention-cleanup`), each capped at 3 days / 45 seconds, i.e. 6
-- eligible days/day against 1 day/day of arrivals. The 19:07 / 19:16 lock
-- collision disappears and the guard is once again "active clients + bounded
-- time", not an unconditional pass.
--
-- Signature note: the two-argument function deliberately carries no DEFAULT
-- values. PostgreSQL cannot resolve `maintain_snapshot_archives()` when an
-- exact zero-argument wrapper coexists with a defaulted two-argument overload
-- ("function ... is not unique"), and both cron commands plus
-- `run_daily_retention()` call the zero-argument form. The wrapper supplies
-- 3 / 45 explicitly, so the effective defaults are unchanged.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- The function currently on disk may carry defaults; PostgreSQL cannot remove
-- parameter defaults via CREATE OR REPLACE, so replace it explicitly.
DROP FUNCTION IF EXISTS public.maintain_snapshot_archives(integer, integer);

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
  active_client_queries integer;
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

  -- Real I/O guard: leave the cold data hot for another day instead of
  -- competing with active client queries for the Nano disk-I/O budget.
  SELECT count(*)
  INTO active_client_queries
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND backend_type = 'client backend'
    AND state = 'active'
    AND pid <> pg_backend_pid();

  IF active_client_queries >= 3 THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
    RETURN;
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

-- Keep the zero-argument entry point used by both cron commands.
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

-- 0133 already folded archival into `nightly-retention-cleanup` at 19:16 UTC.
-- Remove only the duplicate standalone 19:07 job that 0134 recreated; the
-- 05:07 `-early` job stays as the independent retry.
SELECT cron.unschedule('snapshot-archive-maintenance')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance');

COMMIT;

-- ROLLBACK: re-create the 0134 two-argument function without the active-client
-- guard, then re-add the standalone job:
--
-- BEGIN;
--   CREATE OR REPLACE FUNCTION public.maintain_snapshot_archives(
--     p_max_days integer, p_max_seconds integer
--   ) RETURNS TABLE(moved_price bigint, moved_hourly bigint, archive_rows bigint)
--   ... (0134 function body) ...
--   SELECT cron.schedule('snapshot-archive-maintenance','7 19 * * *',
--     'SELECT * FROM public.maintain_snapshot_archives()');
-- COMMIT;
