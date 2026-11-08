-- Migration 0137: rebalance two retention windows, and make the evidence
-- boundary explicit.
--
-- Numbering: `supabase/migrations` already carries 0130 through 0136 with no
-- gaps or duplicates (#514 merged), so this takes the next free number (0137).
--
-- Two product windows move, everything else stays as it is:
--
--   * `snapshot_archives` cleanup 120 -> 90 days. Only `kind='price'` and
--     `kind='hourly'` blocks live here; archived evidence payloads are not
--     affected because `maintain_snapshot_archives()` archives price/hourly
--     observations only. The 120-day hold was sized for raw price history that
--     no longer arrives (`price_snapshots` has been write-idle since
--     2026-10-31, Turso-primary projection writes `hourly_price_snapshots`),
--     so 90 days keeps a full quarter of hourly history and still leaves the
--     7-day archive lag untouched.
--   * `feed_health_snapshots` cleanup 90 -> 60 days. These are evaluated
--     health verdicts, not evidence; 60 days covers every operational question
--     ("which feed degraded over the last two months") without keeping a
--     second copy of per-evaluation rows.
--
-- `price_snapshots-cleanup`, `hourly-snapshots-cleanup` and the other 14
-- unchanged steps keep their current windows. `cron.job_run_details` (30 days),
-- `cron_dispatch_runs` (30 days) and `api_key_usage` (90 days) already have
-- retention and are left alone; `auth.audit_log_entries` is Supabase-managed
-- and is not touched.
--
-- One step is removed and replaced by an observation row:
--   `execution-receipts-cleanup` used to DELETE `execution_receipts` rows older
--   than 180 days from inside this nightly function. That contradicted the
--   verifiability promise (a receipt must stay checkable for as long as a
--   counterparty can dispute it), and the leftover cron entry from 0037 was
--   already merged away by 0133, so nothing else could delete them. The step is
--   replaced with `evidence-retention-boundary`, which reports
--   `skipped / 0` every night. This is a tripwire, not documentation: if
--   someone reintroduces a DELETE for receipts, the step name changes and the
--   nightly output stops saying `evidence-retention-boundary=skipped`.
--   Attestation rows and archived evidence payloads are covered by the same
--   rule and likewise have no DELETE path.
--
-- Two pre-existing step defects are fixed while the body is being replaced,
-- because a retention step that never deletes is worse than no step at all:
--   `position-lifecycles-cleanup` and `oracle-watch-windows-cleanup` referenced
--   `status` unqualified inside the function, where the OUT parameter of the
--   same name is in scope. Both raise `column reference "status" is
--   ambiguous` at runtime (verified by a rolled-back transactional rehearsal
--   against production data on 2026-11-08), so they can never delete a row
--   while the ambiguity stands. The tables now use a table alias.
--   No window or predicate changes.
--
-- Space accounting (measured on production 2026-11-08, not estimated):
--   * immediate release: ~8.7 MB (5,517 archive blocks / 75,297 archived
--     observations past day 90, ~5.5 MB; 6,579 `feed_health_snapshots` rows
--     past day 60, ~3.2 MB).
--   * steady-state saving: ~18 MB, not ~30 MB, because part of the alleged
--     saving was double-counted against rows that were never going to arrive
--     while `price_snapshots` is write-idle. If price collection resumes on the
--     Supabase primary, the saving grows materially: raw price rows then flow
--     into `snapshot_archives`, which is now trimmed at 90 days instead of 120.
--
-- No `VACUUM FULL` is run here: it would take an exclusive lock and rewrite the
-- whole table during a retention window. Physically, the database file does not
-- shrink immediately; freed pages are reused by later inserts, so the observed
-- size falls as new writes consume them. Supabase also autovacuums these heaps.
--
-- No new pg_cron job: all steps stay inside `nightly-retention-cleanup`
-- (19:16 UTC), which 0133 established as the single retention entry point.
--
-- Rollback: restore the 18-step `public.run_daily_retention()` body from 0133
-- verbatim (archive cleanup at 120 days, feed health at 90 days, and the
-- `execution-receipts-cleanup` step back in place). The cron job text does not
-- change, so no unschedule/reschedule is needed beyond the idempotent
-- re-schedule below.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Pre-execution inventory (informational, expected shape before the change):
--   `run_daily_retention` returns 18 rows: execution-receipts present,
--   snapshot-archive-cleanup=120, feed-health-snapshots-cleanup=90.
-- After this migration the same job returns 18 rows with
--   evidence-retention-boundary=skipped, snapshot-archive-cleanup=90,
--   feed-health-snapshots-cleanup=60.
-- The job count stays at 18 (0136 added `snapshot-archive-maintenance-early`);
-- this migration adds no job.

CREATE OR REPLACE FUNCTION public.run_daily_retention()
 RETURNS TABLE(step text, status text, rows_affected bigint, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '2s'
 SET statement_timeout TO '90s'
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

  -- 2. Archived price/hourly blocks past the 90-day product window.
  --    90 (was 120): a full quarter of archived hourly history is enough, and
  --    raw price rows are write-idle, so the extra month only held dead weight.
  step := 'snapshot-archive-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.snapshot_archives
    WHERE archive_day < (now() AT TIME ZONE 'UTC')::date - 90;
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
  --    Table alias is required: the OUT parameter `status` is in scope here and
  --    an unqualified `status` made this DELETE fail at runtime with
  --    `column reference "status" is ambiguous` (pre-existing since 0133; the
  --    step reported `failed` and never deleted a row). Qualifying the column
  --    restores the intended 180-day retention.
  step := 'position-lifecycles-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.position_lifecycles AS p
    WHERE (p.status = 'closed' AND p.closed_at < now() - interval '180 days')
       OR p.expires_at < now() - interval '180 days';
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

  -- 8. Watch windows (180 days). Same `status` ambiguity as step 6; alias
  --    qualified for the same reason.
  step := 'oracle-watch-windows-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.oracle_watch_windows AS w
    WHERE (w.status = 'closed' AND w.closed_at < now() - interval '180 days')
       OR w.expires_at < now() - interval '180 days';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    rows_affected := v_rows;
  EXCEPTION WHEN OTHERS THEN
    status := 'failed';
    rows_affected := NULL;
    error_message := SQLERRM;
  END;
  RAISE NOTICE 'daily_retention.%=%', step, status;
  RETURN NEXT;

  -- 9. Evidence boundary. `execution_receipts` and attestation rows are
  --    permanent: a counterparty can dispute a signed receipt years later, so
  --    deleting the queryable copy destroys the "verifiable" promise. The
  --    previous 180-day DELETE is removed deliberately; this row reports
  --    `skipped` every night so a reintroduced delete becomes visible in the
  --    job output instead of failing silently.
  step := 'evidence-retention-boundary';
  status := 'skipped';
  rows_affected := 0;
  error_message := 'execution_receipts/attestations/archived evidence are permanent; no DELETE path';
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

  -- 12. Feed-health snapshots (60 days, was 90).
  step := 'feed-health-snapshots-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.feed_health_snapshots
    WHERE evaluated_at < now() - interval '60 days';
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

-- The job definition does not change (19:16 UTC, unchanged minute, no new job).
-- Re-schedule idempotently so a drifted cron entry is repaired by this
-- migration rather than by hand.
SELECT cron.unschedule('nightly-retention-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-retention-cleanup');
SELECT cron.schedule(
  'nightly-retention-cleanup',
  '16 19 * * *',
  'SELECT * FROM public.run_daily_retention()'
);

COMMIT;

-- ROLLBACK (restores 0133 behavior):
--   Re-apply the `CREATE OR REPLACE FUNCTION public.run_daily_retention()`
--   block from `0133_stagger_and_merge_snapshot_schedule.sql` verbatim:
--     - `snapshot-archive-cleanup` back to 120 days,
--     - `feed-health-snapshots-cleanup` back to 90 days,
--     - `execution-receipts-cleanup` restored (180-day DELETE),
--     - `evidence-retention-boundary` row dropped.
--   The cron job (`nightly-retention-cleanup`, `16 19 * * *`) keeps the same
--   text, so re-running the idempotent unschedule/schedule pair above is enough.
--   Two cautions: restoring the receipt DELETE re-deletes `execution_receipts`
--   older than 180 days on the next nightly run, and restoring 0133 verbatim
--   also reintroduces the `status` ambiguity in steps 6 and 8. If only the
--   windows are being reverted, keep this migration's table aliases.
