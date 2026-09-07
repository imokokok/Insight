-- 0051: Remove the retired price-alert shell.
--
-- The current application has no alert evaluator, notification delivery,
-- event writer, frontend, SDK, MCP tool, or documented public endpoint. The
-- only remaining route could store configurations that were never acted on.

BEGIN;

DROP VIEW IF EXISTS public.active_alerts_with_prices;
DROP TABLE IF EXISTS public.alert_events;
DROP TABLE IF EXISTS public.price_alerts;

COMMIT;
