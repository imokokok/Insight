import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const migrationSql = String.raw`-- Detect pg_cron worker starvation bursts even when maintenance jobs recover.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.cron_startup_timeout_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count_60m bigint := 0;
  v_count_24h bigint := 0;
  v_first_at timestamptz;
  v_last_at timestamptz;
  v_jobs text[] := ARRAY[]::text[];
  v_healthy boolean := true;
BEGIN
  SELECT
    count(*) FILTER (WHERE run.start_time >= now() - interval '60 minutes'),
    count(*),
    min(run.start_time),
    max(run.start_time),
    coalesce(array_agg(DISTINCT scheduled.jobname ORDER BY scheduled.jobname)
      FILTER (WHERE scheduled.jobname IS NOT NULL), ARRAY[]::text[])
  INTO v_count_60m, v_count_24h, v_first_at, v_last_at, v_jobs
  FROM cron.job_run_details AS run
  LEFT JOIN cron.job AS scheduled ON scheduled.jobid = run.jobid
  WHERE run.start_time >= now() - interval '24 hours'
    AND run.status = 'failed'
    AND run.return_message = 'job startup timeout';

  v_healthy := v_count_60m < 3 AND v_count_24h < 10;

  RETURN jsonb_build_object(
    'healthy', v_healthy,
    'window_60m', jsonb_build_object(
      'count', v_count_60m,
      'alert_threshold', 3
    ),
    'window_24h', jsonb_build_object(
      'count', v_count_24h,
      'alert_threshold', 10,
      'first_at', v_first_at,
      'last_at', v_last_at,
      'affected_jobs', to_jsonb(v_jobs)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cron_startup_timeout_report()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_startup_timeout_report()
  TO service_role;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0150_cron_startup_timeout_report.sql', repositoryRoot)
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
      '0150_cron_startup_timeout_report.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
