-- ML data flywheel v2 + low-cost market microstructure context.
--
-- This migration deliberately reuses the existing 15-minute collectors and
-- existing 120-day snapshot retention. It adds no cron job or paid dependency, so the
-- storage/compute envelope remains suitable for Supabase + GitHub free tiers.

BEGIN;

-- Preserve the per-horizon prediction and the exact feature/label contracts
-- that produced it.  The legacy columns remain the canonical 6h aliases so
-- existing API consumers and dashboards keep working.
ALTER TABLE public.pre_trade_checks
  ADD COLUMN IF NOT EXISTS ml_score_1h double precision,
  ADD COLUMN IF NOT EXISTS ml_score_6h double precision,
  ADD COLUMN IF NOT EXISTS ml_risk_level text
    CHECK (ml_risk_level IS NULL OR ml_risk_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS ml_medium_threshold double precision,
  ADD COLUMN IF NOT EXISTS ml_high_threshold double precision,
  ADD COLUMN IF NOT EXISTS ml_feature_vector jsonb,
  ADD COLUMN IF NOT EXISTS feature_schema_version smallint,
  ADD COLUMN IF NOT EXISTS label_spec_version smallint,
  ADD COLUMN IF NOT EXISTS outcome_label_1h boolean,
  ADD COLUMN IF NOT EXISTS outcome_1h jsonb,
  ADD COLUMN IF NOT EXISTS outcome_label_6h boolean,
  ADD COLUMN IF NOT EXISTS outcome_6h jsonb;

COMMENT ON COLUMN public.pre_trade_checks.ml_feature_vector IS
  'Exact named, time-safe feature map presented to the ML scorer at issuance time. Never includes verdict, ml_score, or future outcome fields.';
COMMENT ON COLUMN public.pre_trade_checks.feature_schema_version IS
  'Version of the live ML feature semantics used to build ml_feature_vector.';
COMMENT ON COLUMN public.pre_trade_checks.label_spec_version IS
  'Version of the future-outcome definition. Required before a row may enter training/calibration.';
COMMENT ON COLUMN public.pre_trade_checks.outcome_label_1h IS
  'Whether an abnormal event began within one hour after the check; NULL means censored/unavailable.';
COMMENT ON COLUMN public.pre_trade_checks.outcome_label_6h IS
  'Whether an abnormal event began within six hours after the check; backward-compatible twin of outcome_label.';

-- Existing rows were written before per-horizon storage.  Preserve their 6h
-- value, but only assert label-spec v2 when the stored JSON proves Track-B was
-- evaluated (the maxMarketDivergencePct key was introduced by v2).
UPDATE public.pre_trade_checks
SET outcome_label_6h = outcome_label,
    outcome_6h = outcome,
    ml_score_6h = ml_score,
    label_spec_version = CASE
      WHEN outcome IS NOT NULL AND outcome ? 'maxMarketDivergencePct' THEN 2
      ELSE label_spec_version
    END
WHERE outcome_label IS NOT NULL OR ml_score IS NOT NULL;

-- Re-evaluate the bounded retained history once so rows labeled by the old
-- single-horizon worker receive both 1h and 6h outcomes. The existing 50-row
-- GitHub Actions batch drains this gradually without a new job or DB spike.
UPDATE public.pre_trade_checks
SET outcome_evaluated_at = NULL
WHERE created_at >= now() - interval '120 days'
  AND outcome_evaluated_at IS NOT NULL
  AND (outcome_label_1h IS NULL OR outcome_label_6h IS NULL);

CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_ml_contract
  ON public.pre_trade_checks (ml_model_version, label_spec_version, created_at DESC)
  WHERE ml_score IS NOT NULL AND outcome_label IS NOT NULL;

-- Best bid/ask and volume come for free in the public ticker payloads already
-- fetched by the 15-minute market-reference collector.  Persisting them adds a
-- few numeric columns, not another network call.
ALTER TABLE public.market_reference_snapshots
  ADD COLUMN IF NOT EXISTS bid double precision,
  ADD COLUMN IF NOT EXISTS ask double precision,
  ADD COLUMN IF NOT EXISTS bid_ask_spread_pct double precision;

COMMENT ON COLUMN public.market_reference_snapshots.bid IS
  'Best public bid at collection time; NULL when the exchange/payload does not expose it.';
COMMENT ON COLUMN public.market_reference_snapshots.ask IS
  'Best public ask at collection time; NULL when the exchange/payload does not expose it.';
COMMENT ON COLUMN public.market_reference_snapshots.bid_ask_spread_pct IS
  'Best ask-minus-bid divided by midpoint, in percent. A low-cost liquidity/manipulability proxy.';

CREATE OR REPLACE VIEW public.market_reference_hourly AS
SELECT
  symbol,
  date_trunc('hour', snapshot_ts) AS ref_hour,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY ref_price) AS ref_price,
  count(*) FILTER (WHERE is_success AND ref_price > 0) AS exchange_count,
  min(ref_price) FILTER (WHERE is_success AND ref_price > 0) AS min_ref_price,
  max(ref_price) FILTER (WHERE is_success AND ref_price > 0) AS max_ref_price,
  CASE
    WHEN max(ref_price) FILTER (WHERE is_success AND ref_price > 0) > 0 THEN
      (max(ref_price) FILTER (WHERE is_success AND ref_price > 0)
       - min(ref_price) FILTER (WHERE is_success AND ref_price > 0))
      / max(ref_price) FILTER (WHERE is_success AND ref_price > 0) * 100.0
    ELSE 0.0
  END AS cross_exchange_spread_pct,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY bid_ask_spread_pct)
    FILTER (WHERE is_success AND bid_ask_spread_pct >= 0) AS median_bid_ask_spread_pct,
  -- Ticker volume is a rolling 24h value, so summing four 15-minute samples
  -- would double-count it. The median remains comparable and bounded.
  percentile_cont(0.5) WITHIN GROUP (ORDER BY volume)
    FILTER (WHERE is_success AND volume >= 0) AS median_volume,
  max(data_age_seconds) FILTER (WHERE is_success) AS max_reference_latency_seconds
FROM public.market_reference_snapshots
WHERE is_success AND ref_price > 0
GROUP BY symbol, date_trunc('hour', snapshot_ts);

ALTER VIEW public.market_reference_hourly OWNER TO postgres;
ALTER VIEW public.market_reference_hourly SET (security_invoker = true);
REVOKE ALL ON TABLE public.market_reference_hourly FROM anon, authenticated;
GRANT SELECT ON TABLE public.market_reference_hourly TO service_role;

COMMENT ON VIEW public.market_reference_hourly IS
  'Hourly independent CEX truth plus source coverage, cross-exchange dispersion, public top-of-book spread, volume and latency context for time-safe ML features.';

COMMIT;
