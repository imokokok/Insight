import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const migrationSql = String.raw`-- Preserve whether cleanup row counts are measured and expose retention health to the hourly watchdog.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Older rows cannot be reconstructed reliably: 0143 stored NULL helper counts
-- as zero. Mark historical counts unknown instead of retroactively claiming
-- that no rows were deleted.
ALTER TABLE public.retention_runs
  ADD COLUMN IF NOT EXISTS rows_affected_known boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.record_retention_run()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_rows bigint := 0;
BEGIN
  INSERT INTO public.retention_runs (
    run_at, step, status, rows_affected, rows_affected_known, error_message
  )
  SELECT
    now(), r.step, r.status, COALESCE(r.rows_affected, 0),
    r.rows_affected IS NOT NULL, r.error_message
  FROM public.run_daily_retention() AS r;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.retention_runs
  WHERE run_at < now() - interval '90 days';

  RETURN v_rows;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_health_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_jobs jsonb := '[]'::jsonb;
  v_jobs_healthy boolean := false;
  v_retention_run_at timestamptz;
  v_failed_retention_steps bigint := 0;
  v_retention_healthy boolean := false;
  v_backlog jsonb := '[]'::jsonb;
  v_backlog_healthy boolean := true;
BEGIN
  WITH required_jobs(jobname, max_staleness) AS (
    VALUES
      ('price-records-cleanup', interval '2 hours'),
      ('rate-limits-cleanup', interval '2 hours'),
      ('nightly-retention-cleanup', interval '30 hours'),
      ('snapshot-archive-maintenance-early', interval '30 hours')
  ), job_state AS (
    SELECT
      required.jobname,
      required.max_staleness,
      scheduled.active,
      latest.status AS latest_status,
      latest.start_time AS latest_run_at,
      successful.last_success_at,
      COALESCE(failures.consecutive_failures, 0) AS consecutive_failures,
      COALESCE(scheduled.active, false)
        AND COALESCE(successful.last_success_at > now() - required.max_staleness, false)
        AND COALESCE(failures.consecutive_failures, 0) < 2 AS healthy
    FROM required_jobs AS required
    LEFT JOIN cron.job AS scheduled ON scheduled.jobname = required.jobname
    LEFT JOIN LATERAL (
      SELECT run.status, run.start_time
      FROM cron.job_run_details AS run
      WHERE run.jobid = scheduled.jobid
      ORDER BY run.start_time DESC
      LIMIT 1
    ) AS latest ON true
    LEFT JOIN LATERAL (
      SELECT max(run.start_time) AS last_success_at
      FROM cron.job_run_details AS run
      WHERE run.jobid = scheduled.jobid
        AND run.status = 'succeeded'
    ) AS successful ON true
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE recent.status = 'failed') AS consecutive_failures
      FROM (
        SELECT run.status
        FROM cron.job_run_details AS run
        WHERE run.jobid = scheduled.jobid
        ORDER BY run.start_time DESC
        LIMIT 2
      ) AS recent
    ) AS failures ON true
  )
  SELECT
    COALESCE(bool_and(job_state.healthy), false),
    COALESCE(
      jsonb_agg(jsonb_build_object(
        'job', job_state.jobname,
        'active', job_state.active,
        'latest_status', job_state.latest_status,
        'latest_run_at', job_state.latest_run_at,
        'last_success_at', job_state.last_success_at,
        'consecutive_failures', job_state.consecutive_failures,
        'max_staleness_seconds', extract(epoch FROM job_state.max_staleness)::bigint,
        'healthy', job_state.healthy
      ) ORDER BY job_state.jobname),
      '[]'::jsonb
    )
  INTO v_jobs_healthy, v_jobs
  FROM job_state;

  SELECT max(run_at)
  INTO v_retention_run_at
  FROM public.retention_runs;

  SELECT count(*) FILTER (WHERE status = 'failed')
  INTO v_failed_retention_steps
  FROM public.retention_runs
  WHERE run_at = v_retention_run_at;

  v_retention_healthy := v_retention_run_at IS NOT NULL
    AND v_retention_run_at > now() - interval '30 hours'
    AND v_failed_retention_steps = 0;

  WITH backlog(table_name, rows_due, alert_threshold) AS (
    VALUES
      ('feed_health_snapshots', (
        SELECT count(*) FROM public.feed_health_snapshots
        WHERE evaluated_at < now() - interval '60 days'
      ), 5000::bigint),
      ('snapshot_archives', (
        SELECT count(*) FROM public.snapshot_archives
        WHERE archive_day < (now() AT TIME ZONE 'UTC')::date - 90
      ), 5000::bigint),
      ('market_reference_snapshots', (
        SELECT count(*) FROM public.market_reference_snapshots
        WHERE snapshot_ts < now() - interval '90 days'
      ), 5000::bigint),
      ('cron_dispatch_runs', (
        SELECT count(*) FROM public.cron_dispatch_runs
        WHERE created_at < now() - interval '30 days'
      ), 5000::bigint),
      ('cron.job_run_details', (
        SELECT count(*) FROM cron.job_run_details
        WHERE start_time < now() - interval '30 days'
      ), 5000::bigint)
  )
  SELECT
    COALESCE(bool_and(backlog.rows_due <= backlog.alert_threshold), true),
    COALESCE(
      jsonb_agg(jsonb_build_object(
        'table', backlog.table_name,
        'rows_due', backlog.rows_due,
        'alert_threshold', backlog.alert_threshold,
        'healthy', backlog.rows_due <= backlog.alert_threshold
      ) ORDER BY backlog.table_name),
      '[]'::jsonb
    )
  INTO v_backlog_healthy, v_backlog
  FROM backlog;

  RETURN jsonb_build_object(
    'healthy', v_jobs_healthy AND v_retention_healthy AND v_backlog_healthy,
    'jobs_healthy', v_jobs_healthy,
    'jobs', v_jobs,
    'retention_healthy', v_retention_healthy,
    'retention', jsonb_build_object(
      'last_run_at', v_retention_run_at,
      'failed_steps', v_failed_retention_steps,
      'max_staleness_seconds', 108000,
      'healthy', v_retention_healthy
    ),
    'backlog_healthy', v_backlog_healthy,
    'backlog', v_backlog
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_health_report()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_health_report()
  TO service_role;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0149_retention_evidence_metrics.sql', repositoryRoot)
);
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const check = args.has('--check');

if (write === check || [...args].some((arg) => arg !== '--write' && arg !== '--check')) {
  throw new Error('Use exactly one supported option: --write or --check');
}

if (write) {
  await writeFile(outputPath, migrationSql, 'utf8');
} else {
  const current = await readFile(outputPath, 'utf8');
  if (current !== migrationSql) {
    throw new Error(
      '0149_retention_evidence_metrics.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
