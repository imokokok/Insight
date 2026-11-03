import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// GitHub Actions remains the primary high-frequency clock. Supabase performs
// only a primary-key receipt probe after the native window has elapsed; it
// dispatches recovery work only when the completed Turso-to-Supabase hand-off
// is absent. This keeps healthy slots out of the PostgreSQL write path while
// making a missed GitHub schedule self-healing.
const migrationSql = String.raw`-- Add receipt-gated recovery for the GitHub-primary Turso scheduler.
--
-- A receipt exists only after a raw Turso slot has been durably captured and
-- its bounded projection has committed to Supabase. Normal slots therefore
-- cost one indexed primary-key lookup and no workflow dispatch, ledger write,
-- or duplicate upstream read. A missing receipt triggers the existing
-- idempotent GitHub runners; the Turso lease and projection receipt make a
-- late recovery safe.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.dispatch_turso_snapshot_fallback_if_unprojected()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_slot timestamptz;
  v_projected boolean;
BEGIN
  v_slot := date_trunc('hour', v_now)
    + floor(extract(minute FROM v_now) / 15) * interval '15 minutes';

  SELECT EXISTS (
    SELECT 1
    FROM public.turso_price_slot_receipts
    WHERE snapshot_ts = v_slot
  ) INTO v_projected;

  IF v_projected THEN
    RETURN false;
  END IF;

  PERFORM public.dispatch_github_workflow('snapshot-collect.yml');
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_turso_projection_fallback_if_unprojected()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_slot timestamptz;
  v_projected boolean;
BEGIN
  v_slot := date_trunc('hour', v_now)
    + floor(extract(minute FROM v_now) / 15) * interval '15 minutes';

  SELECT EXISTS (
    SELECT 1
    FROM public.turso_price_slot_receipts
    WHERE snapshot_ts = v_slot
  ) INTO v_projected;

  IF v_projected THEN
    RETURN false;
  END IF;

  PERFORM public.dispatch_github_workflow('turso-price-project.yml');
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_turso_snapshot_fallback_if_unprojected()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_turso_snapshot_fallback_if_unprojected()
  TO service_role;

REVOKE ALL ON FUNCTION public.dispatch_turso_projection_fallback_if_unprojected()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_turso_projection_fallback_if_unprojected()
  TO service_role;

CREATE OR REPLACE FUNCTION public.disable_github_workflow_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_job_name text;
BEGIN
  FOREACH v_job_name IN ARRAY ARRAY[
    'github-dispatch-snapshot-collect',
    'github-dispatch-turso-price-project',
    'github-dispatch-turso-snapshot-fallback',
    'github-dispatch-turso-projection-fallback',
    'github-dispatch-oracle-watch',
    'github-dispatch-reputation',
    'github-dispatch-safety-outcome',
    'github-dispatch-feed-cadence',
    'github-dispatch-daily-report',
    'github-dispatch-coverage-slo',
    'github-dispatch-monad-dex-market',
    'github-dispatch-mark-stale',
    'github-dispatch-ledger-cleanup'
  ]
  LOOP
    PERFORM cron.unschedule(v_job_name)
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job_name);
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enable_github_workflow_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'github_workflow_dispatch_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 20 THEN
    RAISE EXCEPTION
      'Create Vault secret github_workflow_dispatch_token before enabling the dispatcher';
  END IF;

  PERFORM public.disable_github_workflow_dispatcher();

  -- GitHub's native schedules own the nominal high-frequency clock. These
  -- two checks run after the nominal capture/projection window and dispatch
  -- only if the completed slot receipt is still absent.
  PERFORM cron.schedule(
    'github-dispatch-turso-snapshot-fallback', '7,22,37,52 * * * *',
    $command$SELECT public.dispatch_turso_snapshot_fallback_if_unprojected();$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-projection-fallback', '10,25,40,55 * * * *',
    $command$SELECT public.dispatch_turso_projection_fallback_if_unprojected();$command$
  );

  PERFORM cron.schedule(
    'github-dispatch-oracle-watch', '8 * * * *',
    $command$SELECT public.dispatch_github_workflow('oracle-watch-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-reputation', '12 */2 * * *',
    $command$SELECT public.dispatch_github_workflow('reputation-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-safety-outcome', '25 */2 * * *',
    $command$SELECT public.dispatch_github_workflow('safety-outcome-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-feed-cadence', '23 2 * * *',
    $command$SELECT public.dispatch_github_workflow('feed-cadence-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-daily-report', '10 0 * * *',
    $command$SELECT public.dispatch_github_workflow('daily-report-publish-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-coverage-slo', '7,22,37,52 * * * *',
    $command$SELECT public.dispatch_github_workflow('coverage-slo.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-monad-dex-market', '2,12,22,32,42,52 * * * *',
    $command$SELECT public.dispatch_github_workflow('monad-dex-market.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-mark-stale', '6,16,26,36,46,56 * * * *',
    $command$
      UPDATE public.cron_dispatch_runs
      SET status = 'timed_out', completed_at = now(), conclusion = 'no GitHub completion callback'
      WHERE status IN ('dispatching', 'running')
        AND created_at < now() - interval '20 minutes';
    $command$
  );
  PERFORM cron.schedule(
    'github-dispatch-ledger-cleanup', '50 4 * * *',
    $command$
      DELETE FROM public.cron_dispatch_runs
      WHERE created_at < now() - interval '30 days';
    $command$
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.disable_github_workflow_dispatcher()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.disable_github_workflow_dispatcher()
  TO service_role;

REVOKE ALL ON FUNCTION public.enable_github_workflow_dispatcher()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enable_github_workflow_dispatcher()
  TO service_role;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'github_workflow_dispatch_token'
      AND length(decrypted_secret) >= 20
  ) THEN
    PERFORM public.enable_github_workflow_dispatcher();
  ELSE
    RAISE NOTICE
      'Receipt-gated Turso fallback activation deferred: github_workflow_dispatch_token is unavailable';
  END IF;
END;
$block$;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0120_receipt_gated_turso_fallback.sql', repositoryRoot)
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
      '0120_receipt_gated_turso_fallback.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
