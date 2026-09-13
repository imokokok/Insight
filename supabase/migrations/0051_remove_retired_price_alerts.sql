-- 0051: Remove the retired price-alert shell.
--
-- The current application has no alert evaluator, notification delivery,
-- event writer, frontend, SDK, MCP tool, or documented public endpoint. The
-- only remaining route could store configurations that were never acted on.

BEGIN;

-- Preserve the dormant user configuration as a service-role-only recovery
-- record before removing the non-functional product tables. This is tiny (one
-- JSON row per retired alert) and prevents an irreversible migration surprise.
CREATE TABLE IF NOT EXISTS public.retired_price_alerts_archive (
  id uuid PRIMARY KEY,
  archived_at timestamptz NOT NULL DEFAULT now(),
  alert jsonb NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.retired_price_alerts_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.retired_price_alerts_archive FROM anon, authenticated;
GRANT SELECT ON TABLE public.retired_price_alerts_archive TO service_role;

INSERT INTO public.retired_price_alerts_archive (id, alert, events)
SELECT
  pa.id,
  to_jsonb(pa),
  COALESCE(
    jsonb_agg(to_jsonb(ae)) FILTER (WHERE ae.id IS NOT NULL),
    '[]'::jsonb
  )
FROM public.price_alerts pa
LEFT JOIN public.alert_events ae ON ae.alert_id = pa.id
GROUP BY pa.id
ON CONFLICT (id) DO NOTHING;

DROP VIEW IF EXISTS public.active_alerts_with_prices;
DROP TABLE IF EXISTS public.alert_events;
DROP TABLE IF EXISTS public.price_alerts;

COMMIT;
