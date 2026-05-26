-- ============================================
-- Oracle Reputation Algorithm V2
-- Version: 2.0.0
-- Description: Fairer reputation scoring with provider-type-aware latency normalization
-- ============================================

-- ============================================
-- Updated Function: aggregate_oracle_reputation_v2
-- Key improvements:
--   1. Provider-type-aware latency scoring (onchain vs api baselines)
--   2. Reduced deviation penalty severity
--   3. Freshness based on data age rather than server time
--   4. Better weight distribution
-- ============================================
CREATE OR REPLACE FUNCTION public.aggregate_oracle_reputation_v2(
    p_provider TEXT,
    p_lookback_days INTEGER DEFAULT 7,
    p_latency_baseline INTEGER DEFAULT 1000,
    p_provider_type TEXT DEFAULT 'api'
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
    v_latency_score DECIMAL(5, 2);
    v_deviation_score DECIMAL(5, 2);
    v_consistency DECIMAL(5, 2);
BEGIN
    -- Aggregate base metrics from history
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE NOT is_success),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN GREATEST(0, 100 - LEAST(ABS(deviation_pct) * 15, 85))
        END), 95),
        CASE WHEN COUNT(*) > 0
            THEN (COUNT(*) FILTER (WHERE is_success)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 100
        END,
        COALESCE(AVG(latency_ms) FILTER (WHERE is_success)::INT, 0),
        COALESCE(AVG(ABS(deviation_pct)) FILTER (WHERE is_success), 0),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN GREATEST(0, 100 - LEAST(ABS(deviation_pct) * 20, 80))
        END), 95),
        COALESCE(AVG(CASE WHEN is_success AND data_age_seconds IS NOT NULL
            THEN GREATEST(0, 100 - LEAST((data_age_seconds / 60.0) * 5, 90))
            WHEN is_success
            THEN GREATEST(0, 100 - LEAST((EXTRACT(EPOCH FROM (NOW() - snapshot_time)) / 60) * 3, 90))
        END), 90),
        COALESCE(STDDEV(CASE WHEN is_success AND consensus_price > 0
            THEN ABS(deviation_pct)
        END), 0)
    INTO
        v_total, v_failed, v_accuracy, v_uptime, v_avg_latency,
        v_avg_deviation, v_reliability, v_freshness, v_consistency
    FROM public.reputation_history
    WHERE provider = p_provider
        AND snapshot_time >= NOW() - (p_lookback_days || ' days')::INTERVAL;

    -- Latency score: normalized against provider baseline
    -- Onchain providers (Flare, Chainlink) get fairer scoring
    IF v_avg_latency <= 0 THEN
        v_latency_score := 95;
    ELSIF v_avg_latency <= p_latency_baseline THEN
        -- Within baseline: score 85-100
        v_latency_score := 85 + (15 * (1 - (v_avg_latency::DECIMAL / p_latency_baseline)));
    ELSE
        -- Above baseline: penalize excess more gently
        DECLARE
            v_excess_ratio DECIMAL;
            v_penalty DECIMAL;
        BEGIN
            v_excess_ratio := (v_avg_latency - p_latency_baseline)::DECIMAL / p_latency_baseline;
            v_penalty := LEAST(v_excess_ratio * 30, 60);
            v_latency_score := GREATEST(25, 85 - v_penalty);
        END;
    END IF;

    -- Deviation score: gentler curve
    IF v_avg_deviation <= 0.1 THEN
        v_deviation_score := 100;
    ELSIF v_avg_deviation <= 0.5 THEN
        v_deviation_score := 95 - ((v_avg_deviation - 0.1) / 0.4) * 15;
    ELSIF v_avg_deviation <= 1.0 THEN
        v_deviation_score := 80 - ((v_avg_deviation - 0.5) / 0.5) * 25;
    ELSIF v_avg_deviation <= 2.0 THEN
        v_deviation_score := 55 - ((v_avg_deviation - 1.0) / 1.0) * 30;
    ELSE
        v_deviation_score := GREATEST(10, 25 - (v_avg_deviation - 2.0) * 5);
    END IF;

    -- Consistency bonus: low stddev in deviation = bonus
    DECLARE
        v_consistency_bonus DECIMAL := 0;
    BEGIN
        IF v_consistency < 0.1 THEN
            v_consistency_bonus := 3;
        ELSIF v_consistency < 0.3 THEN
            v_consistency_bonus := 1.5;
        END IF;
        v_accuracy := LEAST(100, v_accuracy + v_consistency_bonus);
        v_reliability := LEAST(100, v_reliability + v_consistency_bonus);
    END;

    -- Coverage bonus: providers supporting more symbols get a small boost
    DECLARE
        v_coverage_bonus DECIMAL := 0;
        v_supported_symbols INT;
    BEGIN
        SELECT supported_symbols_count INTO v_supported_symbols
        FROM public.oracle_reputation WHERE provider = p_provider;
        
        IF v_supported_symbols >= 50 THEN
            v_coverage_bonus := 2;
        ELSIF v_supported_symbols >= 30 THEN
            v_coverage_bonus := 1;
        END IF;
        v_overall := v_overall + v_coverage_bonus;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Overall score with updated weights
    v_overall := ROUND(
        COALESCE(v_accuracy, 95) * 0.30 +
        COALESCE(v_uptime, 100) * 0.20 +
        COALESCE(v_reliability, 95) * 0.20 +
        COALESCE(v_freshness, 90) * 0.15 +
        COALESCE(v_latency_score, 80) * 0.10 +
        COALESCE(v_deviation_score, 80) * 0.05,
        2
    );

    -- Ensure within bounds
    v_overall := LEAST(100, GREATEST(0, v_overall));

    INSERT INTO public.oracle_reputation (provider, overall_score, accuracy_score,
        uptime_percentage, avg_latency_ms, avg_deviation_pct, reliability_score,
        freshness_score, total_queries, failed_queries, last_calculated_at)
    VALUES (p_provider, v_overall, COALESCE(v_accuracy, 95),
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

-- ============================================
-- Add data_age_seconds column to reputation_history for better freshness tracking
-- ============================================
ALTER TABLE public.reputation_history
ADD COLUMN IF NOT EXISTS data_age_seconds INTEGER;

-- ============================================
-- Update comments
-- ============================================
COMMENT ON FUNCTION public.aggregate_oracle_reputation_v2 IS 'V2 reputation aggregation with provider-type-aware latency normalization and fairer scoring for onchain oracles';
