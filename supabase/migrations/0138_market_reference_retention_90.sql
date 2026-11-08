-- Migration 0138: market_reference_snapshots retention 120 -> 90 days.
--
-- Numbering: production `supabase_migrations.schema_migrations` currently ends
-- at 0137 (`retention_window_rebalance`), and no branch in this repository
-- carries 0138/0139 at creation time, so 0138 is the next free number.
--
-- Where the threshold lives (verified: exactly one place):
--   * `public.run_daily_retention()` step 5 (`market-reference-cleanup`):
--     `DELETE FROM public.market_reference_snapshots
--      WHERE snapshot_ts < now() - interval '120 days'`.
--   * There is no application-side retention constant for this table. The
--     collector (`src/lib/marketReference/**`) only writes samples; repo-wide
--     grep and the live function body both show this single SQL literal.
--   * Step 3 (`price_snapshots`, 120 days), step 4
--     (`hourly_price_snapshots`, 120 days), archived-block cleanup (90 days)
--     and feed-health cleanup (60 days) are deliberately untouched.
--
-- This migration does not change table structure, columns, indexes, the write
-- path, sampling cadence, the cron schedule, or any other retention step. Only
-- the nightly DELETE predicate in step 5 moves from 120 to 90 days.
--
-- Space accounting (no reclaim claim):
--   * A threshold change does not shrink the database file. No `VACUUM FULL`
--     and no table rewrite happen here.
--   * At the measured 1,303 rows/day and 963 bytes/row, a 120-day window
--     would reach ~156k rows (~150 MB physical); 90 days stops at ~117k rows
--     (~112 MB). That ~37 MB is growth that will never be written, not space
--     returned today.
--   * Rows younger than 90 days are untouched, so the first nightly
--     `rows_affected` is expected to be 0 (oldest sample is 2026-10-09).
--   * Pages freed by later deletes remain reusable inside the same table and
--     are consumed by incoming samples.
--
-- Rollback: recreate `run_daily_retention()` with step 5 back at
-- `interval '120 days'` (the pre-0138 production body). The cron job text does
-- not change because it still calls the same function by name.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

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

  -- 5. Independent market-reference retention (90 days, was 120).
  --    Only this window moves in this migration; see the file header.
  step := 'market-reference-cleanup';
  status := 'ok';
  error_message := NULL;
  BEGIN
    DELETE FROM public.market_reference_snapshots
    WHERE snapshot_ts < now() - interval '90 days';
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

COMMIT;

