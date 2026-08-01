-- Security & correctness hardening.
--
-- Background: the legacy migrations (0006) granted EXECUTE on a number of
-- privileged / destructive SECURITY DEFINER functions to the `anon` and
-- `authenticated` roles. The public anon key is browser-visible, and
-- SECURITY DEFINER functions bypass RLS — so any holder of the anon key
-- could call them directly via PostgREST (e.g. trigger bulk DELETEs,
-- exhaust another user's API-key quota, recompute reputations, read any
-- user's endpoint usage). A full audit of every `.rpc()` call site in the
-- application confirmed ALL of them go through `createServiceRoleClient()`
-- (the service-role client), never the anon/user client. It is therefore
-- safe to revoke EXECUTE from anon/authenticated; the app is unaffected.
--
-- What this migration does:
--   1. DROP the broken `auto_resolve_stale_alert_events` function (it
--      references the non-existent `price_alert_events` table and wrong
--      columns — the real table is `alert_events` with `triggered_at` /
--      `acknowledged` columns). It was never scheduled and never called
--      from the app; calling it raised "relation does not exist".
--   2. REVOKE EXECUTE on every privileged RPC from anon/authenticated,
--      leaving access only to service_role (and postgres, the owner).
--   3. REVOKE TRUNCATE, REFERENCES, TRIGGER on all public tables from
--      anon/authenticated. RLS does NOT protect against TRUNCATE, so the
--      previous `GRANT ALL` was a defense-in-depth gap. CRUD privileges
--      (SELECT/INSERT/UPDATE/DELETE) are left intact.
--   4. Fix `aggregate_oracle_reputation_v4`: when consensus calculation
--      failed upstream, `reputation_history` rows were persisted with
--      `consensus_price = 0` and `deviation_pct = 0`. The accuracy and
--      reliability aggregates already excluded `consensus_price > 0` rows,
--      but `avg_deviation` included the bogus `0` values, artificially
--      lowering the average and inflating `deviation_score` (→ overall
--      score). Now `avg_deviation` also filters on `consensus_price > 0`,
--      matching the other aggregates.
--
-- Note: trigger functions (handle_new_user, update_oracle_feeds_updated_at,
-- update_updated_at_column) are intentionally NOT revoked — trigger
-- invocation does not require EXECUTE privilege, and leaving them avoids
-- any risk to the on_auth_user_created signup trigger.

-- 1. Drop broken dead function (references non-existent table).
DROP FUNCTION IF EXISTS "public"."auto_resolve_stale_alert_events"();

-- 2. Revoke EXECUTE on privileged RPCs from anon/authenticated.
--    (Trigger functions are intentionally left out — see header.)
REVOKE ALL ON FUNCTION
  "public"."aggregate_oracle_reputation_v4"("p_provider" "text", "p_lookback_days" integer, "p_latency_baseline" integer, "p_provider_type" "text")
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."batch_update_feed_health"("p_results" "jsonb")
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."cleanup_api_key_usage"()
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."cleanup_expired_price_records"()
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."cleanup_old_reputation_history"("p_retention_days" integer)
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."cleanup_rate_limits"()
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."deactivate_expired_api_keys"()
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."increment_feed_failures"("p_provider" "text", "p_symbol" "text", "p_chain_id" integer, "p_failure_at" timestamp with time zone)
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."increment_rate_limit"("p_key" "text", "p_window_ms" integer)
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."recalculate_all_reputations"()
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."trigger_reputation_fetch"()
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."get_daily_endpoint_usage"("p_user_id" uuid, "p_endpoint" text)
  FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION
  "public"."increment_api_key_quota"("key_id" uuid)
  FROM "anon", "authenticated";

-- 3. Revoke destructive table privileges (TRUNCATE/REFERENCES/TRIGGER) from
--    anon/authenticated. RLS does not protect TRUNCATE. CRUD stays intact.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA "public"
  FROM "anon", "authenticated";

-- 4. Fix avg_deviation in aggregate_oracle_reputation_v4 to exclude rows
--    without a consensus price (consensus_price = 0), matching the accuracy
--    and reliability aggregates. Only the avg_deviation AVG line changes;
--    the rest of the function body is identical to 0004/0012.
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
        -- FIX: exclude rows where consensus calculation failed (consensus_price = 0).
        -- Their deviation_pct is a meaningless 0 and was silently lowering avg_deviation,
        -- inflating deviation_score and the overall reputation. Matches accuracy/reliability.
        COALESCE(AVG(ABS(deviation_pct)) FILTER (WHERE is_success AND consensus_price > 0), 0),
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
