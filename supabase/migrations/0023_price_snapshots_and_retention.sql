-- Migration 0023: Fine-grained price snapshots (15-min) + 6-month retention
--
-- Adds a lean numeric-only price_snapshots table for ML / anomaly detection at
-- 15-minute grain (4x denser than hourly_price_snapshots). Populated by the new
-- GitHub Actions snapshot-collect job (scripts/collect-snapshot.ts), which
-- replaces the hourly Vercel-cron fetch path and escapes the 60s serverless
-- timeout.
--
-- Also adds 6-month retention to BOTH snapshot tables. hourly_price_snapshots
-- previously had NO cleanup and was growing unboundedly (~20 MB/month), which
-- would have filled the 500 MB free-tier DB in ~20 months even without any
-- frequency increase. This migration fixes that latent issue regardless of
-- expansion.
--
-- ML (ml/train.py) consumes only numeric columns (price, deviation_pct,
-- data_age_seconds, is_success) with LOOKBACK_WEEKS=8, so the lean schema is
-- sufficient. Rich jsonb fields (signal_vector, verification, metadata) stay
-- in price_records (24h TTL) for the realtime path. 6 months gives ML
-- seasonality/trend headroom well beyond the 8-week minimum.
--
-- Projected steady-state (post Pyth removal):
--   price_snapshots         ~6,000 rows/day  → ~108k rows/6mo ≈ 165 MB
--   hourly_price_snapshots  ~1,500 rows/day  →  ~27k rows/6mo ≈ 100 MB
--   total snapshot storage                                  ≈ 265 MB (within 500 MB)

BEGIN;

-- ─── 1. Fine-grained price_snapshots table ──────────────────────────
CREATE TABLE IF NOT EXISTS "public"."price_snapshots" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "snapshot_ts" timestamp with time zone NOT NULL,
    "snapshot_hour" timestamp with time zone NOT NULL,
    "provider" text NOT NULL,
    "symbol" text NOT NULL,
    "chain_id" integer NOT NULL DEFAULT 0,
    "price" numeric(24,8) NOT NULL,
    "consensus_price" numeric(24,8),
    "deviation_pct" numeric(10,4),
    "latency_ms" integer,
    "data_age_seconds" integer,
    "confidence" numeric(6,4),
    "is_success" boolean DEFAULT true NOT NULL,
    "error_message" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."price_snapshots" OWNER TO "postgres";

COMMENT ON TABLE "public"."price_snapshots" IS 'Fine-grained (15-min) price snapshots for ML/anomaly detection. Lean numeric schema; rich fields live in price_records (24h TTL). 6-month retention via pg_cron. Populated by GitHub Actions snapshot-collect job.';

COMMENT ON COLUMN "public"."price_snapshots"."snapshot_ts" IS 'Precise run timestamp (15-min grain). Append-only, one row per (run, provider, symbol, chain_id).';
COMMENT ON COLUMN "public"."price_snapshots"."snapshot_hour" IS 'snapshot_ts truncated to the hour, for hourly aggregation and alignment with hourly_price_snapshots.';

CREATE INDEX IF NOT EXISTS "price_snapshots_snapshot_ts_idx"
    ON "public"."price_snapshots" USING "btree" ("snapshot_ts" DESC);
CREATE INDEX IF NOT EXISTS "price_snapshots_symbol_ts_idx"
    ON "public"."price_snapshots" USING "btree" ("symbol", "snapshot_ts" DESC);
CREATE INDEX IF NOT EXISTS "price_snapshots_provider_symbol_ts_idx"
    ON "public"."price_snapshots" USING "btree" ("provider", "symbol", "snapshot_ts" DESC);

-- ─── 2. Retention: 6 months for both snapshot tables ────────────────
-- Daily delete at 04:00/04:30 UTC (off-peak, offset from other pg_cron jobs).
-- Each daily pass removes ~1 day of rows (~6k for price_snapshots, ~1.5k for
-- hourly) — cheap, no partitioning needed at this volume.

SELECT cron.unschedule('price-snapshots-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-snapshots-cleanup');
SELECT cron.unschedule('hourly-snapshots-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-snapshots-cleanup');

SELECT cron.schedule('price-snapshots-cleanup', '30 4 * * *', $$
  DELETE FROM public.price_snapshots WHERE snapshot_ts < now() - interval '6 months';
$$);

SELECT cron.schedule('hourly-snapshots-cleanup', '0 4 * * *', $$
  DELETE FROM public.hourly_price_snapshots WHERE snapshot_hour < now() - interval '6 months';
$$);

COMMIT;
