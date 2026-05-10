-- ============================================
-- Oracle Reputation Schema
-- Version: 1.0.0
-- Description: Persistent oracle reliability scoring and tracking
-- ============================================

-- ============================================
-- Table: oracle_reputation
-- Stores current composite reputation scores per oracle provider
-- ============================================
CREATE TABLE IF NOT EXISTS public.oracle_reputation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL UNIQUE,
    overall_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    accuracy_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    uptime_percentage DECIMAL(5, 2) NOT NULL DEFAULT 100,
    avg_latency_ms INTEGER NOT NULL DEFAULT 0,
    avg_deviation_pct DECIMAL(8, 4) NOT NULL DEFAULT 0,
    reliability_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    freshness_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_queries INTEGER NOT NULL DEFAULT 0,
    failed_queries INTEGER NOT NULL DEFAULT 0,
    supported_symbols_count INTEGER NOT NULL DEFAULT 0,
    supported_chains_count INTEGER NOT NULL DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.oracle_reputation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read oracle reputation" ON public.oracle_reputation;
CREATE POLICY "Anyone can read oracle reputation"
    ON public.oracle_reputation FOR SELECT
    USING (true);

CREATE INDEX IF NOT EXISTS idx_oracle_reputation_provider ON public.oracle_reputation(provider);
CREATE INDEX IF NOT EXISTS idx_oracle_reputation_score ON public.oracle_reputation(overall_score DESC);

DROP TRIGGER IF EXISTS update_oracle_reputation_updated_at ON public.oracle_reputation;
CREATE TRIGGER update_oracle_reputation_updated_at
    BEFORE UPDATE ON public.oracle_reputation
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Table: reputation_history
-- Stores daily snapshots of reputation scores for trend analysis
-- ============================================
CREATE TABLE IF NOT EXISTS public.reputation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    price DECIMAL(20, 8),
    consensus_price DECIMAL(20, 8),
    deviation_pct DECIMAL(8, 4),
    latency_ms INTEGER,
    confidence DECIMAL(5, 4),
    is_success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reputation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reputation history" ON public.reputation_history;
CREATE POLICY "Anyone can read reputation history"
    ON public.reputation_history FOR SELECT
    USING (true);

CREATE INDEX IF NOT EXISTS idx_reputation_history_provider_time ON public.reputation_history(provider, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_history_symbol ON public.reputation_history(symbol);
CREATE INDEX IF NOT EXISTS idx_reputation_history_snapshot_time ON public.reputation_history(snapshot_time DESC);

-- ============================================
-- Functions
-- ============================================

-- Aggregate reputation scores from history into the oracle_reputation table
CREATE OR REPLACE FUNCTION public.aggregate_oracle_reputation(
    p_provider TEXT,
    p_lookback_days INTEGER DEFAULT 7
)
RETURNS void AS $$
DECLARE
    v_total INT;
    v_failed INT;
    v_accuracy DECIMAL(5, 2);
    v_uptime DECIMAL(5, 2);
    v_avg_latency INT;
    v_avg_deviation DECIMAL(8, 4);
    v_reliability DECIMAL(5, 2);
    v_freshness DECIMAL(5, 2);
    v_overall DECIMAL(5, 2);
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE NOT is_success),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN 100 - LEAST(ABS(deviation_pct) * 20, 90)
        END), 95),
        CASE WHEN COUNT(*) > 0
            THEN (COUNT(*) FILTER (WHERE is_success)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 100
        END,
        COALESCE(AVG(latency_ms) FILTER (WHERE is_success)::INT, 0),
        COALESCE(AVG(ABS(deviation_pct)) FILTER (WHERE is_success), 0),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN 100 - LEAST(ABS(deviation_pct) * 25, 80)
        END), 95),
        COALESCE(AVG(CASE WHEN is_success
            THEN GREATEST(0, 100 - (EXTRACT(EPOCH FROM (NOW() - snapshot_time)) / 3600 * 20)::DECIMAL)
        END), 90)
    INTO
        v_total, v_failed, v_accuracy, v_uptime, v_avg_latency,
        v_avg_deviation, v_reliability, v_freshness
    FROM public.reputation_history
    WHERE provider = p_provider
        AND snapshot_time >= NOW() - (p_lookback_days || ' days')::INTERVAL;

    v_overall := ROUND(
        COALESCE(v_accuracy, 95) * 0.25 +
        COALESCE(v_uptime, 100) * 0.20 +
        COALESCE(v_reliability, 95) * 0.20 +
        COALESCE(v_freshness, 90) * 0.15 +
        GREATEST(0, 100 - COALESCE(v_avg_latency, 0) / 50) * 0.10 +
        GREATEST(0, 100 - COALESCE(v_avg_deviation, 0) * 20) * 0.10,
        2
    );

    INSERT INTO public.oracle_reputation (provider, overall_score, accuracy_score,
        uptime_percentage, avg_latency_ms, avg_deviation_pct, reliability_score,
        freshness_score, total_queries, failed_queries, last_calculated_at)
    VALUES (p_provider, LEAST(v_overall, 100), COALESCE(v_accuracy, 95),
        COALESCE(v_uptime, 100), COALESCE(v_avg_latency, 0),
        COALESCE(v_avg_deviation, 0), COALESCE(v_reliability, 95),
        COALESCE(v_freshness, 90), COALESCE(v_total, 0),
        COALESCE(v_failed, 0), NOW())
    ON CONFLICT (provider)
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        accuracy_score = EXCLUDED.accuracy_score,
        uptime_percentage = EXCLUDED.uptime_percentage,
        avg_latency_ms = EXCLUDED.avg_latency_ms,
        avg_deviation_pct = EXCLUDED.avg_deviation_pct,
        reliability_score = EXCLUDED.reliability_score,
        freshness_score = EXCLUDED.freshness_score,
        total_queries = EXCLUDED.total_queries,
        failed_queries = EXCLUDED.failed_queries,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old history records
CREATE OR REPLACE FUNCTION public.cleanup_old_reputation_history(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS void AS $$
BEGIN
    DELETE FROM public.reputation_history
    WHERE snapshot_time < NOW() - (p_retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE public.oracle_reputation IS 'Persistent composite reputation scores for oracle providers, aggregated from historical data';
COMMENT ON TABLE public.reputation_history IS 'Daily snapshots of oracle performance metrics for trend analysis and scoring';
COMMENT ON COLUMN public.oracle_reputation.overall_score IS 'Composite reputation score (0-100), weighted across accuracy, uptime, reliability, freshness, latency, and deviation';
COMMENT ON COLUMN public.oracle_reputation.accuracy_score IS 'How close the oracle price is to consensus (0-100)';
COMMENT ON COLUMN public.oracle_reputation.uptime_percentage IS 'Percentage of successful queries vs total attempts';
COMMENT ON COLUMN public.oracle_reputation.reliability_score IS 'Combined measure of data consistency and availability';
COMMENT ON COLUMN public.oracle_reputation.freshness_score IS 'How recent/realtime the data is';
COMMENT ON COLUMN public.reputation_history.deviation_pct IS 'Percentage deviation from consensus price at snapshot time';