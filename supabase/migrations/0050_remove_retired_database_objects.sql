-- 0050: Remove database objects whose owning features were retired.
--
-- Migration 0043 moved reputation and feed-cadence scheduling from pg_net to
-- GitHub Actions. The old trigger functions and their cron_config input table
-- have had no caller since that cutover; the standalone reputation sweep also
-- duplicated aggregation already performed by the current workflow.
--
-- The saved-price-snapshot feature was removed in full before the current
-- baseline migrations were imported, but its table was accidentally retained.
-- The two Protocol-tier webhook tables were schema-only reservations and never
-- had a delivery implementation; billing v2 later removed feature-tier gates.

BEGIN;

DROP FUNCTION IF EXISTS public.trigger_reputation_fetch();
DROP FUNCTION IF EXISTS public.trigger_feed_cadence_backfill();
DROP FUNCTION IF EXISTS public.recalculate_all_reputations();

DROP TABLE IF EXISTS public.cron_config;
DROP TABLE IF EXISTS public.user_snapshots;
DROP TABLE IF EXISTS public.webhook_deliveries;
DROP TABLE IF EXISTS public.webhook_subscriptions;

COMMIT;
