-- 0061: Close browser-write privilege gaps left by the initial broad grants.
--
-- Migration 0006 granted anon/authenticated ALL privileges on every future
-- public object. RLS still protects tables with complete policies, but later
-- internal tables were created without RLS and the api_keys write policies
-- only checked ownership, allowing a user to change privileged columns such
-- as plan and rate_limit. Keep browser access explicitly least-privileged and
-- make service-role-only the default for future public objects.

BEGIN;

-- Future tables, sequences and functions must not silently become part of the
-- public Data API. Individual browser-facing objects can opt back in with an
-- explicit grant and an RLS policy in the migration that creates them.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
-- PostgreSQL's built-in function default grants EXECUTE to PUBLIC globally.
-- A schema-scoped REVOKE cannot override that global default, so revoke it at
-- the owner level and separately remove the legacy schema grants to API roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- API keys are created and managed by authenticated server routes using the
-- service role. Removing both the grants and the legacy policies prevents a
-- caller from setting plan=enterprise, rate_limit=-1, or another server-owned
-- field through PostgREST. Dropping the policies also keeps a later accidental
-- grant from reopening the same escalation path.
DROP POLICY IF EXISTS "Users can create own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.api_keys TO service_role;

-- Credit-purchase writes are payment-state transitions and must only be made
-- by checkout/webhook server code. Authenticated users retain read-only access
-- to their own rows for reconciliation; anon receives no access.
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_purchases_own_read ON public.credit_purchases;
CREATE POLICY credit_purchases_own_read ON public.credit_purchases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.credit_purchases FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.credit_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_purchases TO service_role;

-- Reject newly inserted nonsensical purchase values without making deployment
-- depend on the state of historical rows. Application settlement additionally
-- validates the row against the configured pack and the signed provider price.
ALTER TABLE public.credit_purchases
  DROP CONSTRAINT IF EXISTS credit_purchases_credits_positive;
ALTER TABLE public.credit_purchases
  ADD CONSTRAINT credit_purchases_credits_positive CHECK (credits > 0) NOT VALID;
ALTER TABLE public.credit_purchases
  DROP CONSTRAINT IF EXISTS credit_purchases_price_positive;
ALTER TABLE public.credit_purchases
  ADD CONSTRAINT credit_purchases_price_positive CHECK (price_usd > 0) NOT VALID;

-- Fine-grained collector snapshots are internal evidence, consumed only by
-- service-role API/cron code. They should not be directly readable or mutable
-- with the public Supabase keys.
ALTER TABLE public.feed_health_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feed_health_snapshots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.feed_health_snapshots_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feed_health_snapshots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.feed_health_snapshots_id_seq TO service_role;

ALTER TABLE public.market_reference_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.market_reference_snapshots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.market_reference_snapshots_id_seq
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_reference_snapshots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.market_reference_snapshots_id_seq TO service_role;

COMMIT;
