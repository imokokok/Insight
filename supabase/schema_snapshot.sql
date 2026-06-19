-- ============================================================
-- Schema Snapshot (auto-generated from production database)
-- Project: naevwrexybqodxinkrug
-- This file is a READ-ONLY reference of the current DB schema.
-- It is NOT a migration file. Do NOT execute against any DB.
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS uuid-ossp SCHEMA extensions;

-- ============================================================
-- Enum Types
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================
CREATE TABLE alert_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  alert_id uuid NOT NULL,
  user_id uuid NOT NULL,
  triggered_at timestamp with time zone DEFAULT now(),
  price numeric(20,8) NOT NULL,
  condition_met text NOT NULL,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE cron_config (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (key)
);

CREATE TABLE oracle_reputation (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  provider text NOT NULL,
  overall_score numeric(5,2) DEFAULT 0 NOT NULL,
  accuracy_score numeric(5,2) DEFAULT 0 NOT NULL,
  uptime_percentage numeric(5,2) DEFAULT 100 NOT NULL,
  avg_latency_ms integer DEFAULT 0 NOT NULL,
  avg_deviation_pct numeric(8,4) DEFAULT 0 NOT NULL,
  reliability_score numeric(5,2) DEFAULT 0 NOT NULL,
  freshness_score numeric(5,2) DEFAULT 0 NOT NULL,
  total_queries integer DEFAULT 0 NOT NULL,
  failed_queries integer DEFAULT 0 NOT NULL,
  supported_symbols_count integer DEFAULT 0 NOT NULL,
  supported_chains_count integer DEFAULT 0 NOT NULL,
  last_calculated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE price_alert_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  severity text NOT NULL,
  alert_type text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  symbol text NOT NULL,
  chain text,
  provider text NOT NULL,
  provider_price numeric(20,8) NOT NULL,
  consensus_price numeric(20,8) NOT NULL,
  deviation_pct numeric(10,4) NOT NULL,
  providers_involved ARRAY DEFAULT '{}'::text[],
  price_snapshot jsonb DEFAULT '{}'::jsonb,
  notes text,
  detected_at timestamp with time zone DEFAULT now() NOT NULL,
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE price_alerts (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  provider text,
  chain text,
  condition_type text NOT NULL,
  target_value numeric(20,8) NOT NULL,
  is_active boolean DEFAULT true,
  last_triggered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text,
  PRIMARY KEY (id)
);

CREATE TABLE price_records (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  provider text NOT NULL,
  symbol text NOT NULL,
  chain text,
  price numeric(20,8) NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  confidence numeric(5,4),
  source text,
  created_at timestamp with time zone DEFAULT now(),
  ttl timestamp with time zone NOT NULL,
  failure_mode text DEFAULT 'none'::text,
  signal_vector jsonb,
  decimals integer,
  verification jsonb,
  ingestion_timestamp timestamp with time zone,
  metadata_fallback boolean,
  metadata jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE reputation_history (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  provider text NOT NULL,
  symbol text NOT NULL,
  price numeric(20,8),
  consensus_price numeric(20,8),
  deviation_pct numeric(8,4),
  latency_ms integer,
  confidence numeric(5,4),
  is_success boolean DEFAULT true NOT NULL,
  error_message text,
  snapshot_time timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  data_age_seconds integer,
  failure_mode text DEFAULT 'none'::text,
  signal_vector jsonb,
  consensus_context jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE spot_twap_snapshots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  symbol text NOT NULL,
  chain text NOT NULL,
  provider text NOT NULL,
  spot_price numeric NOT NULL,
  twap_price numeric NOT NULL,
  consensus_price numeric,
  deviation_percent numeric NOT NULL,
  is_over_threshold boolean DEFAULT false NOT NULL,
  threat_level text DEFAULT 'low'::text NOT NULL,
  total_score numeric DEFAULT 0 NOT NULL,
  snapshot_time timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE user_profiles (
  id uuid NOT NULL,
  display_name text,
  preferences jsonb DEFAULT '{"theme": "dark", "language": "zh-CN", "default_chain": "ethereum", "chart_settings": {"auto_refresh": true, "refresh_interval": 30000, "show_confidence_interval": true}, "default_oracle": "chainlink", "default_symbol": "BTC/USD", "default_currency": "USD", "default_time_range": "24h", "auto_refresh_interval": 30}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  PRIMARY KEY (id)
);

CREATE TABLE user_snapshots (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  name text,
  selected_oracles ARRAY NOT NULL,
  price_data jsonb NOT NULL,
  stats jsonb NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- Foreign Keys
-- ============================================================
ALTER TABLE alert_events ADD CONSTRAINT alert_events_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES price_alerts(id) ON DELETE CASCADE;
ALTER TABLE alert_events ADD CONSTRAINT alert_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE price_alerts ADD CONSTRAINT price_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_snapshots ADD CONSTRAINT user_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- Unique Constraints
-- ============================================================
ALTER TABLE oracle_reputation ADD CONSTRAINT oracle_reputation_provider_key UNIQUE (provider);

-- ============================================================
-- Check Constraints
-- ============================================================
ALTER TABLE price_alert_events ADD CONSTRAINT price_alert_events_alert_type_check CHECK ((alert_type = ANY (ARRAY['cross_oracle_divergence'::text, 'price_spike'::text, 'stale_feed'::text, 'consensus_failure'::text, 'suspicious_activity'::text])));
ALTER TABLE price_alert_events ADD CONSTRAINT price_alert_events_severity_check CHECK ((severity = ANY (ARRAY['warning'::text, 'danger'::text, 'critical'::text])));
ALTER TABLE price_alert_events ADD CONSTRAINT price_alert_events_status_check CHECK ((status = ANY (ARRAY['active'::text, 'acknowledged'::text, 'resolved'::text, 'false_positive'::text])));
ALTER TABLE price_alerts ADD CONSTRAINT price_alerts_condition_type_check CHECK ((condition_type = ANY (ARRAY['above'::text, 'below'::text, 'change_percent'::text])));

-- ============================================================
-- Indexes
-- ============================================================
CREATE UNIQUE INDEX alert_events_pkey ON public.alert_events USING btree (id);
CREATE INDEX idx_alert_events_acknowledged ON public.alert_events USING btree (acknowledged) WHERE (acknowledged = false);
CREATE INDEX idx_alert_events_alert_id ON public.alert_events USING btree (alert_id);
CREATE INDEX idx_alert_events_triggered_at ON public.alert_events USING btree (triggered_at DESC);
CREATE INDEX idx_alert_events_user_id ON public.alert_events USING btree (user_id);
CREATE UNIQUE INDEX cron_config_pkey ON public.cron_config USING btree (key);
CREATE INDEX idx_oracle_reputation_provider ON public.oracle_reputation USING btree (provider);
CREATE INDEX idx_oracle_reputation_score ON public.oracle_reputation USING btree (overall_score DESC);
CREATE UNIQUE INDEX oracle_reputation_pkey ON public.oracle_reputation USING btree (id);
CREATE UNIQUE INDEX oracle_reputation_provider_key ON public.oracle_reputation USING btree (provider);
CREATE INDEX idx_price_alert_events_active ON public.price_alert_events USING btree (detected_at DESC) WHERE (status = 'active'::text);
CREATE INDEX idx_price_alert_events_alert_type ON public.price_alert_events USING btree (alert_type);
CREATE INDEX idx_price_alert_events_detected_at ON public.price_alert_events USING btree (detected_at DESC);
CREATE INDEX idx_price_alert_events_provider ON public.price_alert_events USING btree (provider);
CREATE INDEX idx_price_alert_events_severity ON public.price_alert_events USING btree (severity);
CREATE INDEX idx_price_alert_events_status ON public.price_alert_events USING btree (status);
CREATE INDEX idx_price_alert_events_symbol ON public.price_alert_events USING btree (symbol);
CREATE UNIQUE INDEX price_alert_events_pkey ON public.price_alert_events USING btree (id);
CREATE INDEX idx_price_alerts_active ON public.price_alerts USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_price_alerts_name ON public.price_alerts USING btree (name);
CREATE INDEX idx_price_alerts_provider ON public.price_alerts USING btree (provider);
CREATE INDEX idx_price_alerts_symbol ON public.price_alerts USING btree (symbol);
CREATE INDEX idx_price_alerts_user_id ON public.price_alerts USING btree (user_id);
CREATE UNIQUE INDEX price_alerts_pkey ON public.price_alerts USING btree (id);
CREATE INDEX idx_price_records_chain ON public.price_records USING btree (chain);
CREATE INDEX idx_price_records_failure_mode ON public.price_records USING btree (failure_mode);
CREATE INDEX idx_price_records_ingestion_timestamp ON public.price_records USING btree (ingestion_timestamp DESC);
CREATE INDEX idx_price_records_metadata ON public.price_records USING gin (metadata);
CREATE INDEX idx_price_records_provider_symbol ON public.price_records USING btree (provider, symbol);
CREATE INDEX idx_price_records_provider_symbol_timestamp ON public.price_records USING btree (provider, symbol, "timestamp" DESC);
CREATE INDEX idx_price_records_signal_vector ON public.price_records USING gin (signal_vector);
CREATE INDEX idx_price_records_timestamp ON public.price_records USING btree ("timestamp" DESC);
CREATE INDEX idx_price_records_ttl ON public.price_records USING btree (ttl);
CREATE UNIQUE INDEX price_records_pkey ON public.price_records USING btree (id);
CREATE INDEX idx_reputation_history_failure_mode ON public.reputation_history USING btree (failure_mode);
CREATE INDEX idx_reputation_history_provider_failure_mode ON public.reputation_history USING btree (provider, failure_mode);
CREATE INDEX idx_reputation_history_provider_time ON public.reputation_history USING btree (provider, snapshot_time DESC);
CREATE INDEX idx_reputation_history_snapshot_time ON public.reputation_history USING btree (snapshot_time DESC);
CREATE INDEX idx_reputation_history_symbol ON public.reputation_history USING btree (symbol);
CREATE UNIQUE INDEX reputation_history_pkey ON public.reputation_history USING btree (id);
CREATE INDEX idx_spot_twap_snapshots_lookup ON public.spot_twap_snapshots USING btree (symbol, chain, snapshot_time DESC);
CREATE UNIQUE INDEX spot_twap_snapshots_pkey ON public.spot_twap_snapshots USING btree (id);
CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);
CREATE INDEX idx_user_snapshots_created_at ON public.user_snapshots USING btree (created_at DESC);
CREATE INDEX idx_user_snapshots_public ON public.user_snapshots USING btree (is_public) WHERE (is_public = true);
CREATE INDEX idx_user_snapshots_symbol ON public.user_snapshots USING btree (symbol);
CREATE INDEX idx_user_snapshots_user_id ON public.user_snapshots USING btree (user_id);
CREATE UNIQUE INDEX user_snapshots_pkey ON public.user_snapshots USING btree (id);

-- ============================================================
-- Functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.aggregate_oracle_reputation_v4(p_provider text, p_lookback_days integer DEFAULT 7, p_latency_baseline integer DEFAULT 1000, p_provider_type text DEFAULT 'api'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.auto_resolve_stale_alert_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.cleanup_api_key_usage()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.api_key_usage
  WHERE created_at < now() - interval '90 days';
END;
$function$

CREATE OR REPLACE FUNCTION public.cleanup_expired_price_records()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM public.price_records WHERE ttl < NOW();
END;
$function$

CREATE OR REPLACE FUNCTION public.cleanup_old_reputation_history(p_retention_days integer DEFAULT 7)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM public.reputation_history
    WHERE snapshot_time < NOW() - (p_retention_days || ' days')::INTERVAL;
END;
$function$

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.recalculate_all_reputations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.trigger_reputation_fetch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

-- ============================================================
-- Views
-- ============================================================
CREATE VIEW active_alerts_with_prices AS
SELECT pa.id AS alert_id,
    pa.user_id,
    pa.symbol,
    pa.provider,
    pa.chain,
    pa.condition_type,
    pa.target_value,
    pa.is_active,
    pa.last_triggered_at,
    pr.price AS current_price,
    pr."timestamp" AS price_timestamp
   FROM price_alerts pa
     LEFT JOIN LATERAL ( SELECT pr_1.price,
            pr_1."timestamp"
           FROM price_records pr_1
          WHERE pr_1.symbol = pa.symbol AND (pa.provider IS NULL OR pr_1.provider = pa.provider) AND (pa.chain IS NULL OR pr_1.chain = pa.chain) AND pr_1.ttl > now()
          ORDER BY pr_1."timestamp" DESC
         LIMIT 1) pr ON true
  WHERE pa.is_active = true;

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER update_oracle_reputation_updated_at BEFORE UPDATE ON public.oracle_reputation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON public.price_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_snapshots_updated_at BEFORE UPDATE ON public.user_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_twap_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can update own alert events ON alert_events AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
;

CREATE POLICY Users can view own alert events ON alert_events AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id))
;

CREATE POLICY Anyone can read cron config ON cron_config AS PERMISSIVE FOR SELECT TO public
  USING (true)
;

CREATE POLICY Anyone can read oracle reputation ON oracle_reputation AS PERMISSIVE FOR SELECT TO public
  USING (true)
;

CREATE POLICY Anyone can read price alert events ON price_alert_events AS PERMISSIVE FOR SELECT TO public
  USING (true)
;

CREATE POLICY Users can create own alerts ON price_alerts AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id))
;

CREATE POLICY Users can delete own alerts ON price_alerts AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = user_id))
;

CREATE POLICY Users can update own alerts ON price_alerts AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
;

CREATE POLICY Users can view own alerts ON price_alerts AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id))
;

CREATE POLICY Anyone can read price records ON price_records AS PERMISSIVE FOR SELECT TO public
  USING (true)
;

CREATE POLICY Anyone can read reputation history ON reputation_history AS PERMISSIVE FOR SELECT TO public
  USING (true)
;

CREATE POLICY Authenticated users can insert spot TWAP snapshots ON spot_twap_snapshots AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'authenticated'::text))
;

CREATE POLICY Spot TWAP snapshots are publicly readable ON spot_twap_snapshots AS PERMISSIVE FOR SELECT TO public
  USING (true)
;

CREATE POLICY Users can insert own profile ON user_profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = id))
;

CREATE POLICY Users can update own profile ON user_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = id))
;

CREATE POLICY Users can view own profile ON user_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = id))
;

CREATE POLICY Public snapshots are viewable by all ON user_snapshots AS PERMISSIVE FOR SELECT TO public
  USING ((is_public = true))
;

CREATE POLICY Users can create own snapshots ON user_snapshots AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id))
;

CREATE POLICY Users can delete own snapshots ON user_snapshots AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = user_id))
;

CREATE POLICY Users can update own snapshots ON user_snapshots AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
;

CREATE POLICY Users can view own snapshots ON user_snapshots AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id))
;

-- ============================================================
-- Sequences
-- ============================================================
-- (no standalone sequences)

-- ============================================================
-- pg_cron Jobs
-- ============================================================
SELECT cron.schedule('price-records-cleanup', '*/10 * * * *', $$
  SELECT public.cleanup_expired_price_records();
  $$);
SELECT cron.schedule('reputation-fetch-hourly', '5 * * * *', $$ SELECT public.trigger_reputation_fetch();
$$);
SELECT cron.schedule('reputation-history-cleanup', '0 3 * * *', $$
  SELECT public.cleanup_old_reputation_history(7);
  $$);
SELECT cron.schedule('reputation-recalculate-hourly', '30 * * * *', $$
  SELECT public.recalculate_all_reputations();
  $$);
