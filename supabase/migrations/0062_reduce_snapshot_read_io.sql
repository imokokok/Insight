-- Support bounded training cursors and symbol-scoped live history reads.
-- Preserve every collector, retention window, and historical rollup contract.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX IF NOT EXISTS price_snapshots_success_cursor_idx
  ON public.price_snapshots (snapshot_ts, id) WHERE is_success = true;
CREATE INDEX IF NOT EXISTS hourly_snapshots_success_cursor_idx
  ON public.hourly_price_snapshots (snapshot_hour, id) WHERE is_success = true;
CREATE INDEX IF NOT EXISTS hourly_snapshots_success_symbol_hour_idx
  ON public.hourly_price_snapshots (symbol, snapshot_hour)
  INCLUDE (price, deviation_pct) WHERE is_success = true;

-- Find the latest usable hour through the existing (symbol,snapshot_ts) index,
-- then aggregate only that hour instead of sorting all retained hourly groups.
CREATE OR REPLACE FUNCTION public.get_latest_market_reference(p_symbol text)
RETURNS TABLE (
  symbol text, ref_hour timestamptz, ref_price double precision,
  exchange_count bigint, cross_exchange_spread_pct double precision,
  median_bid_ask_spread_pct double precision, median_volume double precision
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
  )
  SELECT snapshot.symbol, latest.ref_hour,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY snapshot.ref_price),
    count(*),
    (max(snapshot.ref_price) - min(snapshot.ref_price)) / max(snapshot.ref_price) * 100.0,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY snapshot.bid_ask_spread_pct)
      FILTER (WHERE snapshot.bid_ask_spread_pct >= 0),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY snapshot.volume)
      FILTER (WHERE snapshot.volume >= 0)
  FROM latest
  JOIN public.market_reference_snapshots AS snapshot
    ON snapshot.symbol = upper(trim(p_symbol))
   AND snapshot.snapshot_ts >= latest.ref_hour
   AND snapshot.snapshot_ts < latest.ref_hour + interval '1 hour'
  WHERE snapshot.is_success AND snapshot.ref_price > 0
  GROUP BY snapshot.symbol, latest.ref_hour;
$$;
REVOKE ALL ON FUNCTION public.get_latest_market_reference(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_market_reference(text) TO service_role;
COMMIT;
