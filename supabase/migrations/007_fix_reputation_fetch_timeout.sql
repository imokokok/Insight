-- ============================================
-- 007_fix_reputation_fetch_timeout.sql
-- Route Supabase hourly fetches through the dedicated cron endpoint
-- and wait long enough for the full reputation calculation to finish.
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_reputation_fetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app_url TEXT;
  v_cron_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT value INTO v_app_url FROM public.cron_config WHERE key = 'next_public_app_url';
  SELECT value INTO v_cron_secret FROM public.cron_config WHERE key = 'cron_secret';

  IF v_app_url IS NULL OR v_app_url = '' THEN
    RAISE NOTICE 'next_public_app_url not configured in cron_config, skipping fetch';
    RETURN;
  END IF;

  SELECT INTO v_request_id net.http_get(
    url := v_app_url || '/api/cron/reputation',
    headers := jsonb_build_object(
      'Authorization', CASE
        WHEN v_cron_secret IS NOT NULL AND v_cron_secret != ''
        THEN 'Bearer ' || v_cron_secret
        ELSE ''
      END
    ),
    timeout_milliseconds := 60000
  );

  RAISE NOTICE 'Reputation fetch triggered via pg_net, request_id: %', v_request_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_reputation_fetch() IS
  'Triggers oracle price fetching by calling the dedicated cron API via pg_net with a 60s timeout.';
