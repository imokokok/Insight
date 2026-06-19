-- 014_cleanup_obsolete_objects.sql
-- Clean up leftover functions and cron jobs for tables/features that were removed:
--   - api_keys / api_key_usage / rate_limits (Developer API feature)
--   - attack_alerts (attack detection persistence)
--   - notification_settings column cleanup is handled in 013_drop_notification_settings.sql

-- Unschedule cron jobs that reference dropped tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'api-keys-deactivation') THEN
        PERFORM cron.unschedule('api-keys-deactivation');
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limits-cleanup') THEN
        PERFORM cron.unschedule('rate-limits-cleanup');
    END IF;
END
$$;

-- Drop functions that reference dropped tables (safe to re-run)
DROP FUNCTION IF EXISTS public.deactivate_expired_api_keys() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_rate_limits() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_attack_alerts() CASCADE;
