-- Migration 0142: dispatch the control-plane alert from Supabase, restore
-- the 15-minute alert cadence, and detect interior capture loss.
--
-- Numbering: 0141 is the highest committed number, so 0142 is next.
--
-- Incident evidence (2026-11-08 UTC, production):
--   * The capture stopped producing Turso slots for 14 consecutive slots
--     (14:45-17:45). The receipt ledger has no rows for that window and Turso
--     holds no pending or quarantined slots for it, so the raw evidence was
--     never captured and projection cannot replay it.
--   * `Turso Control Plane Alert` ran GitHub's native `schedule:` 8 times in
--     2 days against its nominal cadence and opened no issue during the
--     outage: GitHub's best-effort native cron is the same unreliable trigger
--     that cron-dispatcher.md already routes around for every other workflow.
--   * `GET /api/v1/health/ready` also stayed ready during the outage: its
--     `tursoRawCapture` check only measures the age of the newest slot, and a
--     dead capture window that has already ended leaves zero pending slots
--     plus a fresh latest slot.
--
-- Changes:
--   1. Route `turso-control-plane-alert.yml` through
--      `dispatch_github_workflow` at `10,25,40,55` like every other workflow.
--      This puts the alert inside the Supabase dispatcher failure domain,
--      trading the (theoretical) native-schedule independence for a trigger
--      that demonstrably runs; the truly independent read-only edge probe
--      remains a separate decision. The workflow file drops its `schedule:`.
--      Cost: +96 pg_cron starts/day on otherwise free minutes (:10/:25/:40/:55
--      carry no other dispatcher). The alert checks for 2+ consecutive missing
--      receipts and opens one deduplicated issue, so single-slot misses do not
--      page anyone.
--   2. The readiness endpoint (route change, not this migration) now compares
--      `turso_price_slot_receipts` against the recent 15-minute grid
--      (`captureContinuity` check). One missing slot is tolerated while the
--      receipt-gated fallback recovers it; two or more consecutive missing
--      receipts flip readiness to 503 so this workflow pages.

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
    'github-dispatch-turso-fallbacks',
    'github-dispatch-turso-snapshot-second-probe',
    'github-dispatch-turso-control-plane-alert',
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
    'github-dispatch-snapshot-collect', '0,15,30,45 * * * *',
    $command$SELECT public.dispatch_github_workflow('snapshot-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-price-project', '3,18,33,48 * * * *',
    $command$SELECT public.dispatch_github_workflow('turso-price-project.yml');$command$
  );

  -- Merged probe plus the independent second attempt inside the same slot.
  PERFORM cron.schedule(
    'github-dispatch-turso-fallbacks', '7,22,37,52 * * * *',
    $command$SELECT public.dispatch_turso_fallbacks_if_unprojected();$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-snapshot-second-probe', '12,27,42,57 * * * *',
    $command$SELECT public.dispatch_turso_snapshot_second_probe();$command$
  );

  -- Control-plane alert on minutes no other dispatcher uses, five minutes
  -- after the projector dispatch so the last slot's receipt is settled.
  PERFORM cron.schedule(
    'github-dispatch-turso-control-plane-alert', '10,25,40,55 * * * *',
    $command$SELECT public.dispatch_github_workflow('turso-control-plane-alert.yml');$command$
  );

  PERFORM cron.schedule(
    'github-dispatch-oracle-watch', '8 * * * *',
    $command$SELECT public.dispatch_github_workflow('oracle-watch-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-reputation', '13 */2 * * *',
    $command$SELECT public.dispatch_github_workflow('reputation-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-safety-outcome', '14 */2 * * *',
    $command$SELECT public.dispatch_github_workflow('safety-outcome-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-feed-cadence', '23 2 * * *',
    $command$SELECT public.dispatch_github_workflow('feed-cadence-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-daily-report', '16 0 * * *',
    $command$SELECT public.dispatch_github_workflow('daily-report-publish-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-coverage-slo', '9,24,39,54 * * * *',
    $command$SELECT public.dispatch_github_workflow('coverage-slo.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-monad-dex-market', '5,20,35,50 * * * *',
    $command$SELECT public.dispatch_github_workflow('monad-dex-market.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-mark-stale', '1,11,21,31,41,51 * * * *',
    $command$
      UPDATE public.cron_dispatch_runs
      SET status = 'timed_out', completed_at = now(), conclusion = 'no GitHub completion callback'
      WHERE status IN ('dispatching', 'running')
        AND created_at < now() - interval '20 minutes';
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

-- ─── Rewire the scheduler (idempotent, no redeploy needed) ──────────────────
SELECT cron.unschedule('github-dispatch-turso-control-plane-alert')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-turso-control-plane-alert'
);
SELECT cron.schedule(
  'github-dispatch-turso-control-plane-alert',
  '10,25,40,55 * * * *',
  'SELECT public.dispatch_github_workflow(''turso-control-plane-alert.yml'');'
);

COMMIT;

-- ROLLBACK: return the alert to GitHub's native schedule and drop the
-- dispatch job. The workflow file's `schedule:` block must also be restored.
--
-- BEGIN;
-- SELECT cron.unschedule('github-dispatch-turso-control-plane-alert')
--   WHERE EXISTS (SELECT 1 FROM cron.job
--                 WHERE jobname = 'github-dispatch-turso-control-plane-alert');
-- COMMIT;
