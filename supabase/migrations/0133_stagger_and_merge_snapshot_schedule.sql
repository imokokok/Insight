-- Migration 0133: remove the 15-minute price-slot dispatch failure mode.
--
-- Diagnosis (2026-11-01..07): 132 missing 15-minute slots; 122 of them never
-- created a GitHub run because pg_cron failed to start the dispatching job with
-- `job startup timeout` (271/271 failures in a 7-hour window). 31 active jobs
-- share `max_worker_processes = 6` and `cron.max_running_jobs = 32`, so the
-- scheduler itself is capacity-bound, not the collector code.
--
-- Two independent measures, applied in this order:
--
--   1. MERGE same-cadence, independent daily retention/cleanup jobs into one
--      sequenced job. 18 scheduled jobs become 1 (net -17 recurring jobs),
--      before any minute arithmetic happens; the second probe added below
--      brings the final count to 17.
--      Each step runs in its own PL/pgSQL exception block (a subtransaction),
--      so one failing DELETE cannot roll back the others, and every step
--      reports its own name/status/error in `cron.job_run_details` output and
--      PostgreSQL logs.
--
--   2. STAGGER everything that remains. Collection-critical dispatches keep
--      their debugged cadence; non-critical jobs move off the collection
--      minutes (:00/:07/:12/:15/:22/:27/:30/:37/:42/:45/:48/:52/:55/:57 plus
--      the projection minutes :03/:10/:18/:25/:33/:40/:55).
--
-- `cron.unschedule` is only called immediately before re-scheduling the same
-- job name in this migration. It is not applied to running jobs: pg_cron
-- unschedule removes future starts while an already-started statement keeps
-- running. The only risk is a job whose current run started in the same
-- transaction, which this migration avoids by performing no long work.
--
-- Deliberate limit: cross-slot retries are forbidden (design, not omission).
--   The second probe retries a timed-out snapshot dispatch only while its
--   `scheduled_for` still resolves to the slot that is current at probe time
--   (:12/:27/:42/:57). A dispatch whose slot has already closed is marked
--   `lost` and abandoned. Retrying it later would write prices captured at
--   10:40 into a slot labelled 10:00, silently poisoning attestations,
--   signed evidence and historical reports; that trade is never acceptable.
--   Same-slot recovery is already covered by the :00/:15/:30/:45 dispatch
--   spanning the whole slot plus the :12/:27/:42/:57 probe, so no late
--   backfill is needed. Do not "optimise" this back into a time-window
--   retry.
--
-- Automation boundary:
--   If `job startup timeout` still appears after this migration, the next
--   layer to inspect is `max_worker_processes` (with `cron.max_running_jobs`),
--   not a wider retry window. Scheduler capacity is the remaining variable;
--   widening retries would buy availability by corrupting slot semantics.
--
-- Rollback: re-apply 0121 (or 0120) to restore the previous minutes and job
-- set. The merged job is additive and can be unscheduled independently.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Pre-execution inventory. The repository declares 33 active jobs while the
-- diagnosis report counted 31; do not guess which two differ. Print the live
-- count and the exact name set so an operator can reconcile it against the
-- post-execution inventory below (expected: 17 jobs).
DO $inventory_before$
DECLARE
  v_count integer;
  v_names text;
BEGIN
  SELECT count(*), string_agg(jobname, ', ' ORDER BY jobname)
  INTO v_count, v_names
  FROM cron.job;

  RAISE NOTICE '0133 cron inventory (pre): % active job(s): %',
    v_count, coalesce(v_names, '<none>');
END;
$inventory_before$;

-- `lost` is a distinct terminal status for dispatches abandoned because their
-- slot closed before a retry could run. It is countable by monitoring and is
-- never treated as retryable. This constraint is a superset of the 0045 set,
-- so every existing row already satisfies it.
ALTER TABLE public.cron_dispatch_runs
  DROP CONSTRAINT IF EXISTS cron_dispatch_runs_status_check;
ALTER TABLE public.cron_dispatch_runs
  ADD CONSTRAINT cron_dispatch_runs_status_check
  CHECK (status IN (
    'dispatching', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out', 'lost'
  ));

-- ─── Merge: one nightly retention job instead of 21 ────────────────────────
--
-- Same cadence (daily), same off-peak window, no ordering dependency except
-- where explicitly sequenced below:
--   * archive maintenance must run before the raw-history deletes so the
--     oldest eligible day is copied before it becomes eligible for deletion;
--   * lifecycle/check rows are removed before their window parent rows because
--     `position_lifecycles.window_id` and `oracle_watch_checks.window_id`
--     reference `oracle_watch_windows`.
-- Every other step is an independent retention delete.
--
-- The maintenance function keeps its own 45s timeout and skips itself when
-- active client queries or a recent in-flight snapshot dispatch are present;
-- the merged job's 90s bound applies per delete and lets a slow delete fail
-- alone rather than cancel the whole run.

CREATE OR REPLACE FUNCTION public.run_daily_retention()
RETURNS TABLE(step text, status text, rows_affected bigint, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET lock_timeout = '2s'
SET statement_timeout = '90s'
AS $function$
DECLARE
  v_rows bigint;
BEGIN
  -- 1. Archive the oldest eligible UTC day before deleting raw history.
  step := 'snapshot-archive-maintenance';
  status := 'ok';
  rows_affected := NULL;
  error_message := NULL;
  BEGIN
    PERFORM public.maintain_snapshot_archives();
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 2. Archive rows past the 120-day product window.
  step := 'snapshot-archive-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.snapshot_archives
    WHERE archive_day < (now() AT TIME ZONE 'UTC')::date - 120;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 3. Raw fine-grained history past the 120-day window.
  step := 'price-snapshots-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.price_snapshots
    WHERE snapshot_ts < now() - interval '120 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 4. Hourly history past the same window.
  step := 'hourly-snapshots-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.hourly_price_snapshots
    WHERE snapshot_hour < now() - interval '120 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 5. Independent market-reference retention (120 days).
  step := 'market-reference-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.market_reference_snapshots
    WHERE snapshot_ts < now() - interval '120 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 6. Lifecycles before their referenced windows (180 days).
  step := 'position-lifecycles-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.position_lifecycles
    WHERE (status = 'closed' AND closed_at < now() - interval '180 days')
       OR expires_at < now() - interval '180 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 7. Watch checks before their referenced windows (180 days).
  step := 'oracle-watch-checks-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.oracle_watch_checks
    WHERE created_at < now() - interval '180 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 8. Watch windows (180 days).
  step := 'oracle-watch-windows-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.oracle_watch_windows
    WHERE (status = 'closed' AND closed_at < now() - interval '180 days')
       OR expires_at < now() - interval '180 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 9. Execution receipts (180 days).
  step := 'execution-receipts-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.execution_receipts
    WHERE created_at < now() - interval '180 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 10. Reputation history (7 days via its own function).
  step := 'reputation-history-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    PERFORM public.cleanup_old_reputation_history(7);
    rows_affected := NULL;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 11. API-key usage retention.
  step := 'api-key-usage-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    PERFORM public.cleanup_api_key_usage();
    rows_affected := NULL;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 12. Feed-health snapshots (90 days).
  step := 'feed-health-snapshots-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.feed_health_snapshots
    WHERE evaluated_at < now() - interval '90 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 13. Manipulation-cost pool snapshots (365 days).
  step := 'manip-cost-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.manip_cost_pool_snapshots
    WHERE snapshot_ts < now() - interval '365 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 14. DEX swap events (35 days).
  step := 'dex-market-swap-events-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.dex_market_swap_events
    WHERE block_timestamp < now() - interval '35 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 15. Pre-trade checks (180 days).
  step := 'cleanup-pre-trade-checks';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.pre_trade_checks
    WHERE created_at < now() - interval '180 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 16. Coverage SLO samples (90 days).
  step := 'cleanup-coverage-slo';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.coverage_slo_samples
    WHERE recorded_at < now() - interval '90 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 17. Dispatch ledger (30 days). Moves here from the dispatcher control
  -- function: it is retention, not a dispatch, so it does not belong on the
  -- failure-sensitive dispatcher path.
  step := 'github-dispatch-ledger-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.cron_dispatch_runs
    WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 18. pg_cron's own run history (30 days).
  step := 'native-cron-log-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM cron.job_run_details
    WHERE end_time < now() - interval '30 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.run_daily_retention()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_daily_retention()
  TO service_role;

-- Replace the 21 daily jobs with one sequenced job. 19:16 UTC is the existing
-- off-peak archive window (03:16 Asia/Shanghai) and does not collide with a
-- collection or fallback minute.
SELECT cron.unschedule('snapshot-archive-maintenance')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance');
SELECT cron.unschedule('snapshot-archive-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-cleanup');
SELECT cron.unschedule('price-snapshots-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-snapshots-cleanup');
SELECT cron.unschedule('hourly-snapshots-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-snapshots-cleanup');
SELECT cron.unschedule('market-reference-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'market-reference-cleanup');
SELECT cron.unschedule('position-lifecycles-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'position-lifecycles-cleanup');
SELECT cron.unschedule('oracle-watch-checks-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oracle-watch-checks-cleanup');
SELECT cron.unschedule('oracle-watch-windows-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oracle-watch-windows-cleanup');
SELECT cron.unschedule('execution-receipts-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execution-receipts-cleanup');
SELECT cron.unschedule('reputation-history-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-history-cleanup');
SELECT cron.unschedule('api-key-usage-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-key-usage-cleanup');
SELECT cron.unschedule('feed-health-snapshots-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-health-snapshots-cleanup');
SELECT cron.unschedule('manip-cost-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'manip-cost-cleanup');
SELECT cron.unschedule('dex-market-swap-events-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dex-market-swap-events-cleanup');
SELECT cron.unschedule('cleanup-pre-trade-checks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-pre-trade-checks');
SELECT cron.unschedule('cleanup-coverage-slo')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-coverage-slo');
SELECT cron.unschedule('github-dispatch-ledger-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-ledger-cleanup');
SELECT cron.unschedule('native-cron-log-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'native-cron-log-cleanup');

SELECT cron.unschedule('nightly-retention-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-retention-cleanup');
SELECT cron.schedule(
  'nightly-retention-cleanup',
  '16 19 * * *',
  'SELECT * FROM public.run_daily_retention()'
);

-- ─── Stagger: remaining recurring jobs ──────────────────────────────────────
--
-- Collection-critical minutes are reserved:
--   :00/:15/:30/:45 snapshot-collect
--   :03/:18/:33/:48 turso-price-project
--   :07/:22/:37/:52 snapshot fallback probe
--   :12/:27/:42/:57 second snapshot probe (added below)
--   :10/:25/:40/:55 projection fallback probe
--
-- Only non-critical jobs are moved. Every statement is unschedule-if-exists +
-- schedule, so re-running this migration never creates a duplicate job.

-- Hourly auth lifecycle (not a retention job): move :07 -> :02.
SELECT cron.unschedule('api-keys-deactivation')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-keys-deactivation');
SELECT cron.schedule('api-keys-deactivation', '2 * * * *',
  'SELECT public.deactivate_expired_api_keys()');

-- Expired cache rows every 30 minutes: move :20/:50 -> :06/:36.
SELECT cron.unschedule('price-records-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-records-cleanup');
SELECT cron.schedule('price-records-cleanup', '6,36 * * * *',
  'SELECT public.cleanup_expired_price_records()');

-- Rate-limit rows every 15 minutes: keep the cadence, pin off collection minutes.
SELECT cron.unschedule('rate-limits-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limits-cleanup');
SELECT cron.schedule('rate-limits-cleanup', '4,19,34,49 * * * *',
  'SELECT public.cleanup_rate_limits()');

-- ─── Function definitions used by the dispatcher scheduler ──────────────────

-- Second probe: a second, independent attempt inside the same 15-minute slot.
-- The receipt lookup and Turso slot lease make a duplicate dispatch harmless:
-- the second runner observes the completed lease and writes nothing.
CREATE OR REPLACE FUNCTION public.dispatch_turso_snapshot_second_probe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_slot timestamptz;
  v_projected boolean;
  v_token text;
  v_retry record;
  v_dispatched boolean := false;
  v_retried integer := 0;
BEGIN
  v_slot := date_trunc('hour', v_now)
    + floor(extract(minute FROM v_now) / 15) * interval '15 minutes';

  SELECT EXISTS (
    SELECT 1
    FROM public.turso_price_slot_receipts
    WHERE snapshot_ts = v_slot
  ) INTO v_projected;

  IF NOT v_projected THEN
    PERFORM public.dispatch_github_workflow('snapshot-collect.yml');
    v_dispatched := true;
  END IF;

  -- Cross-slot abstention (intentional). A timed-out dispatch whose slot has
  -- already closed is abandoned here: it is marked `lost`, a terminal state
  -- that monitoring can count, and it is never retried. Retrying it would
  -- label a closed slot with prices captured later, which is silent data
  -- corruption, not "late capture".
  UPDATE public.cron_dispatch_runs
  SET status = 'lost',
      conclusion = 'cross_slot_abandoned: no late backfill',
      completed_at = now(),
      updated_at = clock_timestamp()
  WHERE workflow_file = 'snapshot-collect.yml'
    AND source = 'supabase_cron'
    AND status = 'timed_out'
    AND date_trunc('hour', scheduled_for)
        + floor(extract(minute FROM scheduled_for) / 15) * interval '15 minutes'
        <> v_slot;

  SELECT decrypted_secret
  INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'github_workflow_dispatch_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 20 THEN
    RETURN v_dispatched;
  END IF;

  -- Same-slot only: a retry is allowed iff
  --   resolveSnapshotSlot(scheduled_for) = resolveSnapshotSlot(now())
  -- i.e. the original dispatch still resolves to the slot that is current at
  -- probe time. No time window is needed because slot equality already bounds
  -- it; every timed-out dispatch from an older slot was marked `lost` above.
  -- The original `scheduled_for` is preserved so the collector resolves the
  -- same slot, and the Turso slot lease plus the Supabase receipt remain the
  -- single-write guard if GitHub starts both runs.
  FOR v_retry IN
    SELECT r.id, r.scheduled_for
    FROM public.cron_dispatch_runs r
    WHERE r.workflow_file = 'snapshot-collect.yml'
      AND r.source = 'supabase_cron'
      AND r.status = 'timed_out'
      AND date_trunc('hour', r.scheduled_for)
          + floor(extract(minute FROM r.scheduled_for) / 15) * interval '15 minutes'
          = v_slot
      AND NOT EXISTS (
        SELECT 1
        FROM public.turso_price_slot_receipts s
        WHERE s.snapshot_ts = v_slot
      )
    ORDER BY r.scheduled_for DESC
    LIMIT 2
  LOOP
    UPDATE public.cron_dispatch_runs
    SET status = 'dispatching',
        conclusion = NULL,
        completed_at = NULL,
        created_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = v_retry.id
      AND status = 'timed_out';

    IF FOUND THEN
      BEGIN
        PERFORM net.http_post(
          url := 'https://api.github.com/repos/imokokok/Insight/actions/workflows/snapshot-collect.yml/dispatches',
          headers := jsonb_build_object(
            'Accept', 'application/vnd.github+json',
            'Authorization', 'Bearer ' || v_token,
            'Content-Type', 'application/json',
            'User-Agent', 'insight-supabase-cron',
            'X-GitHub-Api-Version', '2026-03-10'
          ),
          body := jsonb_build_object(
            'ref', 'main',
            'inputs', jsonb_build_object(
              'dispatch_id', v_retry.id::text,
              'scheduled_for', v_retry.scheduled_for::text
            )
          ),
          timeout_milliseconds := 5000
        );
        v_retried := v_retried + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Restore the timed_out state so a later probe can retry it instead of
        -- leaving the row stuck in `dispatching` for another 20 minutes.
        UPDATE public.cron_dispatch_runs
        SET status = 'timed_out',
            conclusion = 'retry dispatch failed: ' || SQLERRM,
            completed_at = now(),
            updated_at = clock_timestamp()
        WHERE id = v_retry.id;
        RAISE WARNING 'second probe retry dispatch failed for %: %',
          v_retry.id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RETURN v_dispatched OR v_retried > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_turso_snapshot_second_probe()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_turso_snapshot_second_probe()
  TO service_role;

-- Keep the disable list complete so an operator can actually stop every
-- scheduler-owned job, including the new probe and the legacy ledger cleanup.
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
    'github-dispatch-turso-snapshot-second-probe',
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

  -- Authoritative high-frequency clock. Collection-critical cadences are
  -- unchanged from 0121; only the second probe is added.
  PERFORM cron.schedule(
    'github-dispatch-snapshot-collect', '0,15,30,45 * * * *',
    $command$SELECT public.dispatch_github_workflow('snapshot-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-price-project', '3,18,33,48 * * * *',
    $command$SELECT public.dispatch_github_workflow('turso-price-project.yml');$command$
  );

  -- First and second recovery probes in every slot. A healthy slot already
  -- owns its receipt, so both are indexed no-op lookups.
  PERFORM cron.schedule(
    'github-dispatch-turso-snapshot-fallback', '7,22,37,52 * * * *',
    $command$SELECT public.dispatch_turso_snapshot_fallback_if_unprojected();$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-snapshot-second-probe', '12,27,42,57 * * * *',
    $command$SELECT public.dispatch_turso_snapshot_second_probe();$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-turso-projection-fallback', '10,25,40,55 * * * *',
    $command$SELECT public.dispatch_turso_projection_fallback_if_unprojected();$command$
  );

  -- Remaining product dispatches, moved off the reserved collection minutes.
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

  -- Timeout reaper. Moved one minute off every collection/fallback start so
  -- it cannot contend with the scheduler workers that dispatch them.
  PERFORM cron.schedule(
    'github-dispatch-mark-stale', '1,11,21,31,41,51 * * * *',
    $command$
      UPDATE public.cron_dispatch_runs
      SET status = 'timed_out', completed_at = now(), conclusion = 'no GitHub completion callback'
      WHERE status IN ('dispatching', 'running')
        AND created_at < now() - interval '20 minutes';
    $command$
  );
  -- Ledger retention moved into `run_daily_retention`; do not resurrect it here.
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
      'Staggered scheduler activation deferred: github_workflow_dispatch_token is unavailable';
  END IF;
END;
$block$;

-- Post-execution inventory. Compare this name set with the pre-execution
-- notice above: the merged job replaces 18 unscheduled jobs and the dispatcher
-- set becomes 13 jobs, so the expected result is 17 total (13 dispatchers +
-- 3 recurring standalone + 1 nightly merge). A lower count means the Vault
-- token was unavailable and the dispatcher set was left disabled; the notice
-- makes that explicit instead of hiding it.
DO $inventory_after$
DECLARE
  v_count integer;
  v_names text;
BEGIN
  SELECT count(*), string_agg(jobname, ', ' ORDER BY jobname)
  INTO v_count, v_names
  FROM cron.job;

  RAISE NOTICE '0133 cron inventory (post): % active job(s): %',
    v_count, coalesce(v_names, '<none>');
END;
$inventory_after$;

COMMIT;
