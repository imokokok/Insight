-- Migration 0045: reliable free-tier scheduler control plane
--
-- Supabase owns the clock; GitHub Actions owns the expensive work. pg_cron
-- calls this small dispatcher through pg_net, using a repository-scoped token
-- stored in Vault. No Vercel function is invoked.
--
-- The migration is safe to apply before the Vault secret exists: it creates
-- the control plane but only enables schedules when
-- `github_workflow_dispatch_token` is present. See docs/operations/cron-dispatcher.md.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cron_dispatch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_file text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'supabase_cron'
    CHECK (source IN ('supabase_cron', 'github_fallback', 'manual')),
  status text NOT NULL DEFAULT 'dispatching'
    CHECK (status IN ('dispatching', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out')),
  request_id bigint,
  github_run_id bigint,
  github_run_url text,
  conclusion text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cron_dispatch_runs_slot_uq UNIQUE (workflow_file, scheduled_for, source)
);

CREATE INDEX IF NOT EXISTS cron_dispatch_runs_workflow_created_idx
  ON public.cron_dispatch_runs (workflow_file, created_at DESC);
CREATE INDEX IF NOT EXISTS cron_dispatch_runs_open_idx
  ON public.cron_dispatch_runs (created_at)
  WHERE status IN ('dispatching', 'running');

ALTER TABLE public.cron_dispatch_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cron_dispatch_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cron_dispatch_runs TO service_role;

COMMENT ON TABLE public.cron_dispatch_runs IS
  'End-to-end ledger for Supabase-dispatched and GitHub-fallback scheduled workflows. Retained for 30 days.';

CREATE OR REPLACE FUNCTION public.touch_cron_dispatch_run()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cron_dispatch_runs_touch_updated_at ON public.cron_dispatch_runs;
CREATE TRIGGER cron_dispatch_runs_touch_updated_at
BEFORE UPDATE ON public.cron_dispatch_runs
FOR EACH ROW EXECUTE FUNCTION public.touch_cron_dispatch_run();

-- One dispatch per workflow/minute/source. This makes a repeated SQL call in
-- the same cron slot idempotent while still permitting an explicit fallback.
CREATE OR REPLACE FUNCTION public.dispatch_github_workflow(
  p_workflow_file text,
  p_ref text DEFAULT 'main'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_allowed constant text[] := ARRAY[
    'snapshot-collect.yml',
    'oracle-watch-collect.yml',
    'reputation-cron.yml',
    'safety-outcome-cron.yml',
    'feed-cadence-cron.yml',
    'daily-report-publish-cron.yml'
  ];
  v_token text;
  v_dispatch_id uuid;
  v_request_id bigint;
  v_slot timestamptz := date_trunc('minute', clock_timestamp());
BEGIN
  IF NOT (p_workflow_file = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Workflow is not in the dispatcher allowlist: %', p_workflow_file;
  END IF;

  SELECT decrypted_secret
  INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'github_workflow_dispatch_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 20 THEN
    RAISE EXCEPTION
      'Vault secret github_workflow_dispatch_token is missing or invalid; dispatcher remains fail-closed';
  END IF;

  INSERT INTO public.cron_dispatch_runs (workflow_file, scheduled_for, source, status)
  VALUES (p_workflow_file, v_slot, 'supabase_cron', 'dispatching')
  ON CONFLICT (workflow_file, scheduled_for, source) DO NOTHING
  RETURNING id INTO v_dispatch_id;

  -- The slot was already dispatched. Return its id without sending a duplicate.
  IF v_dispatch_id IS NULL THEN
    SELECT id INTO v_dispatch_id
    FROM public.cron_dispatch_runs
    WHERE workflow_file = p_workflow_file
      AND scheduled_for = v_slot
      AND source = 'supabase_cron';
    RETURN v_dispatch_id;
  END IF;

  SELECT net.http_post(
    url := 'https://api.github.com/repos/imokokok/Insight/actions/workflows/'
      || p_workflow_file || '/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || v_token,
      'Content-Type', 'application/json',
      'User-Agent', 'insight-supabase-cron',
      'X-GitHub-Api-Version', '2026-03-10'
    ),
    body := jsonb_build_object(
      'ref', p_ref,
      'inputs', jsonb_build_object(
        'dispatch_id', v_dispatch_id::text,
        'scheduled_for', v_slot::text
      )
    ),
    timeout_milliseconds := 5000
  ) INTO v_request_id;

  UPDATE public.cron_dispatch_runs
  SET request_id = v_request_id
  WHERE id = v_dispatch_id;

  RETURN v_dispatch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_github_workflow(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_github_workflow(text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.disable_github_workflow_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job_name text;
BEGIN
  FOREACH v_job_name IN ARRAY ARRAY[
    'github-dispatch-snapshot-collect',
    'github-dispatch-oracle-watch',
    'github-dispatch-reputation',
    'github-dispatch-safety-outcome',
    'github-dispatch-feed-cadence',
    'github-dispatch-daily-report',
    'github-dispatch-mark-stale',
    'github-dispatch-ledger-cleanup'
  ]
  LOOP
    PERFORM cron.unschedule(v_job_name)
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job_name);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.enable_github_workflow_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'github_workflow_dispatch_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 20 THEN
    RAISE EXCEPTION
      'Create Vault secret github_workflow_dispatch_token before enabling the dispatcher';
  END IF;

  PERFORM public.disable_github_workflow_dispatcher();

  -- Heavy jobs are deliberately staggered. Each database job only queues one
  -- small HTTP request and normally completes in milliseconds.
  PERFORM cron.schedule(
    'github-dispatch-snapshot-collect', '*/15 * * * *',
    $command$SELECT public.dispatch_github_workflow('snapshot-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-oracle-watch', '8,38 * * * *',
    $command$SELECT public.dispatch_github_workflow('oracle-watch-collect.yml');$command$
  );
  PERFORM cron.schedule(
    'github-dispatch-reputation', '12 * * * *',
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
$$;

REVOKE ALL ON FUNCTION public.enable_github_workflow_dispatcher()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.disable_github_workflow_dispatcher()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enable_github_workflow_dispatcher() TO service_role;
GRANT EXECUTE ON FUNCTION public.disable_github_workflow_dispatcher() TO service_role;

-- Existing projects may create the Vault secret before applying this migration.
-- New projects remain safely disabled until the operator completes the setup.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'github_workflow_dispatch_token'
      AND length(decrypted_secret) >= 20
  ) THEN
    PERFORM public.enable_github_workflow_dispatcher();
  ELSE
    RAISE NOTICE
      'GitHub dispatcher created but disabled: add Vault secret github_workflow_dispatch_token, then call public.enable_github_workflow_dispatcher()';
  END IF;
END;
$$;

COMMIT;
