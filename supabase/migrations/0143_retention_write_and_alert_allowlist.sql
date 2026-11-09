-- Migration 0143: make nightly retention write every step row, and let the
-- control-plane alert actually dispatch.
--
-- Numbering: production `supabase_migrations.schema_migrations` ends at 0142
-- (`alert_dispatch_and_capture_continuity`), so 0143 is next.
--
-- Defect 1 (measured 2026-11-09 UTC, production):
--   * `record_retention_run()` INSERTs `run_daily_retention()` verbatim into
--     `retention_runs`, whose `rows_affected` column is NOT NULL.
--   * Step 1 `snapshot-archive-maintenance` (and steps 10/11, and any failed
--     step) returns NULL for `rows_affected`, so the single INSERT violates
--     the NOT NULL constraint and the whole transaction rolls back.
--   * Evidence: `retention_runs` held 0 rows; `nightly-retention-cleanup`
--     failed at 2026-11-08 19:16:00+00 with
--     `null value in column "rows_affected" ... Failing row contains
--      (1, ..., snapshot-archive-maintenance, ok, null, null)`.
--   * Consequence (measured 2026-11-09): `feed_health_snapshots` held 1,372
--     rows older than 60 days and `cron_dispatch_runs` 246 rows older than
--     30 days, because no retention step ever committed.
--   * Fix: `COALESCE(r.rows_affected, 0)` on the write side. NULL means
--     "this step does not report a row count", not "zero rows deleted"; the
--     step row is still written, so no observation is dropped. The column
--     stays NOT NULL.
--
-- Defect 2 (measured 2026-11-09 UTC, production):
--   * 0142 scheduled `github-dispatch-turso-control-plane-alert` every 15
--     minutes (`10,25,40,55`) but never added
--     `turso-control-plane-alert.yml` to `dispatch_github_workflow`'s
--     allowlist, so every run raised
--     `Workflow is not in the dispatcher allowlist`.
--   * Evidence: all 43 `cron.job_run_details` rows for jobid 265 in the last
--     24 hours failed, and `cron_dispatch_runs` has no row for the workflow
--     (the allowlist check runs before the INSERT).
--   * Fix: add the workflow to the allowlist.
--
-- Cadence decision: hourly instead of every 15 minutes.
--   * The alert polls `/api/v1/health/ready`. A stopped capture becomes
--     observable when the newest Turso slot is older than 25 minutes
--     (`MAX_SCHEDULER_AGE_MS`). The 2-consecutive-missing-receipt check only
--     trips at 45 minutes, so the 25-minute scheduler check is the binding
--     detector.
--   * The last good slot is always on the :00/:15/:30/:45 grid, so the
--     observable moment is :10/:25/:40/:55. An hourly poll at :10 is at most
--     45 minutes after that moment, i.e. at most 55 minutes after the first
--     missed capture. That stays under one hour, so 96 -> 24 starts/day.
--
-- Startup budget:
--   0141: 868 starts/day. 0142 added 96 (alert every 15 minutes) = 964.
--   This migration drops the alert to 24/day, so 18 jobs / 892 starts/day.
--   No `max_worker_processes`, `cron.max_running_jobs`, C1-C4 tier bases,
--   floor values, QUORUM_MIN or verdict literals are touched here.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- ─── 1. Retention rows always land ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_retention_run()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_rows bigint := 0;
BEGIN
  INSERT INTO public.retention_runs (run_at, step, status, rows_affected, error_message)
  SELECT now(), r.step, r.status, COALESCE(r.rows_affected, 0), r.error_message
  FROM public.run_daily_retention() AS r;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.retention_runs
  WHERE run_at < now() - interval '90 days';

  RETURN v_rows;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_retention_run()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_retention_run()
  TO service_role;

-- ─── 2. The alert workflow is dispatchable ─────────────────────────────────
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
    'turso-control-plane-alert.yml',
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

REVOKE ALL ON FUNCTION public.dispatch_github_workflow(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_github_workflow(text, text)
  TO service_role;

-- ─── 3. Re-enabling keeps the hourly alert cadence ─────────────────────────
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

  -- Hourly: the 25-minute scheduler-age check makes a stopped capture
  -- observable at :10/:25/:40/:55, and an hourly poll at :10 lands at most
  -- 55 minutes after the first missed capture.
  PERFORM cron.schedule(
    'github-dispatch-turso-control-plane-alert', '10 * * * *',
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

REVOKE ALL ON FUNCTION public.enable_github_workflow_dispatcher()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enable_github_workflow_dispatcher()
  TO service_role;

-- ─── 4. Rewire the scheduler (idempotent, no redeploy needed) ──────────────
SELECT cron.unschedule('github-dispatch-turso-control-plane-alert')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-turso-control-plane-alert'
);
SELECT cron.schedule(
  'github-dispatch-turso-control-plane-alert',
  '10 * * * *',
  'SELECT public.dispatch_github_workflow(''turso-control-plane-alert.yml'');'
);

COMMIT;

-- ROLLBACK: restore the 0142 bodies for `dispatch_github_workflow`
-- (without `turso-control-plane-alert.yml`), `enable_github_workflow_dispatcher`
-- (alert at `10,25,40,55`), and `record_retention_run` (no COALESCE); then
-- reschedule the alert at `10,25,40,55`. Rolling the allowlist entry back
-- makes every alert dispatch fail again.
