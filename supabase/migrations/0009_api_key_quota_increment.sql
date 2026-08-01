-- Atomic quota increment function for api_keys.
-- Avoids the read-modify-write race in incrementApiKeyQuota()
-- by using a single SQL UPDATE with monthly_quota_used = monthly_quota_used + 1.

CREATE OR REPLACE FUNCTION "public"."increment_api_key_quota"("key_id" uuid) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE public.api_keys
  SET monthly_quota_used = monthly_quota_used + 1
  WHERE id = key_id;
$$;


ALTER FUNCTION "public"."increment_api_key_quota"("key_id" uuid) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_api_key_quota"("key_id" uuid) IS 'Atomically increment monthly_quota_used by 1 for the given API key. Called from the quota middleware after a successful request.';
