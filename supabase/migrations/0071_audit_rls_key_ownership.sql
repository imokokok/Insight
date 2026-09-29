-- Keep API keys private while allowing authenticated users to read audit rows
-- issued under their own keys. Migration 0061 revoked direct API-key reads, so
-- the earlier audit policies' subqueries now fail with a permission error.
BEGIN;
SET LOCAL lock_timeout = '2s';

-- This schema is not exposed by PostgREST. The helper returns only whether the
-- current JWT subject owns one key; it never returns key material or other rows.
CREATE SCHEMA IF NOT EXISTS insight_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA insight_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA insight_private TO authenticated;

CREATE OR REPLACE FUNCTION insight_private.owns_api_key(p_api_key_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p_api_key_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.api_keys AS key
      WHERE key.id = p_api_key_id AND key.user_id = auth.uid()
    );
$$;
ALTER FUNCTION insight_private.owns_api_key(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION insight_private.owns_api_key(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION insight_private.owns_api_key(uuid) TO authenticated;

-- The original default privileges gave both browser roles ALL on these tables.
-- Keep reads for signed-in owners, and leave unattributed operational rows
-- inaccessible to browser roles.
REVOKE ALL ON TABLE public.pre_trade_checks, public.execution_receipts,
  public.oracle_watch_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pre_trade_checks, public.execution_receipts,
  public.oracle_watch_checks TO authenticated;

DROP POLICY IF EXISTS users_view_own_pre_trade_checks ON public.pre_trade_checks;
CREATE POLICY users_view_own_pre_trade_checks ON public.pre_trade_checks
  FOR SELECT TO authenticated
  USING (insight_private.owns_api_key(api_key_id));

DROP POLICY IF EXISTS users_view_own_execution_receipts ON public.execution_receipts;
CREATE POLICY users_view_own_execution_receipts ON public.execution_receipts
  FOR SELECT TO authenticated
  USING (insight_private.owns_api_key(api_key_id));

DROP POLICY IF EXISTS users_view_own_oracle_watch_checks ON public.oracle_watch_checks;
CREATE POLICY users_view_own_oracle_watch_checks ON public.oracle_watch_checks
  FOR SELECT TO authenticated
  USING (insight_private.owns_api_key(api_key_id));

COMMIT;
