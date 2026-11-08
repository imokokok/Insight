-- Migration 0141: trim pg_cron startup counts (not the worker pool)
--
-- Numbering: 0140 is the highest committed number, so 0141 is next.
--
-- Measured context (2026-11-08, production):
--   * 18 jobs = 1,036 scheduled starts per day.
--   * `cron.job_run_details` holds 2,863 `job startup timeout` failures over the
--     last 30 days: every single day, 6-354 per day. Successful dispatchers
--     finish in 0.1-4.4 s, so this is worker-pool starvation, not slow SQL.
--     Cost in data: 11-07 lost 26 of 96 fifteen-minute slots in one 6h15m gap,
--     and full days run at 57-95 slots against the nominal 96.
--   * Scope: this migration only reduces the NUMBER OF STARTS,
--     1,036 -> 868 per day. It does NOT change `max_worker_processes` (still 6),
--     `cron.max_running_jobs` (still 32), or any platform-level capacity knob.
--     Worker-pool headroom remains an open platform task.
--
-- Changes:
--   1. Merge the two conditional fallback probes. They ran the identical
--      `turso_price_slot_receipts` EXISTS check on the same slot and differed
--      only in which workflow they dispatched. One function now performs the
--      check once and dispatches both recovery paths. The two jobs
--      (`7,22,37,52` and `10,25,40,55`) collapse into one at `7,22,37,52`:
--      -96 starts/day. The projection fallback now fires 4 minutes after its
--      primary dispatch (:03/:18/...) instead of 7; both paths still run inside
--      the same 15-minute slot, and the Turso slot lease plus the Supabase
--      receipt remain the single-write guard if GitHub starts both runners.
--   2. `rate-limits-cleanup` drops from 96 to 24 starts/day (hourly at :04).
--      `increment_rate_limit()` already resets an expired row in place on the
--      next hit, so this cleanup is hygiene, not correctness. At measurement
--      time the table held 10 rows and 0 expired rows.
--   3. `run_daily_retention()`'s 18-row result only reached
--      `cron.job_run_details.return_message`. pg_cron stores the row COUNT there,
--      not the rows: a one-row RETURNS TABLE run was recorded as "1 row".
--      Per-step status - including 0137's `evidence-retention-boundary`
--      observation row - was therefore invisible. `retention_runs` now stores
--      the rows verbatim and prunes itself to 90 days inside the same run.

BEGIN;

-- ─── Durable retention results ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  step text NOT NULL,
  status text NOT NULL,
  rows_affected bigint NOT NULL DEFAULT 0,
  error_message text
);

CREATE INDEX IF NOT EXISTS retention_runs_run_at_idx
  ON public.retention_runs (run_at DESC);

ALTER TABLE public.retention_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.retention_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.retention_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.retention_runs_id_seq TO service_role;

-- Runs the daily retention sweep and persists every step row. One statement
-- means one cron start and one atomic transaction: the DELETE steps and their
-- audit rows commit together, so a run can never delete data without leaving a
-- trace, or leave a trace for a rolled-back delete.
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
  SELECT now(), r.step, r.status, r.rows_affected, r.error_message
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

-- ─── Merged conditional fallback ────────────────────────────────────────────
-- Union of `dispatch_turso_snapshot_fallback_if_unprojected()` and
-- `dispatch_turso_projection_fallback_if_unprojected()`: same receipt gate,
-- both dispatch paths, no extra probe.
CREATE OR REPLACE FUNCTION public.dispatch_turso_fallbacks_if_unprojected()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_slot timestamptz;
BEGIN
  v_slot := date_trunc('hour', v_now)
    + floor(extract(minute FROM v_now) / 15) * interval '15 minutes';

  IF EXISTS (
    SELECT 1
    FROM public.turso_price_slot_receipts
    WHERE snapshot_ts = v_slot
  ) THEN
    RETURN false;
  END IF;

  PERFORM public.dispatch_github_workflow('snapshot-collect.yml');
  PERFORM public.dispatch_github_workflow('turso-price-project.yml');
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_turso_fallbacks_if_unprojected()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_turso_fallbacks_if_unprojected()
  TO service_role;

-- ─── Operator switches stay complete ────────────────────────────────────────
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

-- ─── Rewire the scheduler ───────────────────────────────────────────────────
SELECT cron.unschedule('github-dispatch-turso-snapshot-fallback')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-turso-snapshot-fallback'
);
SELECT cron.unschedule('github-dispatch-turso-projection-fallback')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-turso-projection-fallback'
);
SELECT cron.schedule(
  'github-dispatch-turso-fallbacks',
  '7,22,37,52 * * * *',
  'SELECT public.dispatch_turso_fallbacks_if_unprojected();'
);

-- Hourly is enough: reads reset an expired row in place, so this is hygiene.
SELECT cron.unschedule('rate-limits-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limits-cleanup');
SELECT cron.schedule(
  'rate-limits-cleanup',
  '4 * * * *',
  'SELECT public.cleanup_rate_limits()'
);

-- Same time, new command: the wrapper persists the step rows.
SELECT cron.unschedule('nightly-retention-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-retention-cleanup');
SELECT cron.schedule(
  'nightly-retention-cleanup',
  '16 19 * * *',
  'SELECT public.record_retention_run();'
);

COMMIT;

-- ROLLBACK: restore the two probes, the quarter-hour cleanup, and the
-- row-count-only nightly command. `retention_runs` and the wrapper can stay in
-- place (they are additive); drop them only if the table itself must go.
--
-- BEGIN;
-- SELECT cron.unschedule('github-dispatch-turso-fallbacks')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-turso-fallbacks');
-- SELECT cron.schedule('github-dispatch-turso-snapshot-fallback','7,22,37,52 * * * *',
--   'SELECT public.dispatch_turso_snapshot_fallback_if_unprojected();');
-- SELECT cron.schedule('github-dispatch-turso-projection-fallback','10,25,40,55 * * * *',
--   'SELECT public.dispatch_turso_projection_fallback_if_unprojected();');
-- SELECT cron.unschedule('rate-limits-cleanup')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limits-cleanup');
-- SELECT cron.schedule('rate-limits-cleanup','4,19,34,49 * * * *',
--   'SELECT public.cleanup_rate_limits()');
-- SELECT cron.unschedule('nightly-retention-cleanup')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-retention-cleanup');
-- SELECT cron.schedule('nightly-retention-cleanup','16 19 * * *',
--   'SELECT * FROM public.run_daily_retention()');
-- COMMIT;
