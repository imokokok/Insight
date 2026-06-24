-- ============================================
-- Daily Oracle Reports Schema
-- Version: 1.0.0
-- Description: Stores hourly price snapshots and aggregated daily reports
--   for historical oracle performance analysis and SEO-friendly report pages.
-- ============================================

-- Hourly snapshots of key assets across major oracle providers.
-- One row per provider/symbol/hour. Data is deduplicated via unique key.
CREATE TABLE IF NOT EXISTS public.hourly_price_snapshots (
    id BIGSERIAL PRIMARY KEY,
    snapshot_hour TIMESTAMPTZ NOT NULL,
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    price DECIMAL(24, 8) NOT NULL,
    consensus_price DECIMAL(24, 8),
    deviation_pct DECIMAL(10, 4),
    latency_ms INTEGER,
    data_age_seconds INTEGER,
    confidence DECIMAL(6, 4),
    is_success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_hour, provider, symbol)
);

COMMENT ON TABLE public.hourly_price_snapshots IS
    'Hourly price snapshots for key assets across oracle providers, used to build daily reports.';

CREATE INDEX IF NOT EXISTS idx_hourly_snapshots_hour
    ON public.hourly_price_snapshots(snapshot_hour DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_snapshots_provider_symbol_hour
    ON public.hourly_price_snapshots(provider, symbol, snapshot_hour DESC);

-- Aggregated daily reports. One row per calendar day.
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id BIGSERIAL PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    report_title TEXT NOT NULL,
    summary TEXT NOT NULL,
    highlights JSONB NOT NULL DEFAULT '[]'::JSONB,
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    top_assets JSONB NOT NULL DEFAULT '[]'::JSONB,
    provider_rankings JSONB NOT NULL DEFAULT '[]'::JSONB,
    deviation_events JSONB NOT NULL DEFAULT '[]'::JSONB,
    anomaly_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.daily_reports IS
    'Daily aggregated oracle performance reports, one per calendar day.';

CREATE INDEX IF NOT EXISTS idx_daily_reports_date
    ON public.daily_reports(report_date DESC);

-- Enable RLS but allow public read access to snapshots and reports.
ALTER TABLE public.hourly_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'hourly_price_snapshots' AND policyname = 'Allow public read access to hourly snapshots'
    ) THEN
        CREATE POLICY "Allow public read access to hourly snapshots"
            ON public.hourly_price_snapshots
            FOR SELECT TO PUBLIC USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'daily_reports' AND policyname = 'Allow public read access to daily reports'
    ) THEN
        CREATE POLICY "Allow public read access to daily reports"
            ON public.daily_reports
            FOR SELECT TO PUBLIC USING (true);
    END IF;
END
$$;
