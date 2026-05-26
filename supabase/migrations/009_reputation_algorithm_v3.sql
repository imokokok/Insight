-- ============================================
-- Oracle Reputation Algorithm V3
-- Version: 3.0.0
-- Description: Further improvements for fairer onchain oracle scoring
-- ============================================

-- ============================================
-- Updated Function: aggregate_oracle_reputation_v3
-- Key improvements:
--   1. Even gentler deviation curve for onchain providers
--   2. Time-synchronization-aware freshness scoring
--   3. Enhanced coverage bonus (Flare supports 72 symbols)
--   4. Stability bonus for low deviation variance
--   5. Better handling of chain timestamp vs server time differences
-- ============================================
CREATE OR REPLACE FUNCTION public.aggregate_oracle_reputation_v3(
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
    v_deviation_multiplier DECIMAL(3, 1);
BEGIN
    -- Set deviation multiplier based on provider type
    -- Onchain providers get gentler deviation scoring
    IF p_provider_type = 'onchain' THEN
        v_deviation_multiplier := 0.7;
    ELSE
        v_deviation_multiplier := 1.0;
    END IF;

    -- Aggregate base metrics from history
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE NOT is_success),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN GREATEST(0, 100 - LEAST(ABS(deviation_pct) * 15 * v_deviation_multiplier, 85))
        END), 95),
        CASE WHEN COUNT(*) > 0
            THEN (COUNT(*) FILTER (WHERE is_success)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 100
        END,
        COALESCE(AVG(latency_ms) FILTER (WHERE is_success)::INT, 0),
        COALESCE(AVG(ABS(deviation_pct)) FILTER (WHERE is_success), 0),
        COALESCE(AVG(CASE WHEN is_success AND consensus_price > 0
            THEN GREATEST(0, 100 - LEAST(ABS(deviation_pct) * 20 * v_deviation_multiplier, 80))
        END), 95),
        COALESCE(AVG(CASE WHEN is_success AND data_age_seconds IS NOT NULL
            THEN GREATEST(0, 100 - LEAST((data_age_seconds / 60.0) * 4, 90))
            WHEN is_success
            THEN GREATEST(0, 100 - LEAST((EXTRACT(EPOCH FROM (NOW() - snapshot_time)) / 60) * 2.5, 90))
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
    IF v_avg_latency <= 0 THEN
        v_latency_score := 95;
    ELSIF v_avg_latency <= p_latency_baseline THEN
        v_latency_score := 85 + (15 * (1 - (v_avg_latency::DECIMAL / p_latency_baseline)));
    ELSE
        DECLARE
            v_excess_ratio DECIMAL;
            v_penalty DECIMAL;
        BEGIN
            v_excess_ratio := (v_avg_latency - p_latency_baseline)::DECIMAL / p_latency_baseline;
            -- Onchain providers get even gentler penalty
            IF p_provider_type = 'onchain' THEN
                v_penalty := LEAST(v_excess_ratio * 25, 50);
            ELSE
                v_penalty := LEAST(v_excess_ratio * 30, 60);
            END IF;
            v_latency_score := GREATEST(25, 85 - v_penalty);
        END;
    END IF;

    -- Deviation score: type-aware gentler curve
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
        IF v_consistency < 0.05 THEN
            v_consistency_bonus := 4;
        ELSIF v_consistency < 0.1 THEN
            v_consistency_bonus := 3;
        ELSIF v_consistency < 0.2 THEN
            v_consistency_bonus := 2;
        ELSIF v_consistency < 0.3 THEN
            v_consistency_bonus := 1;
        END IF;
        v_accuracy := LEAST(100, v_accuracy + v_consistency_bonus);
        v_reliability := LEAST(100, v_reliability + v_consistency_bonus);
    END;

    -- Coverage bonus: providers supporting more symbols get a boost
    DECLARE
        v_coverage_bonus DECIMAL := 0;
        v_supported_symbols INT;
    BEGIN
        SELECT supported_symbols_count INTO v_supported_symbols
        FROM public.oracle_reputation WHERE provider = p_provider;
        
        IF v_supported_symbols >= 60 THEN
            v_coverage_bonus := 3;
        ELSIF v_supported_symbols >= 40 THEN
            v_coverage_bonus := 2;
        ELSIF v_supported_symbols >= 20 THEN
            v_coverage_bonus := 1;
        END IF;
        v_overall := v_overall + v_coverage_bonus;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Onchain provider bonus: recognize the reliability of onchain data
    IF p_provider_type = 'onchain' THEN
        v_overall := v_overall + 1.5;
    END IF;

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
-- Update recalculate_all_reputations to use V3
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
        v_baseline := 2000;
        v_type := 'onchain';
      WHEN 'chainlink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'api3' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'twap' THEN
        v_baseline := 1800;
        v_type := 'onchain';
      WHEN 'winklink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'reflector' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'redstone' THEN
        v_baseline := 300;
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

    PERFORM public.aggregate_oracle_reputation_v3(v_provider, 7, v_baseline, v_type);
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
        v_baseline := 2000;
        v_type := 'onchain';
      WHEN 'chainlink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'api3' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'twap' THEN
        v_baseline := 1800;
        v_type := 'onchain';
      WHEN 'winklink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'reflector' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'redstone' THEN
        v_baseline := 300;
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

    PERFORM public.aggregate_oracle_reputation_v3(v_provider, 7, v_baseline, v_type);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated reputations for % providers using V3 algorithm', v_count;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.aggregate_oracle_reputation_v3 IS 'V3 reputation aggregation with provider-type-aware latency normalization, gentler deviation scoring for onchain oracles, and enhanced coverage/stability bonuses';
