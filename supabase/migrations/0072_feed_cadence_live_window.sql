-- The daily 48-hour refresh needs only hot snapshots. Archive maintenance moves
-- whole UTC days older than seven days, so a five-day lookback is guaranteed to
-- be present in price_snapshots. Keep the history view for longer manual reads.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.refresh_oracle_feed_cadence_baselines(
  p_lookback_hours integer DEFAULT 48,
  p_min_samples integer DEFAULT 12
)
RETURNS TABLE(updated_count bigint, scanned_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  lookback_hours integer := greatest(1, least(coalesce(p_lookback_hours, 48), 720));
  min_samples bigint := greatest(1, least(coalesce(p_min_samples, 12), 10000));
  snapshot_source text;
  archive_filter text;
BEGIN
  -- Relation and predicate fragments are internal constants. Callers cannot supply SQL.
  snapshot_source := CASE WHEN lookback_hours <= 120
    THEN 'public.price_snapshots'
    ELSE 'public.price_snapshot_history'
  END;
  archive_filter := CASE WHEN lookback_hours <= 120
    THEN ''
    ELSE 'AND snapshot.archive_day >= (params.since AT TIME ZONE ''UTC'')::date'
  END;

  RETURN QUERY EXECUTE format($query$
    WITH params AS MATERIALIZED (
      SELECT now() AS computed_at,
        now() - make_interval(hours => $1) AS since,
        $2::bigint AS min_samples
    ),
    active_feeds AS MATERIALIZED (
      SELECT provider, symbol, chain_id
      FROM public.oracle_feeds
      WHERE is_active = true
    ),
    trusted_samples AS MATERIALIZED (
      SELECT
        feed.provider,
        feed.symbol,
        feed.chain_id,
        count(snapshot.data_age_seconds)::bigint AS sample_count,
        round(percentile_cont(0.9) WITHIN GROUP
          (ORDER BY snapshot.data_age_seconds))::integer AS p90_seconds
      FROM active_feeds AS feed
      CROSS JOIN params
      JOIN %s AS snapshot
        ON snapshot.provider = feed.provider
       AND snapshot.symbol = feed.symbol
       AND snapshot.chain_id = feed.chain_id
       AND snapshot.snapshot_ts >= params.since
       %s
       AND snapshot.data_age_seconds IS NOT NULL
       AND snapshot.data_age_seconds >= 0
      WHERE feed.provider = ANY (
        ARRAY['chainlink','api3','supra','twap','flare','switchboard','winklink']::text[]
      )
      GROUP BY feed.provider, feed.symbol, feed.chain_id
    ),
    baselines AS MATERIALIZED (
      SELECT
        feed.provider,
        feed.symbol,
        feed.chain_id,
        CASE WHEN coalesce(sample.sample_count, 0) >= params.min_samples
          THEN sample.p90_seconds ELSE NULL END AS p90_seconds,
        params.computed_at
      FROM active_feeds AS feed
      CROSS JOIN params
      LEFT JOIN trusted_samples AS sample
        ON sample.provider = feed.provider
       AND sample.symbol = feed.symbol
       AND sample.chain_id = feed.chain_id
    ),
    updated AS (
      UPDATE public.oracle_feeds AS feed
      SET observed_data_age_p90_s = baseline.p90_seconds,
        observed_cadence_updated_at = baseline.computed_at
      FROM baselines AS baseline
      WHERE feed.provider = baseline.provider
        AND feed.symbol = baseline.symbol
        AND feed.chain_id = baseline.chain_id
        AND feed.is_active = true
      RETURNING 1
    )
    SELECT (SELECT count(*) FROM updated),
      (SELECT count(*) FROM active_feeds)
  $query$, snapshot_source, archive_filter)
  USING lookback_hours, min_samples;
END;
$function$;

ALTER FUNCTION public.refresh_oracle_feed_cadence_baselines(integer, integer)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_oracle_feed_cadence_baselines(integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_oracle_feed_cadence_baselines(integer, integer)
  TO service_role;
COMMENT ON FUNCTION public.refresh_oracle_feed_cadence_baselines(integer, integer) IS
  'Refresh per-feed p90 oracle-age baselines from hot snapshots for lookbacks up to five days; use lossless history for longer lookbacks. Service-role only.';

NOTIFY pgrst, 'reload schema';
COMMIT;
