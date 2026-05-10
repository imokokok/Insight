-- ============================================
-- 006_enable_reputation_cron.sql
-- Enable pg_cron and pg_net for the full reputation lifecycle:
--   1. Hourly: Fetch oracle prices via pg_net → Node.js API
--   2. Hourly: Re-aggregate reputation scores from history
--   3. Daily:  Cleanup history older than 7 days
--   4. Hourly: Deactivate expired API keys
--   5. Every 5min: Cleanup rate limits
--   6. Every 10min: Cleanup expired price records
-- ============================================

-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres, service_role;

-- ============================================
-- Config table: stores app URL and cron secret
-- (Supabase doesn't allow ALTER DATABASE SET, so we use a table instead)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cron_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage cron config" ON public.cron_config;
CREATE POLICY "Service role can manage cron config"
    ON public.cron_config FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anyone can read cron config" ON public.cron_config;
CREATE POLICY "Anyone can read cron config"
    ON public.cron_config FOR SELECT
    USING (true);

-- Insert default config (update these values to match your deployment)
INSERT INTO public.cron_config (key, value) VALUES
    ('next_public_app_url', 'https://oracleinsight.xyz'),
    ('cron_secret', '55aeee66e33178e4d048ec8ac72f627b68b4313e3b43769347ea4284ad1f358c')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ============================================
-- Function: trigger_reputation_fetch
-- Reads config from cron_config table, then calls Next.js API via pg_net
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_reputation_fetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app_url TEXT;
  v_cron_secret TEXT;
  v_request_id INTEGER;
BEGIN
  SELECT value INTO v_app_url FROM public.cron_config WHERE key = 'next_public_app_url';
  SELECT value INTO v_cron_secret FROM public.cron_config WHERE key = 'cron_secret';

  IF v_app_url IS NULL OR v_app_url = '' THEN
    RAISE NOTICE 'next_public_app_url not configured in cron_config, skipping fetch';
    RETURN;
  END IF;

  SELECT INTO v_request_id net.http_post(
    url := v_app_url || '/api/reputation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CASE
        WHEN v_cron_secret IS NOT NULL AND v_cron_secret != ''
        THEN 'Bearer ' || v_cron_secret
        ELSE ''
      END
    ),
    body := '{}'::jsonb
  );

  RAISE NOTICE 'Reputation fetch triggered via pg_net, request_id: %', v_request_id;
END;
$$;

-- ============================================
-- Function: recalculate_all_reputations
-- Re-aggregates reputation scores for ALL providers from the last 7 days
-- This runs entirely in SQL — no Node.js needed
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_all_reputations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider TEXT;
  v_count INTEGER := 0;
BEGIN
  FOR v_provider IN
    SELECT DISTINCT provider FROM public.reputation_history
    WHERE snapshot_time >= NOW() - INTERVAL '7 days'
  LOOP
    PERFORM public.aggregate_oracle_reputation(v_provider, 7);
    v_count := v_count + 1;
  END LOOP;

  FOR v_provider IN
    SELECT provider FROM public.oracle_reputation
    WHERE provider NOT IN (
      SELECT DISTINCT provider FROM public.reputation_history
      WHERE snapshot_time >= NOW() - INTERVAL '7 days'
    )
  LOOP
    PERFORM public.aggregate_oracle_reputation(v_provider, 7);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated reputations for % providers', v_count;
  RETURN v_count;
END;
$$;

-- ============================================
-- Cron Schedule 1: Fetch oracle prices every hour at :05
-- ============================================
SELECT cron.schedule(
  'reputation-fetch-hourly',
  '5 * * * *',
  $$ SELECT public.trigger_reputation_fetch(); $$
);

-- ============================================
-- Cron Schedule 2: Recalculate all reputation scores every hour at :30
-- ============================================
SELECT cron.schedule(
  'reputation-recalculate-hourly',
  '30 * * * *',
  $$ SELECT public.recalculate_all_reputations(); $$
);

-- ============================================
-- Cron Schedule 3: Cleanup reputation history older than 7 days
-- ============================================
SELECT cron.schedule(
  'reputation-history-cleanup',
  '0 3 * * *',
  $$ SELECT public.cleanup_old_reputation_history(7); $$
);

-- ============================================
-- Cron Schedule 4: Deactivate expired API keys hourly
-- ============================================
SELECT cron.schedule(
  'api-keys-deactivation',
  '0 * * * *',
  $$ SELECT public.deactivate_expired_api_keys(); $$
);

-- ============================================
-- Cron Schedule 5: Cleanup rate limits every 5 minutes
-- ============================================
SELECT cron.schedule(
  'rate-limits-cleanup',
  '*/5 * * * *',
  $$ DELETE FROM public.rate_limits WHERE created_at < now() - interval '5 minutes'; $$
);

-- ============================================
-- Cron Schedule 6: Cleanup expired price records every 10 minutes
-- ============================================
SELECT cron.schedule(
  'price-records-cleanup',
  '*/10 * * * *',
  $$ SELECT public.cleanup_expired_price_records(); $$
);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE public.cron_config IS 'Configuration key-value store for pg_cron tasks (app URL, secrets, etc.)';
COMMENT ON FUNCTION public.trigger_reputation_fetch() IS
  'Triggers oracle price fetching by calling the Next.js API via pg_net. Reads config from cron_config table.';
COMMENT ON FUNCTION public.recalculate_all_reputations() IS
  'Re-aggregates reputation scores for all providers from the last 7 days of history. Runs entirely in SQL.';
