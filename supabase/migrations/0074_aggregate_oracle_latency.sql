BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- The 15-minute collector writes immutable source observations to
-- price_snapshot_history. Hourly rows are repeatedly overwritten and can also
-- be written by the recovery route, so they cannot represent probe percentiles.
-- Aggregate before PostgREST transfers the data; the history view includes
-- both hot rows and deduplicated compressed archive rows.
CREATE OR REPLACE FUNCTION public.get_oracle_latency_statistics(
  p_from timestamptz,
  p_before timestamptz,
  p_provider text DEFAULT NULL,
  p_symbol text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH stats AS (
    SELECT
      snapshot.provider,
      snapshot.symbol,
      grouping(snapshot.provider, snapshot.symbol) AS grouping_level,
      count(*) AS rows_examined,
      count(*) FILTER (WHERE snapshot.is_success) AS successes,
      count(*) FILTER (WHERE snapshot.latency_ms >= 0) AS sample_size,
      min(snapshot.latency_ms) FILTER (WHERE snapshot.latency_ms >= 0) AS min_ms,
      max(snapshot.latency_ms) FILTER (WHERE snapshot.latency_ms >= 0) AS max_ms,
      round(avg(snapshot.latency_ms) FILTER (WHERE snapshot.latency_ms >= 0))::integer AS mean_ms,
      percentile_disc(ARRAY[0.5, 0.9, 0.95, 0.99]::double precision[])
        WITHIN GROUP (ORDER BY snapshot.latency_ms)
        FILTER (WHERE snapshot.latency_ms >= 0) AS percentiles
    FROM public.price_snapshot_history AS snapshot
    WHERE p_from IS NOT NULL AND p_before IS NOT NULL AND p_before >= p_from
      AND snapshot.snapshot_ts >= p_from AND snapshot.snapshot_ts < p_before
      AND snapshot.archive_day >= (p_from AT TIME ZONE 'UTC')::date
      AND snapshot.archive_day <= (p_before AT TIME ZONE 'UTC')::date
      AND (p_provider IS NULL OR snapshot.provider = p_provider)
      AND (p_symbol IS NULL OR snapshot.symbol = p_symbol)
    GROUP BY GROUPING SETS ((snapshot.provider, snapshot.symbol), ())
  )
  SELECT jsonb_build_object(
    'rowsExamined', overall.rows_examined,
    'sampleSize', overall.sample_size,
    'overall', CASE WHEN overall.sample_size > 0 THEN jsonb_build_object(
      'p50', overall.percentiles[1], 'p90', overall.percentiles[2],
      'p95', overall.percentiles[3], 'p99', overall.percentiles[4]
    ) ELSE NULL END,
    'entries', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', entry.provider,
        'symbol', entry.symbol,
        'sampleSize', entry.sample_size,
        'successRate', CASE WHEN entry.rows_examined > 0
          THEN entry.successes * 100.0 / entry.rows_examined ELSE 0 END,
        'min', entry.min_ms, 'max', entry.max_ms, 'mean', entry.mean_ms,
        'p50', entry.percentiles[1], 'p90', entry.percentiles[2],
        'p95', entry.percentiles[3], 'p99', entry.percentiles[4]
      ) ORDER BY entry.provider, entry.symbol)
      FROM stats AS entry WHERE entry.grouping_level = 0
    ), '[]'::jsonb)
  )
  FROM stats AS overall WHERE overall.grouping_level = 3;
$$;

REVOKE ALL ON FUNCTION public.get_oracle_latency_statistics(timestamptz,timestamptz,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_oracle_latency_statistics(timestamptz,timestamptz,text,text)
  TO service_role;

COMMIT;
