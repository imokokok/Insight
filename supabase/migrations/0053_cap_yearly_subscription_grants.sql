-- A 365-day yearly period normally touches thirteen calendar months: the
-- activation month plus twelve later YYYY-MM values. Keep the established
-- metering-key format (partner/audit compatibility), but cap each yearly
-- subscription row at the promised twelve monthly allowances.

CREATE OR REPLACE FUNCTION public.add_monthly_credits()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_grant numeric;
  v_key text;
  v_prefix text;
  v_ref text;
  v_yearly_grants integer;
BEGIN
  FOR r IN
    SELECT s.id, s.user_id, s.plan, s.interval
      FROM public.subscriptions s
     WHERE s.status = 'active'
       AND s.current_period_end >= now()
  LOOP
    v_grant := CASE r.plan
      WHEN 'developer' THEN 60000
      WHEN 'team'      THEN 300000
      WHEN 'scale'     THEN 1000000
      ELSE 0 END;

    IF v_grant > 0 THEN
      v_prefix := 'grant:' || r.user_id || ':sub:' || r.id;
      IF r.interval = 'year' THEN
        v_key := v_prefix || ':' || to_char(now(), 'YYYY-MM');
        v_ref := r.plan || ' monthly allowance';
        SELECT count(*)::integer
          INTO v_yearly_grants
          FROM public.credit_ledger
         WHERE kind = 'grant'
           AND metering_key LIKE v_prefix || ':%';
      ELSE
        v_key := v_prefix;
        v_ref := r.plan || ' cycle allowance';
        v_yearly_grants := 0;
      END IF;

      IF (r.interval <> 'year' OR v_yearly_grants < 12)
         AND NOT EXISTS (
           SELECT 1 FROM public.credit_ledger WHERE metering_key = v_key
         ) THEN
        PERFORM public.top_up_credits(r.user_id, v_grant, v_key, 'grant', v_ref);
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.add_monthly_credits() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.add_monthly_credits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_monthly_credits() TO service_role;

COMMENT ON FUNCTION public.add_monthly_credits() IS
  'Cron: grant active Developer 60K, Team 300K, or Scale 1M credits. Monthly subscriptions receive one grant per row; yearly subscriptions retain YYYY-MM audit keys and are capped at twelve grants per paid period.';
