-- Functions

CREATE OR REPLACE FUNCTION "public"."aggregate_oracle_reputation_v4"("p_provider" "text", "p_lookback_days" integer DEFAULT 7, "p_latency_baseline" integer DEFAULT 1000, "p_provider_type" "text" DEFAULT 'api'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."aggregate_oracle_reputation_v4"("p_provider" "text", "p_lookback_days" integer, "p_latency_baseline" integer, "p_provider_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."aggregate_oracle_reputation_v4"("p_provider" "text", "p_lookback_days" integer, "p_latency_baseline" integer, "p_provider_type" "text") IS 'V4 reputation aggregation - unified scoring without systemic onchain bias, sample size confidence, tested-coverage bonus';



CREATE OR REPLACE FUNCTION "public"."auto_resolve_stale_alert_events"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    resolved_count INTEGER;
BEGIN
    UPDATE public.price_alert_events
    SET status = 'resolved', resolved_at = NOW()
    WHERE status = 'active'
        AND detected_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS resolved_count = ROW_COUNT;
    RETURN resolved_count;
END;
$$;


ALTER FUNCTION "public"."auto_resolve_stale_alert_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_update_feed_health"("p_results" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_updated INTEGER := 0;
  row_count INTEGER;
  rec JSONB;
  now_ts TIMESTAMPTZ := now();
BEGIN
  -- Process successes: reset consecutive_failures to 0
  FOR rec IN SELECT * FROM jsonb_array_elements(
    (SELECT COALESCE(p_results -> 'successes', '[]'::JSONB))
  )
  LOOP
    UPDATE oracle_feeds
    SET consecutive_failures = 0,
        last_success_at = now_ts,
        updated_at = now_ts
    WHERE provider = rec->>'provider'
      AND symbol = rec->>'symbol'
      AND chain_id = (rec->>'chainId')::INTEGER;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    total_updated := total_updated + row_count;
  END LOOP;

  -- Process failures: increment consecutive_failures atomically
  FOR rec IN SELECT * FROM jsonb_array_elements(
    (SELECT COALESCE(p_results -> 'failures', '[]'::JSONB))
  )
  LOOP
    UPDATE oracle_feeds
    SET consecutive_failures = consecutive_failures + 1,
        last_failure_at = now_ts,
        updated_at = now_ts
    WHERE provider = rec->>'provider'
      AND symbol = rec->>'symbol'
      AND chain_id = (rec->>'chainId')::INTEGER;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    total_updated := total_updated + row_count;
  END LOOP;

  RETURN total_updated;
END;
$$;


ALTER FUNCTION "public"."batch_update_feed_health"("p_results" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_api_key_usage"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.api_key_usage
  WHERE created_at < now() - interval '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_api_key_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_price_records"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.price_records WHERE ttl < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_price_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_reputation_history"("p_retention_days" integer DEFAULT 7) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.reputation_history
    WHERE snapshot_time < NOW() - (p_retention_days || ' days')::INTERVAL;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_reputation_history"("p_retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_rate_limits"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_time < (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
END;
$$;


ALTER FUNCTION "public"."cleanup_rate_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_expired_api_keys"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.api_keys
  SET is_active = false, updated_at = now()
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;
END;
$$;


ALTER FUNCTION "public"."deactivate_expired_api_keys"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_feed_failures"("p_provider" "text", "p_symbol" "text", "p_chain_id" integer, "p_failure_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE oracle_feeds
  SET consecutive_failures = consecutive_failures + 1,
      last_failure_at = p_failure_at,
      updated_at = now()
  WHERE provider = p_provider
    AND symbol = p_symbol
    AND chain_id = p_chain_id;
END;
$$;


ALTER FUNCTION "public"."increment_feed_failures"("p_provider" "text", "p_symbol" "text", "p_chain_id" integer, "p_failure_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_rate_limit"("p_key" "text", "p_window_ms" integer) RETURNS TABLE("count" integer, "reset_time" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_now BIGINT := EXTRACT(EPOCH FROM now()) * 1000;
  v_reset_time BIGINT := v_now + p_window_ms;
BEGIN
  RETURN QUERY
  INSERT INTO public.rate_limits (key, count, reset_time)
  VALUES (p_key, 1, v_reset_time)
  ON CONFLICT ON CONSTRAINT uq_rate_limits_key
  DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.reset_time < v_now THEN 1
      ELSE public.rate_limits.count + 1
    END,
    reset_time = CASE
      WHEN public.rate_limits.reset_time < v_now THEN v_reset_time
      ELSE public.rate_limits.reset_time
    END
  RETURNING public.rate_limits.count, public.rate_limits.reset_time;
END;
$$;


ALTER FUNCTION "public"."increment_rate_limit"("p_key" "text", "p_window_ms" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_all_reputations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."recalculate_all_reputations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_reputation_fetch"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_app_url TEXT;
  v_cron_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT value INTO v_app_url FROM public.cron_config WHERE key = 'next_public_app_url';
  SELECT value INTO v_cron_secret FROM public.cron_config WHERE key = 'cron_secret';

  IF v_app_url IS NULL OR v_app_url = '' THEN
    RAISE NOTICE 'next_public_app_url not configured in cron_config, skipping fetch';
    RETURN;
  END IF;

  SELECT INTO v_request_id net.http_get(
    url := v_app_url || '/api/cron/reputation',
    headers := jsonb_build_object(
      'Authorization', CASE
        WHEN v_cron_secret IS NOT NULL AND v_cron_secret != ''
        THEN 'Bearer ' || v_cron_secret
        ELSE ''
      END
    ),
    timeout_milliseconds := 60000
  );

  RAISE NOTICE 'Reputation fetch triggered via pg_net, request_id: %', v_request_id;
END;
$$;


ALTER FUNCTION "public"."trigger_reputation_fetch"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_reputation_fetch"() IS 'Triggers oracle price fetching by calling the dedicated cron API via pg_net with a 60s timeout.';



CREATE OR REPLACE FUNCTION "public"."update_oracle_feeds_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_oracle_feeds_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";
