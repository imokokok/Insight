-- Single-query RPC for counting today's API calls to a specific endpoint
-- across all API keys owned by a user. Replaces the previous two-round-trip
-- pattern (SELECT api_keys + IN query) with one indexed join.

CREATE OR REPLACE FUNCTION public.get_daily_endpoint_usage(
  p_user_id uuid,
  p_endpoint text
) RETURNS integer
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM public.api_key_usage u
  INNER JOIN public.api_keys k ON k.id = u.api_key_id
  WHERE k.user_id = p_user_id
    AND u.endpoint = p_endpoint
    AND u.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
$$;

ALTER FUNCTION public.get_daily_endpoint_usage(uuid, text) OWNER TO "postgres";

COMMENT ON FUNCTION public.get_daily_endpoint_usage(uuid, text) IS
  'Returns the number of api_key_usage rows for a given user/endpoint since UTC midnight.';
