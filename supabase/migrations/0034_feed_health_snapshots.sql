-- Migration 0034: Oracle Watch feed-health snapshots
--
-- Time-series spine for the Oracle Watch feature: one row per (symbol, chain,
-- evaluated_at) holding the consolidated live cross-oracle trust signal that
-- agents gate on (verdict, deviation, agreement, quorum, outliers, staleness)
-- plus the forward-looking ML manipulation-risk score and provider reputation.
--
-- Purpose: Oracle Watch is positioned as an "always-on" credibility layer.
-- This table is what makes it RETROSPECTIVE — a dependent agent / consumer can
-- query "how did this feed's trust evolve over the last N hours?" without
-- having to poll and store history itself. Populated by the GitHub Actions
-- oracle-watch-collect job (scripts/collect-oracle-watch.ts, every 30 min) —
-- the same runner-based pattern as collect-snapshot, escaping the Vercel 60s
-- serverless timeout.
--
-- Storage at 30-min grain over 90 days is negligible (~48 rows/symbol/day).

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."feed_health_snapshots" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "symbol" text NOT NULL,
    "chain" text,
    "evaluated_at" timestamp with time zone NOT NULL,
    "verdict" text NOT NULL,
    "recommendation" text NOT NULL,
    "reason" text NOT NULL,
    "max_deviation_pct" double precision,
    "agreement" double precision NOT NULL,
    "participant_count" integer NOT NULL,
    "outlier_count" integer NOT NULL,
    "stale_count" integer NOT NULL,
    "consensus_price" double precision,
    "ml_risk_score" double precision,
    "ml_risk_level" text,
    "avg_reputation" double precision,
    "min_reputation" double precision,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "feed_health_snapshots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."feed_health_snapshots" OWNER TO "postgres";

COMMENT ON TABLE "public"."feed_health_snapshots" IS 'Oracle Watch time-series spine: consolidated live cross-oracle trust signal per (symbol, chain, evaluated_at). Populated by GitHub Actions oracle-watch-collect every 30 min.';
COMMENT ON COLUMN "public"."feed_health_snapshots"."chain" IS 'Blockchain (nullable = global cross-oracle coverage).';
COMMENT ON COLUMN "public"."feed_health_snapshots"."ml_risk_score" IS 'Forward-looking ML manipulation-risk score (0-1), advisory.';
COMMENT ON COLUMN "public"."feed_health_snapshots"."ml_risk_level" IS 'Discrete advisory gate derived from ml_risk_score (low/medium/high).';

CREATE INDEX IF NOT EXISTS "feed_health_snapshots_symbol_chain_ts_idx"
    ON "public"."feed_health_snapshots" USING "btree" ("symbol", "chain", "evaluated_at" DESC);
CREATE INDEX IF NOT EXISTS "feed_health_snapshots_ts_idx"
    ON "public"."feed_health_snapshots" USING "btree" ("evaluated_at" DESC);

-- Retention: 90 days (enough for credibility-trend queries; ~48 rows/symbol/day).
SELECT cron.unschedule('feed-health-snapshots-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-health-snapshots-cleanup');
SELECT cron.schedule('feed-health-snapshots-cleanup', '15 4 * * *', $$
  DELETE FROM public.feed_health_snapshots WHERE evaluated_at < now() - interval '90 days';
$$);

COMMIT;