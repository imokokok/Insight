import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const migrationSql = String.raw`-- The guarded GitHub fallback runs frequently while its Supabase primary is
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
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0103_index_cron_dispatch_fallback_guard.sql', repositoryRoot)
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
      '0103_index_cron_dispatch_fallback_guard.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
