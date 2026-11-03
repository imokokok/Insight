import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Turso capture is deliberately independent from the eventual Supabase
// projection. The projection therefore needs the same durable Supabase
// dispatcher and ledger that already keep snapshot collection alive when
// GitHub's best-effort `schedule` events are delayed or dropped.
const migrationSql = String.raw`BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.dispatch_github_workflow(
  p_workflow_file text,
  p_ref text DEFAULT 'main'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_allowed constant text[] := ARRAY[
    'snapshot-collect.yml',
    'turso-price-project.yml',
    'oracle-watch-collect.yml',
    'reputation-cron.yml',
    'safety-outcome-cron.yml',
    'feed-cadence-cron.yml',
    'daily-report-publish-cron.yml',
    'coverage-slo.yml',
    'monad-dex-market.yml'
  ];
  v_token text;
  v_dispatch_id uuid;
  v_slot timestamptz := date_trunc('minute', clock_timestamp());
BEGIN
  IF NOT (p_workflow_file = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Workflow is not in the dispatcher allowlist: %', p_workflow_file;
  END IF;

  SELECT decrypted_secret
  INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'github_workflow_dispatch_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 20 THEN
    RAISE EXCEPTION
      'Vault secret github_workflow_dispatch_token is missing or invalid; dispatcher remains fail-closed';
  END IF;

  INSERT INTO public.cron_dispatch_runs (workflow_file, scheduled_for, source, status)
  VALUES (p_workflow_file, v_slot, 'supabase_cron', 'dispatching')
  ON CONFLICT (workflow_file, scheduled_for, source) DO NOTHING
  RETURNING id INTO v_dispatch_id;

  IF v_dispatch_id IS NULL THEN
    SELECT id INTO v_dispatch_id
    FROM public.cron_dispatch_runs
    WHERE workflow_file = p_workflow_file
      AND scheduled_for = v_slot
      AND source = 'supabase_cron';
    RETURN v_dispatch_id;
  END IF;

  PERFORM net.http_post(
    url := 'https://api.github.com/repos/imokokok/Insight/actions/workflows/'
      || p_workflow_file || '/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || v_token,
      'Content-Type', 'application/json',
      'User-Agent', 'insight-supabase-cron',
      'X-GitHub-Api-Version', '2026-03-10'
    ),
    body := jsonb_build_object(
      'ref', p_ref,
      'inputs', jsonb_build_object(
        'dispatch_id', v_dispatch_id::text,
        'scheduled_for', v_slot::text
      )
    ),
    timeout_milliseconds := 5000
  );

  RETURN v_dispatch_id;
END;
$function$;

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

  PERFORM cron.schedule(
    'github-dispatch-snapshot-collect', '*/15 * * * *',
    $command$SELECT public.dispatch_github_workflow('snapshot-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-price-project', '3,18,33,48 * * * *',
    $command$SELECT public.dispatch_github_workflow('turso-price-project.yml');$command$
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

REVOKE ALL ON FUNCTION public.dispatch_github_workflow(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_github_workflow(text, text)
  TO service_role;
REVOKE ALL ON FUNCTION public.enable_github_workflow_dispatcher()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enable_github_workflow_dispatcher()
  TO service_role;
REVOKE ALL ON FUNCTION public.disable_github_workflow_dispatcher()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.disable_github_workflow_dispatcher()
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
      'Turso price projection dispatcher deferred: github_workflow_dispatch_token is unavailable';
  END IF;
END;
$block$;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0114_turso_price_projection_dispatcher.sql', repositoryRoot)
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
      '0114_turso_price_projection_dispatcher.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
