-- Keep high-frequency Turso scheduling outside Supabase pg_cron.
--
-- GitHub Actions directly captures raw slots at :00/:15/:30/:45 and projects
-- them at :03/:18/:33/:48. The Turso lease and Supabase projection receipts
-- make scheduled retries idempotent. Supabase retains its low-frequency
-- dispatches, relational data, and health telemetry without carrying the
-- high-frequency scheduler load.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

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

  -- High-frequency Turso capture and projection are native GitHub schedules,
  -- not Supabase pg_cron dispatches. Keep only low-frequency product jobs here.
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
      'GitHub primary Turso scheduler activation deferred: github_workflow_dispatch_token is unavailable';
  END IF;
END;
$block$;

COMMIT;
