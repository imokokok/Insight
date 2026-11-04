-- The guarded GitHub fallback runs frequently while its Supabase primary is
-- healthy. Its lookup needs only the newest completed primary dispatch for one
-- workflow, so keep it off a growing ledger-wide scan and sort.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX IF NOT EXISTS cron_dispatch_runs_fallback_guard_idx
  ON public.cron_dispatch_runs (workflow_file, completed_at DESC)
  WHERE source = 'supabase_cron'
    AND status = 'succeeded'
    AND completed_at IS NOT NULL;

COMMIT;
