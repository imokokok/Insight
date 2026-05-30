-- ============================================
-- Oracle Reputation Algorithm V4
-- Version: 4.0.0
-- Description: Fairer reputation scoring - removes systemic onchain bias,
--   unifies penalty formulas, adds sample size confidence, and improves
--   coverage bonus to reflect actual tested coverage
--
-- Key changes from V3.1:
--   1. REMOVED unconditional onchain bonus (+1.5)
--   2. UNIFIED deviation multiplier to 1.0 for all provider types
--   3. UNIFIED latency penalty formula (same multiplier & cap for all)
--   4. ADJUSTED latency baselines to be more realistic
--   5. LOWERED COALESCE defaults (insufficient data = lower score, not higher)
--   6. ADDED sample size confidence factor
--   7. IMPROVED coverage bonus based on actual tested symbol count
-- ============================================

CREATE OR REPLACE FUNCTION public.aggregate_oracle_reputation_v4(
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
    v_sample_factor DECIMAL(3, 2);
    v_coverage_bonus DECIMAL := 0;
    v_tested_symbols INT;
    v_consensus_count INT;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE NOT is_success),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN GREATEST(0, 100 - LEAST(ABS(deviation_pct) * 15, 85))
        END), 85),
        CASE WHEN COUNT(*) > 0
            THEN (COUNT(*) FILTER (WHERE is_success)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 95
        END,
        COALESCE(AVG(latency_ms) FILTER (WHERE is_success)::INT, 0),
        COALESCE(AVG(ABS(deviation_pct)) FILTER (WHERE is_success), 0),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN GREATEST(0, 100 - LEAST(ABS(deviation_pct) * 20, 80))
        END), 85),
        COALESCE(AVG(CASE WHEN is_success AND data_age_seconds IS NOT NULL
            THEN GREATEST(0, 100 - LEAST((data_age_seconds / 60.0) * 4, 90))
            WHEN is_success
            THEN GREATEST(0, 100 - LEAST((EXTRACT(EPOCH FROM (NOW() - snapshot_time)) / 60) * 2.5, 90))
        END), 80),
        COALESCE(STDDEV(CASE WHEN is_success AND consensus_price > 0
            THEN ABS(deviation_pct)
        END), 0),
        COUNT(DISTINCT symbol),
        COUNT(*) FILTER (WHERE is_success AND consensus_price > 0)
    INTO
        v_total, v_failed, v_accuracy, v_uptime, v_avg_latency,
        v_avg_deviation, v_reliability, v_freshness, v_consistency, v_tested_symbols,
        v_consensus_count
    FROM public.reputation_history
    WHERE provider = p_provider
        AND snapshot_time >= NOW() - (p_lookback_days || ' days')::INTERVAL;

    IF v_total < 20 THEN
        v_sample_factor := 0.85;
    ELSIF v_total < 50 THEN
        v_sample_factor := 0.92;
    ELSIF v_total < 100 THEN
        v_sample_factor := 0.97;
    ELSE
        v_sample_factor := 1.0;
    END IF;

    IF v_avg_latency <= 0 THEN
        v_latency_score := 85;
    ELSIF v_avg_latency <= p_latency_baseline THEN
        v_latency_score := 85 + (15 * (1 - (v_avg_latency::DECIMAL / p_latency_baseline)));
    ELSE
        DECLARE
            v_excess_ratio DECIMAL;
            v_penalty DECIMAL;
        BEGIN
            v_excess_ratio := (v_avg_latency - p_latency_baseline)::DECIMAL / p_latency_baseline;
            v_penalty := LEAST(v_excess_ratio * 28, 55);
            v_latency_score := GREATEST(25, 85 - v_penalty);
        END;
    END IF;

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

    DECLARE
        v_consistency_bonus DECIMAL := 0;
    BEGIN
        IF v_consensus_count >= 5 THEN
            IF v_consistency < 0.05 THEN
                v_consistency_bonus := 4;
            ELSIF v_consistency < 0.1 THEN
                v_consistency_bonus := 3;
            ELSIF v_consistency < 0.2 THEN
                v_consistency_bonus := 2;
            ELSIF v_consistency < 0.3 THEN
                v_consistency_bonus := 1;
            END IF;
        END IF;
        v_accuracy := LEAST(100, v_accuracy + v_consistency_bonus);
        v_reliability := LEAST(100, v_reliability + v_consistency_bonus);
    END;

    v_overall := ROUND(
        COALESCE(v_accuracy, 85) * 0.30 +
        COALESCE(v_uptime, 95) * 0.20 +
        COALESCE(v_reliability, 85) * 0.20 +
        COALESCE(v_freshness, 80) * 0.15 +
        COALESCE(v_latency_score, 70) * 0.10 +
        COALESCE(v_deviation_score, 70) * 0.05,
        2
    );

    v_overall := ROUND((v_overall * v_sample_factor) + (75 * (1 - v_sample_factor)), 2);

    IF v_tested_symbols >= 9 THEN
        v_coverage_bonus := 3;
    ELSIF v_tested_symbols >= 7 THEN
        v_coverage_bonus := 2;
    ELSIF v_tested_symbols >= 5 THEN
        v_coverage_bonus := 1;
    END IF;
    v_overall := v_overall + v_coverage_bonus;

    v_overall := LEAST(100, GREATEST(0, v_overall));

    INSERT INTO public.oracle_reputation (provider, overall_score, accuracy_score,
        uptime_percentage, avg_latency_ms, avg_deviation_pct, reliability_score,
        freshness_score, total_queries, failed_queries, last_calculated_at)
    VALUES (p_provider, v_overall, COALESCE(v_accuracy, 85),
        COALESCE(v_uptime, 95), COALESCE(v_avg_latency, 0),
        COALESCE(v_avg_deviation, 0), COALESCE(v_reliability, 85),
        COALESCE(v_freshness, 80), COALESCE(v_total, 0),
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
-- Update recalculate_all_reputations to use V4
-- Adjusted baselines: reduced onchain baselines for fairer comparison
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_all_reputations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider TEXT;
  v_count INTEGER := 0;
  v_baseline INTEGER;
  v_type TEXT;
BEGIN
  FOR v_provider IN
    SELECT DISTINCT provider FROM public.reputation_history
    WHERE snapshot_time >= NOW() - INTERVAL '7 days'
  LOOP
    CASE v_provider
      WHEN 'flare' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'chainlink' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'api3' THEN
        v_baseline := 1000;
        v_type := 'onchain';
      WHEN 'twap' THEN
        v_baseline := 1400;
        v_type := 'onchain';
      WHEN 'winklink' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'reflector' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'redstone' THEN
        v_baseline := 350;
        v_type := 'api';
      WHEN 'pyth' THEN
        v_baseline := 400;
        v_type := 'api';
      WHEN 'dia' THEN
        v_baseline := 500;
        v_type := 'api';
      WHEN 'supra' THEN
        v_baseline := 500;
        v_type := 'api';
      ELSE
        v_baseline := 1000;
        v_type := 'api';
    END CASE;

    PERFORM public.aggregate_oracle_reputation_v4(v_provider, 7, v_baseline, v_type);
    v_count := v_count + 1;
  END LOOP;

  FOR v_provider IN
    SELECT provider FROM public.oracle_reputation
    WHERE provider NOT IN (
      SELECT DISTINCT provider FROM public.reputation_history
      WHERE snapshot_time >= NOW() - INTERVAL '7 days'
    )
  LOOP
    CASE v_provider
      WHEN 'flare' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'chainlink' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'api3' THEN
        v_baseline := 1000;
        v_type := 'onchain';
      WHEN 'twap' THEN
        v_baseline := 1400;
        v_type := 'onchain';
      WHEN 'winklink' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'reflector' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'redstone' THEN
        v_baseline := 350;
        v_type := 'api';
      WHEN 'pyth' THEN
        v_baseline := 400;
        v_type := 'api';
      WHEN 'dia' THEN
        v_baseline := 500;
        v_type := 'api';
      WHEN 'supra' THEN
        v_baseline := 500;
        v_type := 'api';
      ELSE
        v_baseline := 1000;
        v_type := 'api';
    END CASE;

    PERFORM public.aggregate_oracle_reputation_v4(v_provider, 7, v_baseline, v_type);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated reputations for % providers using V4 algorithm', v_count;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.aggregate_oracle_reputation_v4 IS 'V4 reputation aggregation - unified scoring without systemic onchain bias, sample size confidence, tested-coverage bonus';
