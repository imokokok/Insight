-- Keep history reads and archive maintenance within the Nano disk-I/O budget.
-- The application now breaks long reads into seven-day windows; this index
-- serves the remaining service-role history query without a disk-backed sort.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX IF NOT EXISTS feed_health_snapshots_symbol_evaluated_id_idx
  ON public.feed_health_snapshots (symbol ASC, evaluated_at ASC, id ASC)
  INCLUDE (chain, agreement, outlier_count, stale_count, avg_reputation, min_reputation);

-- One archived UTC day per run is enough to keep pace with retention. Running
-- this once in the Asia/Shanghai off-peak (19:10 UTC) eliminates 23 needless
-- write-heavy maintenance passes per day. If collection or user traffic is
-- already active, leave the cold data hot for another day instead of competing
-- for the Nano instance's Disk I/O budget.
CREATE OR REPLACE FUNCTION public.maintain_snapshot_archives()
RETURNS TABLE(moved_price bigint, moved_hourly bigint, archive_rows bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
SET lock_timeout = '2s' SET statement_timeout = '45s'
AS $function$
DECLARE
  archive_date date;
  utc_today date := (now() AT TIME ZONE 'UTC')::date;
  active_client_queries integer;
BEGIN
  SELECT count(*)
  INTO active_client_queries
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND backend_type = 'client backend'
    AND state = 'active'
    AND pid <> pg_backend_pid();

  IF active_client_queries >= 3 OR EXISTS (
    SELECT 1
    FROM public.cron_dispatch_runs
    WHERE workflow_file IN ('snapshot-collect.yml', 'safety-outcome-cron.yml')
      AND status IN ('dispatching', 'running')
      AND updated_at >= clock_timestamp() - interval '20 minutes'
  ) THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

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
  IF archive_date IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.archive_snapshot_day(archive_date);
  ELSE
    RETURN QUERY SELECT 0::bigint,0::bigint,0::bigint;
  END IF;
END;
$function$;

SELECT cron.unschedule('snapshot-archive-maintenance')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance');
SELECT cron.schedule(
  'snapshot-archive-maintenance',
  '10 19 * * *',
  'SELECT * FROM public.maintain_snapshot_archives()'
);

COMMIT;
