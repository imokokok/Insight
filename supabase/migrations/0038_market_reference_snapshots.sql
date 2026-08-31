-- Migration 0037: market reference snapshots (external truth layer)
--
-- Independent CEX market-reference prices for the Oracle Watch universe
-- (ETH/BTC/USDC/USDT). This is the "external ground truth" layer that lets
-- Insight (a) compute oracle-vs-market divergence — the manipulation signal a
-- consensus-only label cannot see when ALL providers move together — and
-- (b) build the Track-B training label on real market truth rather than
-- oracle-consensus self-consistency.
--
-- Design (mirrors the collaboration standards in the partnership archives):
--   * Per-exchange rows, appended every 15 min by GitHub Actions
--     (market-reference-collect.yml) — attributable to a collector version and
--     independently reproducible (APS-style SOURCE pinning of the collector).
--   * Fail-closed: a symbol with zero successful exchanges writes only failed
--     rows (error_message), never a stale/estimated price.
--   * Cross-exchange consistency is computed by the `market_reference_hourly`
--     view (median + spread across successful exchanges), NOT baked into
--     signed verdicts — external truth is evidence, not a decision input.
--   * Retention: 180 days (labels need a multi-month window for training).
--
-- CAIP-19 asset identity is NOT stored here: CEX prices are asset-level
-- (quote USD), not chain-scoped, so symbol is the correct grain. Chain-scoped
-- oracle data lives in hourly_price_snapshots / feed_health_snapshots; this
-- table deliberately stays asset-level.

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."market_reference_snapshots" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "snapshot_ts" timestamp with time zone NOT NULL,
    "symbol" text NOT NULL,
    "quote" text NOT NULL DEFAULT 'USD',
    "exchange" text NOT NULL,
    "ref_price" double precision,
    "volume" double precision,
    "data_age_seconds" integer,
    "is_success" boolean NOT NULL,
    "error_message" text,
    "collector_version" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "market_reference_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "market_reference_snapshots_unique" UNIQUE ("snapshot_ts", "symbol", "quote", "exchange")
);

ALTER TABLE "public"."market_reference_snapshots" OWNER TO "postgres";

COMMENT ON TABLE "public"."market_reference_snapshots" IS 'Independent CEX market-reference prices (external truth layer) per (symbol, exchange, snapshot_ts). Populated every 15 min by GitHub Actions market-reference-collect; also by backfill-market-reference for historical windows.';
COMMENT ON COLUMN "public"."market_reference_snapshots"."exchange" IS 'CEX source: coinbase | kraken | gemini (Gemini replaced Binance, whose public API is geo-blocked on GitHub US runners with HTTP 451; verified live for all four symbols).';
COMMENT ON COLUMN "public"."market_reference_snapshots"."ref_price" IS 'Quote price in `quote` currency; NULL on failed fetch (fail-closed, never estimated).';
COMMENT ON COLUMN "public"."market_reference_snapshots"."volume" IS 'Period volume (candles/backfill); NULL for live spot rows.';
COMMENT ON COLUMN "public"."market_reference_snapshots"."data_age_seconds" IS 'Client-measured fetch latency at collection time (freshness proxy).';
COMMENT ON COLUMN "public"."market_reference_snapshots"."collector_version" IS 'Collector implementation version for reproducibility (APS SOURCE discipline).';

CREATE INDEX IF NOT EXISTS "market_reference_symbol_ts_idx"
    ON "public"."market_reference_snapshots" USING "btree" ("symbol", "snapshot_ts" DESC);
CREATE INDEX IF NOT EXISTS "market_reference_ts_idx"
    ON "public"."market_reference_snapshots" USING "btree" ("snapshot_ts" DESC);

-- Hourly rollup: per (symbol, hour) median reference price across successful
-- exchanges plus the cross-exchange spread — the single source both the
-- training pipeline (oracle_vs_market feature, Track-B label) and the Oracle
-- Watch divergence advisory read from.
CREATE OR REPLACE VIEW "public"."market_reference_hourly" AS
SELECT
    "symbol",
    date_trunc('hour', "snapshot_ts") AS "ref_hour",
    percentile_cont(0.5) WITHIN GROUP (ORDER BY "ref_price") AS "ref_price",
    count(*) FILTER (WHERE "is_success" AND "ref_price" > 0) AS "exchange_count",
    min("ref_price") FILTER (WHERE "is_success" AND "ref_price" > 0) AS "min_ref_price",
    max("ref_price") FILTER (WHERE "is_success" AND "ref_price" > 0) AS "max_ref_price",
    CASE
        WHEN max("ref_price") FILTER (WHERE "is_success" AND "ref_price" > 0) > 0 THEN
            (max("ref_price") FILTER (WHERE "is_success" AND "ref_price" > 0)
             - min("ref_price") FILTER (WHERE "is_success" AND "ref_price" > 0))
            / max("ref_price") FILTER (WHERE "is_success" AND "ref_price" > 0) * 100.0
        ELSE 0.0
    END AS "cross_exchange_spread_pct"
FROM "public"."market_reference_snapshots"
WHERE "is_success" AND "ref_price" > 0
GROUP BY "symbol", date_trunc('hour', "snapshot_ts");

ALTER VIEW "public"."market_reference_hourly" OWNER TO "postgres";

COMMENT ON VIEW "public"."market_reference_hourly" IS 'Hourly median CEX reference price per symbol with cross-exchange spread (%). External truth layer for oracle-vs-market divergence.';

-- Retention: 180 days (training labels need a multi-month window).
SELECT cron.unschedule('market-reference-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'market-reference-cleanup');
SELECT cron.schedule('market-reference-cleanup', '30 4 * * *', $$
  DELETE FROM public.market_reference_snapshots WHERE snapshot_ts < now() - interval '180 days';
$$);

COMMIT;
