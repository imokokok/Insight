-- Sustain the Nano Disk I/O budget after the history-read fixes in 0098.
--
-- This migration removes writes that cannot improve product data, lets
-- autovacuum reclaim churn before it becomes a large scan, and prevents the
-- daily retention jobs from converging in one resource-intensive window.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- `price_snapshots` is append-and-archive and `hourly_price_snapshots` is
-- updated by collectors.  The server defaults wait for ~20% churn before
-- vacuuming, which allowed tens of thousands of dead tuples to accumulate on
-- Nano.  These thresholds are deliberately moderate: early cleanup without
-- continuous autovacuum work.
ALTER TABLE public.price_snapshots SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 500,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_analyze_threshold = 500
);
ALTER TABLE public.hourly_price_snapshots SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 250,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_analyze_threshold = 250
);
ALTER TABLE public.price_records SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 250,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_analyze_threshold = 250
);
ALTER TABLE public.cron_dispatch_runs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_analyze_threshold = 50
);

-- A collector runs four times per hour but the hourly table can store only one
-- observation for a feed/hour.  The former general upsert rewrote successful
-- rows on each run.  Keep the first successful observation, while still
-- allowing a later success to repair an earlier failure.  The conflict clause
-- makes retries idempotent and prevents the normal successful path from
-- generating dead tuples or index writes.
CREATE OR REPLACE FUNCTION public.upsert_hourly_price_snapshots(p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  written integer;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected an hourly snapshot batch array';
  END IF;
  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Expected an hourly snapshot batch of at most 500 rows';
  END IF;

  WITH parsed AS (
    SELECT row.*, input.ordinality
    FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS input(payload, ordinality)
    CROSS JOIN LATERAL jsonb_to_record(input.payload) AS row(
      snapshot_hour timestamptz,
      provider text,
      symbol text,
      chain_id integer,
      price numeric,
      consensus_price numeric,
      deviation_pct numeric,
      latency_ms integer,
      data_age_seconds integer,
      confidence numeric,
      is_success boolean,
      error_message text
    )
  ), deduplicated AS (
    SELECT DISTINCT ON (snapshot_hour, provider, symbol, chain_id)
      snapshot_hour, provider, symbol, chain_id, price, consensus_price,
      deviation_pct, latency_ms, data_age_seconds, confidence, is_success,
      error_message
    FROM parsed
    ORDER BY snapshot_hour, provider, symbol, chain_id, is_success DESC, ordinality DESC
  )
  INSERT INTO public.hourly_price_snapshots AS existing(
    snapshot_hour, provider, symbol, chain_id, price, consensus_price,
    deviation_pct, latency_ms, data_age_seconds, confidence, is_success,
    error_message
  )
  SELECT snapshot_hour, provider, symbol, chain_id, price, consensus_price,
    deviation_pct, latency_ms, data_age_seconds, confidence, is_success,
    error_message
  FROM deduplicated
  ON CONFLICT (snapshot_hour, provider, symbol, chain_id) DO UPDATE
    SET price = EXCLUDED.price,
        consensus_price = EXCLUDED.consensus_price,
        deviation_pct = EXCLUDED.deviation_pct,
        latency_ms = EXCLUDED.latency_ms,
        data_age_seconds = EXCLUDED.data_age_seconds,
        confidence = EXCLUDED.confidence,
        is_success = EXCLUDED.is_success,
        error_message = EXCLUDED.error_message
    WHERE NOT existing.is_success AND EXCLUDED.is_success;

  GET DIAGNOSTICS written = ROW_COUNT;
  RETURN written;
END;
$function$;
REVOKE ALL ON FUNCTION public.upsert_hourly_price_snapshots(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_hourly_price_snapshots(jsonb) TO service_role;

-- Archive maintenance moves data to `snapshot_archives` after seven days and
-- the live database confirms that coverage.  The legacy 30-day deletes cannot
-- remove anything useful, but still scan the two largest tables every day.
SELECT cron.unschedule('cleanup-price-snapshots-30d')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-price-snapshots-30d');
SELECT cron.unschedule('cleanup-hourly-price-snapshots-30d')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-hourly-price-snapshots-30d');

-- Cache expiry is enforced on reads, so deleting every 30 minutes rather than
-- every 10 minutes has no user-visible freshness impact and cuts scheduler
-- scans by two thirds.
SELECT cron.unschedule('price-records-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-records-cleanup');
SELECT cron.schedule('price-records-cleanup', '22,52 * * * *',
  'SELECT public.cleanup_expired_price_records()');

-- These retention operations were concentrated around 04:00 UTC (noon in
-- Shanghai), with several independent DELETEs at the same minute.  Move them
-- to the local overnight window and serialize them.  The archive write stays
-- at 19:10 UTC; every cleanup below starts after it has completed or skipped.
SELECT cron.unschedule('reputation-history-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-history-cleanup');
SELECT cron.schedule('reputation-history-cleanup', '30 19 * * *',
  'SELECT public.cleanup_old_reputation_history(7)');

SELECT cron.unschedule('api-key-usage-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-key-usage-cleanup');
SELECT cron.schedule('api-key-usage-cleanup', '0 20 * * *',
  'SELECT public.cleanup_api_key_usage()');

SELECT cron.unschedule('feed-health-snapshots-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-health-snapshots-cleanup');
SELECT cron.schedule('feed-health-snapshots-cleanup', '30 20 * * *',
  $$DELETE FROM public.feed_health_snapshots WHERE evaluated_at < now() - interval '90 days'$$);

SELECT cron.unschedule('oracle-watch-checks-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oracle-watch-checks-cleanup');
SELECT cron.schedule('oracle-watch-checks-cleanup', '0 21 * * *',
  $$DELETE FROM public.oracle_watch_checks WHERE created_at < now() - interval '180 days'$$);

SELECT cron.unschedule('execution-receipts-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execution-receipts-cleanup');
SELECT cron.schedule('execution-receipts-cleanup', '30 21 * * *',
  $$DELETE FROM public.execution_receipts WHERE created_at < now() - interval '180 days'$$);

SELECT cron.unschedule('market-reference-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'market-reference-cleanup');
SELECT cron.schedule('market-reference-cleanup', '0 22 * * *',
  $$DELETE FROM public.market_reference_snapshots WHERE snapshot_ts < now() - interval '120 days'$$);

SELECT cron.unschedule('snapshot-archive-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-cleanup');
SELECT cron.schedule('snapshot-archive-cleanup', '30 22 * * *',
  $$DELETE FROM public.snapshot_archives
    WHERE archive_day < (now() AT TIME ZONE 'UTC')::date - 120$$);

SELECT cron.unschedule('cleanup-coverage-slo')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-coverage-slo');
SELECT cron.schedule('cleanup-coverage-slo', '0 23 * * *',
  $$DELETE FROM public.coverage_slo_samples WHERE recorded_at < now() - interval '90 days'$$);

SELECT cron.unschedule('github-dispatch-ledger-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'github-dispatch-ledger-cleanup');
SELECT cron.schedule('github-dispatch-ledger-cleanup', '30 23 * * *',
  $$DELETE FROM public.cron_dispatch_runs WHERE created_at < now() - interval '30 days'$$);

SELECT cron.unschedule('native-cron-log-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'native-cron-log-cleanup');
SELECT cron.schedule('native-cron-log-cleanup', '30 0 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '30 days'$$);

SELECT cron.unschedule('manip-cost-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'manip-cost-cleanup');
SELECT cron.schedule('manip-cost-cleanup', '0 1 * * *',
  $$DELETE FROM public.manip_cost_pool_snapshots WHERE snapshot_ts < now() - interval '365 days'$$);

SELECT cron.unschedule('dex-market-swap-events-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dex-market-swap-events-cleanup');
SELECT cron.schedule('dex-market-swap-events-cleanup', '30 1 * * *',
  $$DELETE FROM public.dex_market_swap_events WHERE block_timestamp < now() - interval '35 days'$$);

SELECT cron.unschedule('cleanup-pre-trade-checks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-pre-trade-checks');
SELECT cron.schedule('cleanup-pre-trade-checks', '0 2 * * *',
  $$DELETE FROM public.pre_trade_checks WHERE created_at < now() - interval '180 days'$$);

COMMIT;
