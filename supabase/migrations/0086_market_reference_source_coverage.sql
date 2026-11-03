-- Keep market-reference coverage counted per independent venue, not per
-- 15-minute ticker sample. The rollup median and dispersion give each venue
-- one vote after collapsing that venue's observations within the hour.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

COMMENT ON COLUMN public.market_reference_snapshots.exchange IS
  'CEX source: coinbase | kraken | gemini | crypto.com. Crypto.com is currently collected for its direct WBTC/USD spot instrument.';

CREATE OR REPLACE VIEW public.market_reference_hourly AS
WITH exchange_hourly AS (
  SELECT
    symbol,
    exchange,
    date_trunc('hour', snapshot_ts) AS ref_hour,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY ref_price) AS ref_price,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY bid_ask_spread_pct)
      FILTER (WHERE bid_ask_spread_pct >= 0) AS median_bid_ask_spread_pct,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY volume)
      FILTER (WHERE volume >= 0) AS median_volume,
    max(data_age_seconds) AS max_reference_latency_seconds
  FROM public.market_reference_snapshots
  WHERE is_success AND ref_price > 0
  GROUP BY symbol, exchange, date_trunc('hour', snapshot_ts)
)
SELECT
  symbol,
  ref_hour,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY ref_price) AS ref_price,
  count(*) AS exchange_count,
  min(ref_price) AS min_ref_price,
  max(ref_price) AS max_ref_price,
  (max(ref_price) - min(ref_price)) / max(ref_price) * 100.0
    AS cross_exchange_spread_pct,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY median_bid_ask_spread_pct)
    FILTER (WHERE median_bid_ask_spread_pct >= 0) AS median_bid_ask_spread_pct,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY median_volume)
    FILTER (WHERE median_volume >= 0) AS median_volume,
  max(max_reference_latency_seconds) AS max_reference_latency_seconds
FROM exchange_hourly
GROUP BY symbol, ref_hour;

ALTER VIEW public.market_reference_hourly OWNER TO postgres;
ALTER VIEW public.market_reference_hourly SET (security_invoker = true);
REVOKE ALL ON TABLE public.market_reference_hourly FROM anon, authenticated;
GRANT SELECT ON TABLE public.market_reference_hourly TO service_role;

COMMENT ON VIEW public.market_reference_hourly IS
  'Hourly market-reference rollup with each CEX reduced to one venue-level observation before computing price, exchange count, dispersion, liquidity, volume and latency context.';

CREATE OR REPLACE FUNCTION public.get_latest_market_reference(p_symbol text)
RETURNS TABLE (
  symbol text,
  ref_hour timestamptz,
  ref_price double precision,
  exchange_count bigint,
  cross_exchange_spread_pct double precision,
  median_bid_ask_spread_pct double precision,
  median_volume double precision
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH latest AS MATERIALIZED (
    SELECT date_trunc('hour', snapshot.snapshot_ts) AS ref_hour
    FROM public.market_reference_snapshots AS snapshot
    WHERE snapshot.symbol = upper(trim(p_symbol))
      AND snapshot.is_success AND snapshot.ref_price > 0
      AND snapshot.snapshot_ts >= date_trunc('hour', now() - interval '3 hours') + interval '1 hour'
      AND snapshot.snapshot_ts < date_trunc('hour', now()) + interval '1 hour'
    ORDER BY snapshot.snapshot_ts DESC
    LIMIT 1
  ), exchange_hourly AS (
    SELECT
      snapshot.symbol,
      snapshot.exchange,
      latest.ref_hour,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY snapshot.ref_price) AS ref_price,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY snapshot.bid_ask_spread_pct)
        FILTER (WHERE snapshot.bid_ask_spread_pct >= 0) AS median_bid_ask_spread_pct,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY snapshot.volume)
        FILTER (WHERE snapshot.volume >= 0) AS median_volume
    FROM latest
    JOIN public.market_reference_snapshots AS snapshot
      ON snapshot.symbol = upper(trim(p_symbol))
     AND snapshot.snapshot_ts >= latest.ref_hour
     AND snapshot.snapshot_ts < latest.ref_hour + interval '1 hour'
    WHERE snapshot.is_success AND snapshot.ref_price > 0
    GROUP BY snapshot.symbol, snapshot.exchange, latest.ref_hour
  )
  SELECT
    exchange_hourly.symbol,
    exchange_hourly.ref_hour,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY exchange_hourly.ref_price),
    count(*),
    (max(exchange_hourly.ref_price) - min(exchange_hourly.ref_price))
      / max(exchange_hourly.ref_price) * 100.0,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY exchange_hourly.median_bid_ask_spread_pct)
      FILTER (WHERE exchange_hourly.median_bid_ask_spread_pct >= 0),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY exchange_hourly.median_volume)
      FILTER (WHERE exchange_hourly.median_volume >= 0)
  FROM exchange_hourly
  GROUP BY exchange_hourly.symbol, exchange_hourly.ref_hour;
$$;

REVOKE ALL ON FUNCTION public.get_latest_market_reference(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_market_reference(text) TO service_role;

COMMIT;
