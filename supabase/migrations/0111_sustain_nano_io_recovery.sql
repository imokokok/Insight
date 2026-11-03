-- Remove the remaining free-tier I/O amplification found in the October 2026
-- production incident review.  This release deliberately changes no paid
-- Supabase setting: it only prevents periodic write collisions and makes RLS
-- predicates statement-stable.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- The old :22/:52 slots started three independent jobs at once: price-record
-- expiry cleanup, Coverage SLO dispatch, and Monad DEX dispatch.  Preserve
-- every workflow's cadence and freshness bound, but give each disk/connection
-- burst its own slot.  Keeping the definition here also prevents a future
-- dispatcher re-enable from restoring the collision.
CREATE OR REPLACE FUNCTION public.enable_github_workflow_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'github_workflow_dispatch_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 20 THEN
    RAISE EXCEPTION 'Create Vault secret github_workflow_dispatch_token before enabling the dispatcher';
  END IF;

  PERFORM public.disable_github_workflow_dispatcher();

  PERFORM cron.schedule(
    'github-dispatch-snapshot-collect', '*/15 * * * *',
    $command$SELECT public.dispatch_github_workflow('snapshot-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-oracle-watch', '8 * * * *',
    $command$SELECT public.dispatch_github_workflow('oracle-watch-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-reputation', '12 */2 * * *',
    $command$SELECT public.dispatch_github_workflow('reputation-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-safety-outcome', '25 */2 * * *',
    $command$SELECT public.dispatch_github_workflow('safety-outcome-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-feed-cadence', '23 2 * * *',
    $command$SELECT public.dispatch_github_workflow('feed-cadence-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-daily-report', '10 0 * * *',
    $command$SELECT public.dispatch_github_workflow('daily-report-publish-cron.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-coverage-slo', '9,24,39,54 * * * *',
    $command$SELECT public.dispatch_github_workflow('coverage-slo.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-monad-dex-market', '2,12,22,32,42,52 * * * *',
    $command$SELECT public.dispatch_github_workflow('monad-dex-market.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-mark-stale', '6,16,26,36,46,56 * * * *',
    $command$
      UPDATE public.cron_dispatch_runs
      SET status = 'timed_out', completed_at = now(), conclusion = 'no GitHub completion callback'
      WHERE status IN ('dispatching', 'running')
        AND created_at < now() - interval '20 minutes';
    $command$
  );
  PERFORM cron.schedule(
    'github-dispatch-ledger-cleanup', '50 4 * * *',
    $command$
      DELETE FROM public.cron_dispatch_runs
      WHERE created_at < now() - interval '30 days';
    $command$
  );
END;
$function$;

SELECT cron.unschedule('price-records-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-records-cleanup');
SELECT cron.schedule('price-records-cleanup', '19,49 * * * *',
  'SELECT public.cleanup_expired_price_records()');

-- Re-register only when the stored dispatch credential exists.  This matches
-- the fail-closed activation semantics of migration 0110.
DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'github_workflow_dispatch_token'
      AND length(decrypted_secret) >= 20
  ) THEN
    PERFORM public.enable_github_workflow_dispatcher();
  ELSE
    RAISE NOTICE 'Dispatcher collision avoidance deferred: github_workflow_dispatch_token is unavailable';
  END IF;
END;
$block$;

-- Equivalent init-plan predicates are evaluated once per query rather than
-- once per candidate row.  They preserve the existing authenticated-user
-- ownership checks exactly while lowering CPU/cache pressure on reads.
ALTER POLICY credit_purchases_own_read ON public.credit_purchases
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY credit_ledger_own ON public.credit_ledger
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY credit_wallet_own ON public.credit_wallet
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY subscriptions_select_own ON public.subscriptions
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can view own profile" ON public.user_profiles
  USING ((SELECT auth.uid()) = id);
ALTER POLICY "Users can update own profile" ON public.user_profiles
  USING ((SELECT auth.uid()) = id);
ALTER POLICY "Users can insert own profile" ON public.user_profiles
  WITH CHECK ((SELECT auth.uid()) = id);

-- service_role has BYPASSRLS and existing DML grants on these internal tables.
-- These policies can therefore never authorize an ordinary user, yet they add
-- redundant permissive-policy evaluation and trigger advisor findings.
DROP POLICY IF EXISTS "Service role manages usage" ON public.api_key_usage;
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role manages protocol_asset_risk_params"
  ON public.protocol_asset_risk_params;
DROP POLICY IF EXISTS "Service role manages protocol_metrics"
  ON public.protocol_metrics;

COMMIT;
