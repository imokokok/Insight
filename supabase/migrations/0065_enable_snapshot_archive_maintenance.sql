-- Apply only after archive-aware app and cron/ML readers are deployed.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.maintain_snapshot_archives()
RETURNS TABLE(moved_price bigint, moved_hourly bigint, archive_rows bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
SET lock_timeout = '2s' SET statement_timeout = '45s'
AS $function$
DECLARE
  archive_date date;
  utc_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
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
REVOKE ALL ON FUNCTION public.maintain_snapshot_archives() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maintain_snapshot_archives() TO service_role;

SELECT cron.unschedule('snapshot-archive-maintenance')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='snapshot-archive-maintenance');
SELECT cron.schedule('snapshot-archive-maintenance','41 * * * *',
  'SELECT * FROM public.maintain_snapshot_archives()');

SELECT cron.unschedule('snapshot-archive-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='snapshot-archive-cleanup');
SELECT cron.schedule('snapshot-archive-cleanup','45 4 * * *',
  $job$DELETE FROM public.snapshot_archives
    WHERE archive_day < (now() AT TIME ZONE 'UTC')::date-120$job$);

SELECT cron.unschedule('native-cron-log-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='native-cron-log-cleanup');
SELECT cron.schedule('native-cron-log-cleanup','50 4 * * *',
  $job$DELETE FROM cron.job_run_details
    WHERE end_time < now()-interval '30 days'$job$);
COMMIT;
