import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Supabase pg_cron is the authoritative high-frequency clock. GitHub Actions
// executes the bounded jobs, while Turso owns raw slots and Supabase owns the
// idempotent business projection receipt. Receipt probes remain recovery-only:
// normal slots dispatch exactly one collector and one projector, and the two
// later probes perform no network request, ledger write, or runner start.
const migrationSql = String.raw`-- Make Supabase the authoritative Turso control-plane clock.
--
-- GitHub Actions schedule delivery is best-effort and was observed to miss
-- high-frequency windows. Supabase pg_cron now dispatches the two necessary
-- workers at their nominal cadence. The receipt-gated jobs remain delayed
-- recovery checks, not the normal execution path.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

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

  -- Authoritative high-frequency clock: one raw capture and one bounded
  -- projection per slot. Each dispatch gets one ledger insert and one terminal
  -- update; Turso leases and Supabase receipts make retries idempotent.
  PERFORM cron.schedule(
    'github-dispatch-snapshot-collect', '0,15,30,45 * * * *',
    $command$SELECT public.dispatch_github_workflow('snapshot-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-price-project', '3,18,33,48 * * * *',
    $command$SELECT public.dispatch_github_workflow('turso-price-project.yml');$command$
  );

  -- Recovery only. A healthy slot has already received its Turso-to-Supabase
  -- receipt, so these are indexed no-op probes without pg_net or runner work.
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
      'Supabase-primary Turso scheduler activation deferred: github_workflow_dispatch_token is unavailable';
  END IF;
END;
$block$;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0121_supabase_primary_turso_scheduler.sql', repositoryRoot)
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
      '0121_supabase_primary_turso_scheduler.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
