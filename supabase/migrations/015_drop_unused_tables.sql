-- 015_drop_unused_tables.sql
-- Drop tables that were created by earlier migrations but are no longer used by the application.
-- These are idempotent drops (IF EXISTS) so they are safe to re-run.

DROP TABLE IF EXISTS public.user_favorites CASCADE;
DROP TABLE IF EXISTS public.api_key_usage CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- api_keys is also unused, but it has dependent objects and is dropped separately
-- after its cleanup cron job and functions are removed (see 014_cleanup_obsolete_objects.sql).
DROP TABLE IF EXISTS public.api_keys CASCADE;
