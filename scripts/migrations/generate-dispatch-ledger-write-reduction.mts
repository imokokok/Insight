import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// A primary dispatch used to insert a ledger row and immediately update it
// only to retain pg_net's opaque request id. That id has no consumer, while
// the update creates an avoidable MVCC tuple. Keep the durable idempotency row
// and let the runner record its useful terminal metadata in one update.
const migrationSql = String.raw`-- Eliminate the non-actionable request-id update from every primary dispatch.
--
-- The row is inserted before the outbound request, preserving the idempotency
-- slot and fail-closed behaviour. GitHub records run metadata and terminal
-- status once at completion; request_id remains nullable for compatibility.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.dispatch_github_workflow(
  p_workflow_file text,
  p_ref text DEFAULT 'main'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_allowed constant text[] := ARRAY[
    'snapshot-collect.yml',
    'oracle-watch-collect.yml',
    'reputation-cron.yml',
    'safety-outcome-cron.yml',
    'feed-cadence-cron.yml',
    'daily-report-publish-cron.yml',
    'coverage-slo.yml',
    'monad-dex-market.yml'
  ];
  v_token text;
  v_dispatch_id uuid;
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

  IF v_dispatch_id IS NULL THEN
    SELECT id INTO v_dispatch_id
    FROM public.cron_dispatch_runs
    WHERE workflow_file = p_workflow_file
      AND scheduled_for = v_slot
      AND source = 'supabase_cron';
    RETURN v_dispatch_id;
  END IF;

  PERFORM net.http_post(
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
  );

  RETURN v_dispatch_id;
END;
$function$;

COMMENT ON COLUMN public.cron_dispatch_runs.request_id IS
  'Legacy pg_net request id. New primary dispatches intentionally leave it null to avoid a non-actionable row update.';

REVOKE ALL ON FUNCTION public.dispatch_github_workflow(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_github_workflow(text, text)
  TO service_role;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0108_dispatch_ledger_write_reduction.sql', repositoryRoot)
);
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const check = args.has('--check');

if (write === check || [...args].some((arg) => arg !== '--write' && arg !== '--check')) {
  throw new Error('Use exactly one supported option: --write or --check');
}

if (write) {
  await writeFile(outputPath, migrationSql, 'utf8');
} else {
  const current = await readFile(outputPath, 'utf8');
  if (current !== migrationSql) {
    throw new Error(
      '0108_dispatch_ledger_write_reduction.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
