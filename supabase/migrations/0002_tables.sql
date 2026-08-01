-- Tables, sequences, defaults, and foreign keys

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."price_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "symbol" "text" NOT NULL,
    "provider" "text",
    "chain" "text",
    "condition_type" "text" NOT NULL,
    "target_value" numeric(20,8) NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_triggered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    CONSTRAINT "price_alerts_condition_type_check" CHECK (("condition_type" = ANY (ARRAY['above'::"text", 'below'::"text", 'change_percent'::"text"])))
);


ALTER TABLE "public"."price_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."price_alerts" IS 'Price alert configurations with trigger conditions';



COMMENT ON COLUMN "public"."price_alerts"."condition_type" IS 'Alert condition: above, below, or change_percent';



COMMENT ON COLUMN "public"."price_alerts"."name" IS 'Optional user-defined name for the alert';



CREATE TABLE IF NOT EXISTS "public"."price_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "provider" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "chain" "text",
    "price" numeric(20,8) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "confidence" numeric(5,4),
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ttl" timestamp with time zone NOT NULL,
    "failure_mode" "text" DEFAULT 'none'::"text",
    "signal_vector" "jsonb",
    "decimals" integer,
    "verification" "jsonb",
    "ingestion_timestamp" timestamp with time zone,
    "metadata_fallback" boolean,
    "metadata" "jsonb"
);


ALTER TABLE "public"."price_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."price_records" IS 'Historical price data from oracle providers with TTL for automatic cleanup';



COMMENT ON COLUMN "public"."price_records"."confidence" IS 'Confidence score from 0 to 1';



COMMENT ON COLUMN "public"."price_records"."ttl" IS 'Time-to-live: record expires after this timestamp';



COMMENT ON COLUMN "public"."price_records"."failure_mode" IS 'Failure classification for the recorded price (e.g. stale_timestamp, fallback_metadata).';



COMMENT ON COLUMN "public"."price_records"."signal_vector" IS 'Computed signal vector for deviation and confidence analysis.';



COMMENT ON COLUMN "public"."price_records"."metadata" IS 'Provider-specific metadata such as roundId, dapiName, proxyAddress, priceId, etc.';



CREATE OR REPLACE VIEW "public"."active_alerts_with_prices" AS
 SELECT "pa"."id" AS "alert_id",
    "pa"."user_id",
    "pa"."symbol",
    "pa"."provider",
    "pa"."chain",
    "pa"."condition_type",
    "pa"."target_value",
    "pa"."is_active",
    "pa"."last_triggered_at",
    "pr"."price" AS "current_price",
    "pr"."timestamp" AS "price_timestamp"
   FROM ("public"."price_alerts" "pa"
     LEFT JOIN LATERAL ( SELECT "pr_1"."price",
            "pr_1"."timestamp"
           FROM "public"."price_records" "pr_1"
          WHERE (("pr_1"."symbol" = "pa"."symbol") AND (("pa"."provider" IS NULL) OR ("pr_1"."provider" = "pa"."provider")) AND (("pa"."chain" IS NULL) OR ("pr_1"."chain" = "pa"."chain")) AND ("pr_1"."ttl" > "now"()))
          ORDER BY "pr_1"."timestamp" DESC
         LIMIT 1) "pr" ON (true))
  WHERE ("pa"."is_active" = true);


ALTER VIEW "public"."active_alerts_with_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alert_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "triggered_at" timestamp with time zone DEFAULT "now"(),
    "price" numeric(20,8) NOT NULL,
    "condition_met" "text" NOT NULL,
    "acknowledged" boolean DEFAULT false,
    "acknowledged_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alert_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."alert_events" IS 'Records of alert trigger events';



COMMENT ON COLUMN "public"."alert_events"."condition_met" IS 'Description of the condition that was met';



CREATE TABLE IF NOT EXISTS "public"."api_key_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "api_key_id" "uuid" NOT NULL,
    "endpoint" character varying(200) NOT NULL,
    "method" character varying(10) DEFAULT 'GET'::character varying NOT NULL,
    "status_code" integer NOT NULL,
    "response_time_ms" integer,
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."api_key_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "key_hash" character varying(64) NOT NULL,
    "key_prefix" character varying(11) NOT NULL,
    "plan" character varying(20) DEFAULT 'free'::character varying NOT NULL,
    "rate_limit" integer DEFAULT 60 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "api_keys_plan_check" CHECK ((("plan")::"text" = ANY ((ARRAY['free'::character varying, 'pro'::character varying, 'enterprise'::character varying])::"text"[])))
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cron_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_reports" (
    "id" bigint NOT NULL,
    "report_date" "date" NOT NULL,
    "report_title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "metrics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "top_assets" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "provider_rankings" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "deviation_events" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "anomaly_summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recommendations" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "coverage_matrix" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "failure_breakdown" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "previous_day_comparison" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "risk_impacts" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "protocol_liquidation_risks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "stablecoin_depeg" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "wrapped_asset_peg" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."daily_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_reports" IS 'Daily aggregated oracle performance reports, one per calendar day.';



COMMENT ON COLUMN "public"."daily_reports"."risk_impacts" IS 'User-risk impact summary: who is affected and how, derived from oracle deviations and protocol exposure.';



COMMENT ON COLUMN "public"."daily_reports"."protocol_liquidation_risks" IS 'Per-protocol liquidation stress-test results using representative positions and 1%/3%/5% joint/single deviation scenarios.';



COMMENT ON COLUMN "public"."daily_reports"."stablecoin_depeg" IS 'Daily stablecoin depeg summary: max deviation, risk level, and affected protocols.';



COMMENT ON COLUMN "public"."daily_reports"."wrapped_asset_peg" IS 'Daily wrapped/LST asset peg summary: max deviation, risk level, and affected protocols.';



CREATE SEQUENCE IF NOT EXISTS "public"."daily_reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."daily_reports_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."daily_reports_id_seq" OWNED BY "public"."daily_reports"."id";



CREATE TABLE IF NOT EXISTS "public"."hourly_price_snapshots" (
    "id" bigint NOT NULL,
    "snapshot_hour" timestamp with time zone NOT NULL,
    "provider" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "price" numeric(24,8) NOT NULL,
    "consensus_price" numeric(24,8),
    "deviation_pct" numeric(10,4),
    "latency_ms" integer,
    "data_age_seconds" integer,
    "confidence" numeric(6,4),
    "is_success" boolean DEFAULT true NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hourly_price_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."hourly_price_snapshots" IS 'Hourly price snapshots for key assets across oracle providers, used to build daily reports.';



CREATE SEQUENCE IF NOT EXISTS "public"."hourly_price_snapshots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."hourly_price_snapshots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."hourly_price_snapshots_id_seq" OWNED BY "public"."hourly_price_snapshots"."id";



CREATE TABLE IF NOT EXISTS "public"."oracle_feeds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "chain_id" integer NOT NULL,
    "address" "text" NOT NULL,
    "name" "text" NOT NULL,
    "decimals" integer DEFAULT 8 NOT NULL,
    "category" "text" DEFAULT 'crypto'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "source" "text" DEFAULT 'sync'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consecutive_failures" integer DEFAULT 0 NOT NULL,
    "last_success_at" timestamp with time zone,
    "last_failure_at" timestamp with time zone
);


ALTER TABLE "public"."oracle_feeds" OWNER TO "postgres";


COMMENT ON COLUMN "public"."oracle_feeds"."address" IS 'Primary feed identifier: contract address (Chainlink/WINKLink/TWAP), feed ID (Pyth/Flare), pair index as string (Supra), dAPI name (API3), asset address (DIA), contract ID (Reflector)';



COMMENT ON COLUMN "public"."oracle_feeds"."metadata" IS 'Provider-specific data: {blockchain, pairIndex, feedId, dapiName, feeTier, token0, token1, contractId, ...}';



COMMENT ON COLUMN "public"."oracle_feeds"."consecutive_failures" IS 'Number of consecutive price-fetch failures; reset to 0 on success';



COMMENT ON COLUMN "public"."oracle_feeds"."last_success_at" IS 'Timestamp of the last successful price fetch for this feed';



COMMENT ON COLUMN "public"."oracle_feeds"."last_failure_at" IS 'Timestamp of the last failed price fetch for this feed';



CREATE TABLE IF NOT EXISTS "public"."oracle_reputation" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "provider" "text" NOT NULL,
    "overall_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "accuracy_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "uptime_percentage" numeric(5,2) DEFAULT 100 NOT NULL,
    "avg_latency_ms" integer DEFAULT 0 NOT NULL,
    "avg_deviation_pct" numeric(8,4) DEFAULT 0 NOT NULL,
    "reliability_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "freshness_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "total_queries" integer DEFAULT 0 NOT NULL,
    "failed_queries" integer DEFAULT 0 NOT NULL,
    "supported_symbols_count" integer DEFAULT 0 NOT NULL,
    "supported_chains_count" integer DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracle_reputation" OWNER TO "postgres";


COMMENT ON TABLE "public"."oracle_reputation" IS 'Persistent composite reputation scores for oracle providers, aggregated from historical data';



COMMENT ON COLUMN "public"."oracle_reputation"."overall_score" IS 'Composite reputation score (0-100), weighted across accuracy, uptime, reliability, freshness, latency, and deviation';



COMMENT ON COLUMN "public"."oracle_reputation"."accuracy_score" IS 'How close the oracle price is to consensus (0-100)';



COMMENT ON COLUMN "public"."oracle_reputation"."uptime_percentage" IS 'Percentage of successful queries vs total attempts';



COMMENT ON COLUMN "public"."oracle_reputation"."reliability_score" IS 'Combined measure of data consistency and availability';



COMMENT ON COLUMN "public"."oracle_reputation"."freshness_score" IS 'How recent/realtime the data is';



CREATE TABLE IF NOT EXISTS "public"."protocol_asset_risk_params" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "protocol_id" character varying(100) NOT NULL,
    "asset_symbol" character varying(50) NOT NULL,
    "liquidation_threshold" numeric(10,6),
    "max_ltv" numeric(10,6),
    "collateral_factor" numeric(10,6),
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exchange_rate" numeric(24,12)
);


ALTER TABLE "public"."protocol_asset_risk_params" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."protocol_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "protocol_id" character varying(100) NOT NULL,
    "tvl_usd" numeric(24,2),
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."protocol_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" character varying(200) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count" integer DEFAULT 1 NOT NULL,
    "reset_time" bigint DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reputation_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "provider" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "price" numeric(20,8),
    "consensus_price" numeric(20,8),
    "deviation_pct" numeric(8,4),
    "latency_ms" integer,
    "confidence" numeric(5,4),
    "is_success" boolean DEFAULT true NOT NULL,
    "error_message" "text",
    "snapshot_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data_age_seconds" integer,
    "failure_mode" "text" DEFAULT 'none'::"text",
    "signal_vector" "jsonb",
    "consensus_context" "jsonb"
);


ALTER TABLE "public"."reputation_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."reputation_history" IS 'Daily snapshots of oracle performance metrics for trend analysis and scoring';



COMMENT ON COLUMN "public"."reputation_history"."deviation_pct" IS 'Percentage deviation from consensus price at snapshot time';



COMMENT ON COLUMN "public"."reputation_history"."failure_mode" IS 'Structured failure mode classification for this snapshot';



COMMENT ON COLUMN "public"."reputation_history"."signal_vector" IS '5-dimensional signal vector at the time of this snapshot';



COMMENT ON COLUMN "public"."reputation_history"."consensus_context" IS 'Consensus context when deviation was recorded: {consensusPrice, agreement, participantCount, isOutlier, excludedProviders, method, confidenceLevel}';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "preferences" "jsonb" DEFAULT '{"theme": "dark", "language": "zh-CN", "default_chain": "ethereum", "chart_settings": {"auto_refresh": true, "refresh_interval": 30000, "show_confidence_interval": true}, "default_oracle": "chainlink", "default_symbol": "BTC/USD", "default_currency": "USD", "default_time_range": "24h", "auto_refresh_interval": 30}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Extends Supabase auth.users with user preferences and settings';



COMMENT ON COLUMN "public"."user_profiles"."preferences" IS '用户偏好设置 JSONB: default_oracle(默认预言机), default_symbol(默认交易对), default_chain(默认链), default_time_range(默认时间范围), default_currency(默认货币), auto_refresh_interval(自动刷新间隔秒), theme(主题), language(语言), chart_settings(图表设置)';



COMMENT ON COLUMN "public"."user_profiles"."avatar_url" IS 'User avatar image URL';



CREATE TABLE IF NOT EXISTS "public"."user_snapshots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "symbol" "text" NOT NULL,
    "name" "text",
    "selected_oracles" "text"[] NOT NULL,
    "price_data" "jsonb" NOT NULL,
    "stats" "jsonb" NOT NULL,
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_snapshots" IS 'User-saved price snapshots for comparison and historical reference';



COMMENT ON COLUMN "public"."user_snapshots"."is_public" IS 'Whether snapshot is publicly shareable';



ALTER TABLE ONLY "public"."daily_reports" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."daily_reports_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."hourly_price_snapshots" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."hourly_price_snapshots_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."alert_events"
    ADD CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_key_usage"
    ADD CONSTRAINT "api_key_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cron_config"
    ADD CONSTRAINT "cron_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_report_date_key" UNIQUE ("report_date");



ALTER TABLE ONLY "public"."hourly_price_snapshots"
    ADD CONSTRAINT "hourly_price_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hourly_price_snapshots"
    ADD CONSTRAINT "hourly_price_snapshots_snapshot_hour_provider_symbol_key" UNIQUE ("snapshot_hour", "provider", "symbol");



ALTER TABLE ONLY "public"."oracle_feeds"
    ADD CONSTRAINT "oracle_feeds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracle_feeds"
    ADD CONSTRAINT "oracle_feeds_unique_feed" UNIQUE ("provider", "symbol", "chain_id");



ALTER TABLE ONLY "public"."oracle_reputation"
    ADD CONSTRAINT "oracle_reputation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracle_reputation"
    ADD CONSTRAINT "oracle_reputation_provider_key" UNIQUE ("provider");



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_records"
    ADD CONSTRAINT "price_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."protocol_asset_risk_params"
    ADD CONSTRAINT "protocol_asset_risk_params_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."protocol_asset_risk_params"
    ADD CONSTRAINT "protocol_asset_risk_params_protocol_id_asset_symbol_key" UNIQUE ("protocol_id", "asset_symbol");



ALTER TABLE ONLY "public"."protocol_metrics"
    ADD CONSTRAINT "protocol_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."protocol_metrics"
    ADD CONSTRAINT "protocol_metrics_protocol_id_key" UNIQUE ("protocol_id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reputation_history"
    ADD CONSTRAINT "reputation_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "uq_rate_limits_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_snapshots"
    ADD CONSTRAINT "user_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_events"
    ADD CONSTRAINT "alert_events_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."price_alerts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_events"
    ADD CONSTRAINT "alert_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_key_usage"
    ADD CONSTRAINT "api_key_usage_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_snapshots"
    ADD CONSTRAINT "user_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
