-- Migration 0048: bounded, set-based Oracle Watch history reads
--
-- The public history window is 90 days, while the source spine is written at
-- 30-minute grain. Returning those raw rows through PostgREST would exceed its
-- 1,000-row response cap and make application-side aggregation both incomplete
-- and unnecessarily expensive. This RPC filters the requested global/chain
-- series explicitly and performs the rollup inside Postgres.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_oracle_watch_history(
  p_symbol text,
  p_chain text DEFAULT NULL,
  p_days integer DEFAULT 7,
  p_interval text DEFAULT 'hourly'
)
RETURNS TABLE(
  bucket_at timestamptz,
  last_observed_at timestamptz,
  verdict text,
  recommendation text,
  max_deviation_pct double precision,
  agreement double precision,
  participant_count integer,
  ml_risk_score double precision,
  ml_risk_level text,
  trust_score double precision,
  trust_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH params AS MATERIALIZED (
    SELECT
      upper(trim(coalesce(p_symbol, ''))) AS symbol,
      nullif(lower(trim(p_chain)), '') AS chain,
      greatest(1, least(coalesce(p_days, 7), 365)) AS days,
      CASE
        -- Keep every response below PostgREST's 1,000-row safety cap. A long
        -- window still exposes all retained history, only at a coarser grain.
        WHEN coalesce(p_days, 7) > 30 THEN 'daily'
        WHEN coalesce(p_days, 7) > 7 AND coalesce(p_interval, 'hourly') = '30min'
          THEN 'hourly'
        WHEN coalesce(p_interval, 'hourly') IN ('30min', 'hourly', 'daily')
          THEN coalesce(p_interval, 'hourly')
        ELSE 'hourly'
      END AS grain
  ),
  filtered AS MATERIALIZED (
    SELECT
      snapshot.evaluated_at,
      snapshot.verdict,
      snapshot.recommendation,
      snapshot.max_deviation_pct,
      snapshot.agreement,
      snapshot.participant_count,
      snapshot.ml_risk_score,
      snapshot.ml_risk_level,
      snapshot.trust_score,
      snapshot.trust_level,
      CASE snapshot.verdict
        WHEN 'danger' THEN 2
        WHEN 'caution' THEN 1
        ELSE 0
      END AS verdict_rank,
      params.grain
    FROM public.feed_health_snapshots AS snapshot
    CROSS JOIN params
    WHERE snapshot.symbol = params.symbol
      AND snapshot.evaluated_at >= now() - make_interval(days => params.days)
      AND (
        (params.chain IS NULL AND snapshot.chain IS NULL)
        OR snapshot.chain = params.chain
      )
  ),
  bucketed AS (
    SELECT
      CASE grain
        WHEN 'daily' THEN date_trunc('day', evaluated_at)
        WHEN 'hourly' THEN date_trunc('hour', evaluated_at)
        ELSE evaluated_at
      END AS bucket_at,
      *
    FROM filtered
  )
  SELECT
    grouped.bucket_at,
    max(grouped.evaluated_at) AS last_observed_at,
    CASE max(grouped.verdict_rank)
      WHEN 2 THEN 'danger'
      WHEN 1 THEN 'caution'
      ELSE 'normal'
    END AS verdict,
    (array_agg(
      grouped.recommendation
      ORDER BY grouped.verdict_rank DESC, grouped.evaluated_at ASC
    ))[1] AS recommendation,
    max(grouped.max_deviation_pct) AS max_deviation_pct,
    round(avg(grouped.agreement)::numeric, 4)::double precision AS agreement,
    round(avg(grouped.participant_count))::integer AS participant_count,
    max(grouped.ml_risk_score) AS ml_risk_score,
    (array_agg(
      grouped.ml_risk_level
      ORDER BY grouped.ml_risk_score DESC NULLS LAST, grouped.evaluated_at DESC
    ) FILTER (WHERE grouped.ml_risk_score IS NOT NULL))[1] AS ml_risk_level,
    min(grouped.trust_score) AS trust_score,
    (array_agg(
      grouped.trust_level
      ORDER BY grouped.trust_score ASC NULLS LAST, grouped.evaluated_at DESC
    ) FILTER (WHERE grouped.trust_score IS NOT NULL))[1] AS trust_level
  FROM bucketed AS grouped
  GROUP BY grouped.bucket_at
  ORDER BY grouped.bucket_at ASC;
$$;

ALTER FUNCTION public.get_oracle_watch_history(text, text, integer, text)
  OWNER TO postgres;

COMMENT ON FUNCTION public.get_oracle_watch_history(text, text, integer, text) IS
  'Returns one bounded Oracle Watch series. Global requests match chain IS NULL; 8-30d raw requests roll up hourly and windows over 30d roll up daily.';

REVOKE ALL ON FUNCTION public.get_oracle_watch_history(text, text, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_oracle_watch_history(text, text, integer, text)
  TO service_role;

COMMIT;
