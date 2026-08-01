-- Cron jobs and initial seed data

-- Schedule cron jobs (idempotent: unschedule first to avoid duplicates)
SELECT cron.unschedule('price-records-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-records-cleanup');
SELECT cron.unschedule('reputation-fetch-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-fetch-hourly');
SELECT cron.unschedule('reputation-history-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-history-cleanup');
SELECT cron.unschedule('reputation-recalculate-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-recalculate-hourly');
SELECT cron.unschedule('api-keys-deactivation') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-keys-deactivation');
SELECT cron.unschedule('rate-limits-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limits-cleanup');
SELECT cron.unschedule('api-key-usage-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-key-usage-cleanup');

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
SELECT cron.schedule('api-keys-deactivation', '0 * * * *', $$
  SELECT public.deactivate_expired_api_keys();
  $$);
SELECT cron.schedule('rate-limits-cleanup', '*/15 * * * *', $$
  SELECT public.cleanup_rate_limits();
  $$);
SELECT cron.schedule('api-key-usage-cleanup', '30 3 * * *', $$
  SELECT public.cleanup_api_key_usage();
  $$);

-- Seed cron_config (cron_secret must be set manually or via app)
INSERT INTO public.cron_config (key, value) VALUES
    ('next_public_app_url', 'https://www.oracleinsight.xyz')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
-- NOTE: cron_secret should be set via the application or manually:
-- INSERT INTO public.cron_config (key, value) VALUES ('cron_secret', '<your-secret>')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
