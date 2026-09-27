BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Return complete hour groups, regardless of PostgREST's raw-row response cap.
CREATE OR REPLACE FUNCTION public.get_oracle_history_baseline(
  p_symbol text, p_since timestamptz, p_before timestamptz
)
RETURNS TABLE(hour timestamptz, max_deviation_pct double precision,
  consensus_price double precision, participant_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT snapshot.snapshot_hour,
    max(abs(coalesce(snapshot.deviation_pct, 0)))::double precision,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY snapshot.price)::double precision,
    count(*)
  FROM public.hourly_price_snapshots AS snapshot
  WHERE snapshot.symbol = upper(trim(p_symbol)) AND snapshot.is_success
    AND snapshot.snapshot_hour >= greatest(p_since, p_before - interval '30 hours')
    AND snapshot.snapshot_hour < least(p_before, date_trunc('hour', now()))
    AND snapshot.price > 0 AND snapshot.price::text NOT IN ('NaN','Infinity','-Infinity')
    AND (snapshot.deviation_pct IS NULL OR snapshot.deviation_pct::text NOT IN ('NaN','Infinity','-Infinity'))
  GROUP BY snapshot.snapshot_hour ORDER BY snapshot.snapshot_hour;
$$;
REVOKE ALL ON FUNCTION public.get_oracle_history_baseline(text,timestamptz,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_oracle_history_baseline(text,timestamptz,timestamptz)
  TO service_role;

-- Match the original two-loop semantics, including duplicate probes and the
-- success-then-failure ordering, but update each physical row at most twice.
CREATE OR REPLACE FUNCTION public.batch_update_feed_health(p_results jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE total_updated bigint := 0; step_updated bigint; now_ts timestamptz := now();
BEGIN
  WITH probes AS MATERIALIZED (
    SELECT rec->>'provider' AS provider, rec->>'symbol' AS symbol,
      (rec->>'chainId')::integer AS chain_id, count(*) AS multiplicity
    FROM jsonb_array_elements(coalesce(p_results->'successes','[]'::jsonb)) rec
    GROUP BY 1,2,3
  ), updated AS (
    UPDATE public.oracle_feeds feed SET consecutive_failures=0,
      last_success_at=now_ts, updated_at=now_ts
    FROM probes WHERE feed.provider=probes.provider AND feed.symbol=probes.symbol
      AND feed.chain_id=probes.chain_id
    RETURNING probes.multiplicity
  ) SELECT coalesce(sum(multiplicity),0) INTO total_updated FROM updated;
  WITH probes AS MATERIALIZED (
    SELECT rec->>'provider' AS provider, rec->>'symbol' AS symbol,
      (rec->>'chainId')::integer AS chain_id, count(*) AS multiplicity
    FROM jsonb_array_elements(coalesce(p_results->'failures','[]'::jsonb)) rec
    GROUP BY 1,2,3
  ), updated AS (
    UPDATE public.oracle_feeds feed
    SET consecutive_failures=feed.consecutive_failures+probes.multiplicity::integer,
      last_failure_at=now_ts, updated_at=now_ts
    FROM probes WHERE feed.provider=probes.provider AND feed.symbol=probes.symbol
      AND feed.chain_id=probes.chain_id
    RETURNING probes.multiplicity
  ) SELECT coalesce(sum(multiplicity),0) INTO step_updated FROM updated;
  RETURN (total_updated+step_updated)::integer;
END;
$$;
REVOKE ALL ON FUNCTION public.batch_update_feed_health(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_feed_health(jsonb) TO service_role;

-- Avoid scanning other chains' cache entries before finding the newest row.
CREATE INDEX IF NOT EXISTS price_records_provider_symbol_chain_time_idx
  ON public.price_records(provider,symbol,chain,timestamp DESC);

-- All removed btrees are prefixes of retained full indexes. No uniqueness,
-- foreign-key support, history retention, or API capability is removed.
DROP INDEX IF EXISTS public.price_snapshots_snapshot_ts_idx;
DROP INDEX IF EXISTS public.idx_hourly_snapshots_hour;
DROP INDEX IF EXISTS public.idx_price_records_provider_symbol;
DROP INDEX IF EXISTS public.idx_api_key_usage_key_created;
DROP INDEX IF EXISTS public.idx_oracle_feeds_provider;
COMMIT;
