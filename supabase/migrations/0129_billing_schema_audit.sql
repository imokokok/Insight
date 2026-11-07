-- ============================================================================
-- 0129 — read-only billing schema audit for the A04 pre-release check.
--
-- The release checklist needs one command that proves the production database
-- and the checked-out code are the same era before a promotion: applied
-- migrations, the credit ledger baseline, the seven billing function
-- signatures, the two credit_ledger CHECK value sets, and the pending
-- settlement table.
--
-- PostgREST exposes only `public`, so these facts cannot be read directly
-- through the service-role REST client. This function returns them as JSON for
-- `scripts/verify-billing-a04.mts`, which fails loudly on the first mismatch.
--
-- Read-only by construction: it only selects from the ledger, the pending
-- settlement table, and catalogs. It never touches the wallet.
--
-- SECURITY DEFINER is required to read `supabase_migrations.schema_migrations`;
-- execution is service-role only, so no browser or anon caller can inspect the
-- migration ledger.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION "public"."billing_schema_audit"()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT jsonb_build_object(
    'migrations',
    COALESCE((
      SELECT jsonb_agg(m."version" ORDER BY m."version")
        FROM "supabase_migrations"."schema_migrations" m
       WHERE m."version" ~ '^[0-9]{4}$'
    ), '[]'::jsonb),
    'ledgerRows',
    (SELECT count(*) FROM "public"."credit_ledger"),
    'ledgerMaxId',
    (SELECT max("id") FROM "public"."credit_ledger"),
    'functions',
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', p."proname",
        'args', pg_catalog.pg_get_function_identity_arguments(p."oid"),
        'result', pg_catalog.pg_get_function_result(p."oid")
      ) ORDER BY p."proname", pg_catalog.pg_get_function_identity_arguments(p."oid"))
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n."oid" = p."pronamespace"
       WHERE n."nspname" = 'public'
         AND p."proname" IN (
           'add_monthly_credits',
           'consume_credits',
           'top_up_credits',
           'precheck_credits',
           'record_pending_settlement',
           'settle_pending_credits',
           'record_waived_credit'
         )
    ), '[]'::jsonb),
    'constraints',
    COALESCE((
      SELECT jsonb_object_agg(c."conname", pg_catalog.pg_get_constraintdef(c."oid"))
        FROM pg_catalog.pg_constraint c
       WHERE c."conrelid" = 'public.credit_ledger'::regclass
         AND c."conname" IN (
           'credit_ledger_source_check',
           'credit_ledger_kind_check'
         )
    ), '{}'::jsonb),
    'pendingTable',
    to_regclass('public.credit_pending_settlements') IS NOT NULL,
    'pendingRows',
    CASE
      WHEN to_regclass('public.credit_pending_settlements') IS NULL THEN NULL
      ELSE (
        SELECT count(*)
          FROM "public"."credit_pending_settlements"
         WHERE "status" = 'pending'
      )
    END
  );
$$;

ALTER FUNCTION "public"."billing_schema_audit"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."billing_schema_audit"() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."billing_schema_audit"() TO service_role;

COMMENT ON FUNCTION "public"."billing_schema_audit"() IS
  'Read-only snapshot of applied billing migrations, ledger baseline, function signatures, credit_ledger CHECK values and pending settlements. Service-role only; used by scripts/verify-billing-a04.mts.';

COMMIT;
