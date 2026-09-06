-- 0049: Close the remaining Supabase Security Advisor findings without
-- changing the application's server-side data paths.
--
-- Every object restricted below is consumed through createServiceRoleClient()
-- or by a database-owned trigger/cron job. Browser clients do not call these
-- RPCs or query these internal views/tables directly.

BEGIN;

-- Views owned by postgres otherwise evaluate with the owner's privileges and
-- can bypass RLS on their source tables. Evaluate them as the caller instead.
ALTER VIEW public.active_alerts_with_prices SET (security_invoker = true);
ALTER VIEW public.market_reference_hourly SET (security_invoker = true);

-- Neither view is part of the browser-facing data contract. Keep PostgREST
-- access limited to the service role used by the server API.
REVOKE ALL ON TABLE public.active_alerts_with_prices FROM anon, authenticated;
REVOKE ALL ON TABLE public.market_reference_hourly FROM anon, authenticated;
GRANT SELECT ON TABLE public.active_alerts_with_prices TO service_role;
GRANT SELECT ON TABLE public.market_reference_hourly TO service_role;

-- Fine-grained snapshots are written by the authenticated collector and read
-- by server API/cron code, all with the service role. RLS plus explicit grants
-- prevents a leaked browser anon key from scraping or mutating this dataset.
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.price_snapshots FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.price_snapshots_id_seq FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_snapshots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.price_snapshots_id_seq TO service_role;

-- SECURITY DEFINER functions run with the postgres owner's privileges. Remove
-- PostgreSQL's default PUBLIC execute permission (as well as any legacy grants)
-- and keep execution available only to the application's service role. Trigger
-- and pg_cron execution is unaffected because those run as the function owner.
DO $security_definer_grants$
DECLARE
  function_oid regprocedure;
BEGIN
  FOR function_oid IN
    SELECT p.oid::regprocedure
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname = ANY (ARRAY[
        'add_monthly_credits',
        'aggregate_oracle_reputation_v4',
        'batch_update_feed_health',
        'cleanup_api_key_usage',
        'cleanup_expired_price_records',
        'cleanup_incomplete_subscriptions',
        'cleanup_old_reputation_history',
        'cleanup_rate_limits',
        'consume_credits',
        'deactivate_expired_api_keys',
        'downgrade_expired_subscriptions',
        'ensure_credit_wallet',
        'handle_new_user',
        'increment_feed_failures',
        'increment_rate_limit',
        'precheck_credits',
        'recalculate_all_reputations',
        'top_up_credits',
        'trigger_feed_cadence_backfill',
        'trigger_reputation_fetch'
      ])
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_oid
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_oid
    );
  END LOOP;
END;
$security_definer_grants$;

-- Pin the name-resolution path for every function reported by the advisor.
-- `public` preserves the existing unqualified references; `pg_temp` last
-- prevents an attacker-controlled temporary object from shadowing them.
DO $function_search_paths$
DECLARE
  function_oid regprocedure;
BEGIN
  FOR function_oid IN
    SELECT p.oid::regprocedure
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'aggregate_oracle_reputation_v4',
        'batch_update_feed_health',
        'cleanup_api_key_usage',
        'cleanup_expired_price_records',
        'cleanup_incomplete_subscriptions',
        'cleanup_old_reputation_history',
        'cleanup_rate_limits',
        'deactivate_expired_api_keys',
        'downgrade_expired_subscriptions',
        'handle_new_user',
        'handle_processed_webhook_events_updated_at',
        'handle_subscriptions_updated_at',
        'increment_feed_failures',
        'increment_rate_limit',
        'recalculate_all_reputations',
        'trigger_feed_cadence_backfill',
        'trigger_reputation_fetch',
        'update_oracle_feeds_updated_at',
        'update_updated_at_column'
      ])
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path TO public, pg_temp',
      function_oid
    );
  END LOOP;
END;
$function_search_paths$;

COMMIT;
