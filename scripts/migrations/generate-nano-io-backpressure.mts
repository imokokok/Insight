import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Keep the free Nano database inside its narrow write and memory envelope
// without discarding evidence.  The migration only changes safe operational
// cadence, suppresses duplicate work while the same writer is still open, and
// retains a conservative freshness margin below the public two-hour stale
// threshold.
const migrationSql = String.raw`-- Finish the no-cost Nano I/O hardening pass.
--
-- Preserve all evidence/retention policies.  This migration instead prevents
-- residual cron bursts, coalesces a new high-frequency dispatch while its own
-- preceding run remains open, and reduces healthy registry heartbeats while
-- retaining a 30-minute margin below the two-hour stale-feed threshold.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- A healthy feed remains fresh for the product's two-hour stale threshold.
-- Sampling a successful heartbeat every 90 minutes is therefore conservative:
-- if collection stops, the feed is marked stale earlier than its last actual
-- success rather than later.  Failures and the first success after a failure
-- remain immediate.
CREATE OR REPLACE FUNCTION public.touch_oracle_feed_success(
  p_provider text,
  p_symbol text,
  p_chain_id integer,
  p_success_at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH updated AS (
    UPDATE public.oracle_feeds AS feed
    SET consecutive_failures = 0,
        last_success_at = p_success_at,
        updated_at = p_success_at
    WHERE p_provider IS NOT NULL
      AND p_symbol IS NOT NULL
      AND p_chain_id IS NOT NULL
      AND p_success_at IS NOT NULL
      AND feed.provider = p_provider
      AND feed.symbol = p_symbol
      AND feed.chain_id = p_chain_id
      AND (
        feed.consecutive_failures <> 0
        OR feed.last_success_at IS NULL
        OR feed.last_success_at < p_success_at - interval '90 minutes'
      )
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$function$;

CREATE OR REPLACE FUNCTION public.batch_update_feed_health(p_results jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  total_updated bigint := 0;
  step_updated bigint;
  now_ts timestamptz := now();
BEGIN
  WITH probes AS MATERIALIZED (
    SELECT rec->>'provider' AS provider, rec->>'symbol' AS symbol,
      (rec->>'chainId')::integer AS chain_id, count(*) AS multiplicity
    FROM jsonb_array_elements(coalesce(p_results->'successes', '[]'::jsonb)) rec
    GROUP BY 1, 2, 3
  ), updated AS (
    UPDATE public.oracle_feeds AS feed
    SET consecutive_failures = 0,
        last_success_at = now_ts,
        updated_at = now_ts
    FROM probes
    WHERE feed.provider = probes.provider
      AND feed.symbol = probes.symbol
      AND feed.chain_id = probes.chain_id
      AND (
        feed.consecutive_failures <> 0
        OR feed.last_success_at IS NULL
        OR feed.last_success_at < now_ts - interval '90 minutes'
      )
    RETURNING probes.multiplicity
  )
  SELECT coalesce(sum(multiplicity), 0) INTO total_updated FROM updated;

  WITH probes AS MATERIALIZED (
    SELECT rec->>'provider' AS provider, rec->>'symbol' AS symbol,
      (rec->>'chainId')::integer AS chain_id, count(*) AS multiplicity
    FROM jsonb_array_elements(coalesce(p_results->'failures', '[]'::jsonb)) rec
    GROUP BY 1, 2, 3
  ), updated AS (
    UPDATE public.oracle_feeds AS feed
    SET consecutive_failures = feed.consecutive_failures + probes.multiplicity::integer,
        last_failure_at = now_ts,
        updated_at = now_ts
    FROM probes
    WHERE feed.provider = probes.provider
      AND feed.symbol = probes.symbol
      AND feed.chain_id = probes.chain_id
    RETURNING probes.multiplicity
  )
  SELECT coalesce(sum(multiplicity), 0) INTO step_updated FROM updated;

  RETURN (total_updated + step_updated)::integer;
END;
$function$;

REVOKE ALL ON FUNCTION public.touch_oracle_feed_success(text, text, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_oracle_feed_success(text, text, integer, timestamptz)
  TO service_role;
REVOKE ALL ON FUNCTION public.batch_update_feed_health(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_feed_health(jsonb)
  TO service_role;

-- The existing general history index serves completed-run reporting.  This
-- tiny partial index serves only the admission check below, and disappears
-- from the hot set as soon as a workflow reaches a terminal state.
CREATE INDEX IF NOT EXISTS cron_dispatch_runs_open_workflow_idx
  ON public.cron_dispatch_runs (workflow_file, created_at DESC)
  WHERE source = 'supabase_cron'
    AND status IN ('dispatching', 'running');

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
    'oracle-watch-collect.yml',
    'reputation-cron.yml',
    'safety-outcome-cron.yml',
    'feed-cadence-cron.yml',
    'daily-report-publish-cron.yml',
    'coverage-slo.yml',
    'monad-dex-market.yml'
  ];
  v_coalesced constant text[] := ARRAY[
    'snapshot-collect.yml',
    'coverage-slo.yml',
    'monad-dex-market.yml'
  ];
  v_token text;
  v_dispatch_id uuid;
  v_open_id uuid;
  v_slot timestamptz := date_trunc('minute', clock_timestamp());
BEGIN
  IF NOT (p_workflow_file = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Workflow is not in the dispatcher allowlist: %', p_workflow_file;
  END IF;

  -- The runner-level concurrency groups protect writes after GitHub accepts a
  -- dispatch.  Stop unnecessary pg_net requests and queued runners earlier
  -- when a preceding high-frequency execution has not yet called back.  The
  -- 20-minute bound matches the stale-run reaper, so this is a pressure valve,
  -- not a permanent lockout after an interrupted callback.
  IF p_workflow_file = ANY (v_coalesced) THEN
    SELECT id INTO v_open_id
    FROM public.cron_dispatch_runs
    WHERE workflow_file = p_workflow_file
      AND source = 'supabase_cron'
      AND status IN ('dispatching', 'running')
      AND created_at < v_slot
      AND created_at >= v_slot - interval '20 minutes'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_open_id IS NOT NULL THEN
      INSERT INTO public.cron_dispatch_runs (
        workflow_file,
        scheduled_for,
        source,
        status,
        conclusion,
        completed_at,
        updated_at
      )
      VALUES (
        p_workflow_file,
        v_slot,
        'supabase_cron',
        'cancelled',
        'coalesced: an earlier primary run remains open',
        clock_timestamp(),
        clock_timestamp()
      )
      ON CONFLICT (workflow_file, scheduled_for, source) DO NOTHING
      RETURNING id INTO v_dispatch_id;

      IF v_dispatch_id IS NULL THEN
        SELECT id INTO v_dispatch_id
        FROM public.cron_dispatch_runs
        WHERE workflow_file = p_workflow_file
          AND scheduled_for = v_slot
          AND source = 'supabase_cron';
      END IF;

      RETURN v_dispatch_id;
    END IF;
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

-- Keep all product cadences intact, but allocate each recurring database
-- mutation a distinct minute.  The dispatcher definition is updated too, so
-- a future disable/enable cannot restore the old collision pattern.
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
    RAISE EXCEPTION 'Create Vault secret github_workflow_dispatch_token before enabling the dispatcher';
  END IF;

  PERFORM public.disable_github_workflow_dispatcher();

  PERFORM cron.schedule(
    'github-dispatch-snapshot-collect', '0,15,30,45 * * * *',
    $command$SELECT public.dispatch_github_workflow('snapshot-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-oracle-watch', '8 * * * *',
    $command$SELECT public.dispatch_github_workflow('oracle-watch-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-reputation', '27 */2 * * *',
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
    'github-dispatch-coverage-slo', '9,24,39,54 * * * *',
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
    'github-dispatch-ledger-cleanup', '37 4 * * *',
    $command$
      DELETE FROM public.cron_dispatch_runs
      WHERE created_at < now() - interval '30 days';
    $command$
  );
END;
$function$;

SELECT cron.unschedule('rate-limits-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limits-cleanup');
SELECT cron.schedule('rate-limits-cleanup', '4,19,34,49 * * * *',
  'SELECT public.cleanup_rate_limits()');

SELECT cron.unschedule('price-records-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-records-cleanup');
SELECT cron.schedule('price-records-cleanup', '20,50 * * * *',
  'SELECT public.cleanup_expired_price_records()');

SELECT cron.unschedule('api-keys-deactivation')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-keys-deactivation');
SELECT cron.schedule('api-keys-deactivation', '7 * * * *',
  'SELECT public.deactivate_expired_api_keys()');

-- Destructive retention jobs run once per day; keep each away from the
-- recurring snapshot starts and from another daily delete in the same hour.
SELECT cron.unschedule('native-cron-log-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'native-cron-log-cleanup');
SELECT cron.schedule('native-cron-log-cleanup', '37 0 * * *',
  'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''30 days''');

SELECT cron.unschedule('manip-cost-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'manip-cost-cleanup');
SELECT cron.schedule('manip-cost-cleanup', '37 1 * * *',
  'DELETE FROM public.manip_cost_pool_snapshots WHERE snapshot_ts < now() - interval ''365 days''');

SELECT cron.unschedule('dex-market-swap-events-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dex-market-swap-events-cleanup');
SELECT cron.schedule('dex-market-swap-events-cleanup', '7 1 * * *',
  'DELETE FROM public.dex_market_swap_events WHERE block_timestamp < now() - interval ''35 days''');

SELECT cron.unschedule('cleanup-pre-trade-checks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-pre-trade-checks');
SELECT cron.schedule('cleanup-pre-trade-checks', '7 2 * * *',
  'DELETE FROM public.pre_trade_checks WHERE created_at < now() - interval ''180 days''');

SELECT cron.unschedule('reputation-history-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-history-cleanup');
SELECT cron.schedule('reputation-history-cleanup', '37 19 * * *',
  'SELECT public.cleanup_old_reputation_history(7)');

SELECT cron.unschedule('snapshot-archive-maintenance')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-maintenance');
SELECT cron.schedule('snapshot-archive-maintenance', '7 19 * * *',
  'SELECT * FROM public.maintain_snapshot_archives()');

SELECT cron.unschedule('api-key-usage-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-key-usage-cleanup');
SELECT cron.schedule('api-key-usage-cleanup', '7 20 * * *',
  'SELECT public.cleanup_api_key_usage()');

SELECT cron.unschedule('feed-health-snapshots-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-health-snapshots-cleanup');
SELECT cron.schedule('feed-health-snapshots-cleanup', '37 20 * * *',
  'DELETE FROM public.feed_health_snapshots WHERE evaluated_at < now() - interval ''90 days''');

SELECT cron.unschedule('execution-receipts-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execution-receipts-cleanup');
SELECT cron.schedule('execution-receipts-cleanup', '7 21 * * *',
  'DELETE FROM public.execution_receipts WHERE created_at < now() - interval ''180 days''');

SELECT cron.unschedule('oracle-watch-checks-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oracle-watch-checks-cleanup');
SELECT cron.schedule('oracle-watch-checks-cleanup', '37 21 * * *',
  'DELETE FROM public.oracle_watch_checks WHERE created_at < now() - interval ''180 days''');

SELECT cron.unschedule('market-reference-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'market-reference-cleanup');
SELECT cron.schedule('market-reference-cleanup', '7 22 * * *',
  'DELETE FROM public.market_reference_snapshots WHERE snapshot_ts < now() - interval ''120 days''');

SELECT cron.unschedule('snapshot-archive-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-archive-cleanup');
SELECT cron.schedule('snapshot-archive-cleanup', '37 22 * * *',
  'DELETE FROM public.snapshot_archives WHERE archive_day < (now() AT TIME ZONE ''UTC'')::date - 120');

SELECT cron.unschedule('cleanup-coverage-slo')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-coverage-slo');
SELECT cron.schedule('cleanup-coverage-slo', '7 23 * * *',
  'DELETE FROM public.coverage_slo_samples WHERE recorded_at < now() - interval ''90 days''');

-- Re-register only when the saved dispatch credential exists.  This preserves
-- fail-closed activation for fresh installations.
DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'github_workflow_dispatch_token'
      AND length(decrypted_secret) >= 20
  ) THEN
    PERFORM public.enable_github_workflow_dispatcher();
  ELSE
    RAISE NOTICE 'Dispatcher I/O backpressure activation deferred: github_workflow_dispatch_token is unavailable';
  END IF;
END;
$block$;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0112_nano_io_backpressure.sql', repositoryRoot)
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
      '0112_nano_io_backpressure.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
