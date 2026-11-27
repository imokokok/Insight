-- Harden database defaults and trim redundant Turso raw snapshot writes.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Keep every 15-minute materialized sample for BTC, ETH, SOL and the three
-- principal stablecoins. Other major and wrapped assets keep hourly baselines
-- plus the existing adaptive price/deviation/age/confidence change triggers.
-- Wrapped assets use a tighter 5 bp threshold so small peg/basis moves remain
-- visible. The snapshot collector and current-price table still receive every
-- collection slot; this only avoids inserting stable repeats into the raw
-- analytics table.
UPDATE public.price_snapshot_persistence_policies
SET resolution = 'adaptive',
    price_change_bps = CASE
      WHEN policy_key IN ('CBBTC', 'CBETH', 'STETH', 'TBTC', 'WBTC', 'WSTETH') THEN 5
      ELSE 25
    END,
    deviation_change_bps = CASE
      WHEN policy_key IN ('CBBTC', 'CBETH', 'STETH', 'TBTC', 'WBTC', 'WSTETH') THEN 5
      ELSE 10
    END,
    data_age_change_seconds = 300,
    confidence_change = 0.0500,
    updated_at = now()
WHERE policy_key IN (
  'ADA', 'BNB', 'CBBTC', 'CBETH', 'DOGE', 'LINK',
  'STETH', 'TBTC', 'WBTC', 'WSTETH', 'XRP'
);

-- These functions already schema-qualify their table references. Pinning the
-- path also prevents a caller-created schema or temporary object from taking
-- precedence when a privileged function runs.
ALTER FUNCTION public.cleanup_expired_price_records()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_product_window_cap()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_product_lifecycle_cap()
  SET search_path = public, pg_temp;

-- Evaluate auth.uid() once per statement rather than once per RLS row.
ALTER POLICY users_view_own_oracle_watch_windows
  ON public.oracle_watch_windows
  USING (
    api_key_id IS NOT NULL
    AND api_key_id IN (
      SELECT api_keys.id
      FROM public.api_keys
      WHERE api_keys.user_id = (SELECT auth.uid())
    )
  );
ALTER POLICY users_view_own_position_lifecycles
  ON public.position_lifecycles
  USING (
    api_key_id IS NOT NULL
    AND api_key_id IN (
      SELECT api_keys.id
      FROM public.api_keys
      WHERE api_keys.user_id = (SELECT auth.uid())
    )
  );

-- These internal tables intentionally have no client RLS policies. Remove the
-- inherited Data API grants so callers are denied before row-policy checks;
-- preserve the explicit server-side service_role path.
REVOKE ALL ON TABLE
  public.api_key_usage,
  public.processed_webhook_events,
  public.rate_limits
FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE
  public.api_key_usage,
  public.processed_webhook_events,
  public.rate_limits
TO service_role;

-- HypoPG is an admin-only planning helper and is relocatable. Keep it outside
-- the exposed public schema and revoke execution from client-facing roles.
ALTER EXTENSION hypopg SET SCHEMA extensions;
DO $block$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'extensions'
      AND p.proname LIKE 'hypopg_%'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );
  END LOOP;
END;
$block$;

COMMIT;
