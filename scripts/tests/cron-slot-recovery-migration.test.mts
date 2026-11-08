import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../../supabase/migrations/0133_stagger_and_merge_snapshot_schedule.sql',
  import.meta.url
);

test('0133 merges daily retention jobs into one isolated-step job', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.run_daily_retention\(\)/);
  assert.match(
    migration,
    /RETURNS TABLE\(step text, status text, rows_affected bigint, error_message text\)/
  );
  assert.match(migration, /EXCEPTION WHEN OTHERS THEN\s+status := 'failed';/);
  assert.match(migration, /RAISE NOTICE 'daily_retention\.%=%', step, status;/);
  assert.match(migration, /'nightly-retention-cleanup',\s*'16 19 \* \* \*'/);
  // Live inventory before and after execution so 33 vs 31 -> 17 is counted,
  // never guessed.
  assert.match(migration, /0133 cron inventory \(pre\)/);
  assert.match(migration, /0133 cron inventory \(post\)/);
  assert.match(migration, /string_agg\(jobname, ', ' ORDER BY jobname\)/);

  for (const job of [
    'snapshot-archive-maintenance',
    'snapshot-archive-cleanup',
    'price-snapshots-cleanup',
    'hourly-snapshots-cleanup',
    'market-reference-cleanup',
    'position-lifecycles-cleanup',
    'oracle-watch-checks-cleanup',
    'oracle-watch-windows-cleanup',
    'execution-receipts-cleanup',
    'reputation-history-cleanup',
    'api-key-usage-cleanup',
    'feed-health-snapshots-cleanup',
    'manip-cost-cleanup',
    'dex-market-swap-events-cleanup',
    'cleanup-pre-trade-checks',
    'cleanup-coverage-slo',
    'github-dispatch-ledger-cleanup',
    'native-cron-log-cleanup',
  ]) {
    assert.match(
      migration,
      new RegExp(`cron\\.unschedule\\('${job}'\\)\\s+WHERE EXISTS`),
      `${job} must be unscheduled before the merged job is installed`
    );
  }
});

test('0133 keeps collection-critical cadences and staggers non-critical jobs', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /'github-dispatch-snapshot-collect', '0,15,30,45 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-turso-price-project', '3,18,33,48 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-turso-snapshot-fallback', '7,22,37,52 \* \* \* \*'/);
  assert.match(
    migration,
    /'github-dispatch-turso-snapshot-second-probe', '12,27,42,57 \* \* \* \*'/
  );
  assert.match(migration, /'github-dispatch-turso-projection-fallback', '10,25,40,55 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-mark-stale', '1,11,21,31,41,51 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-coverage-slo', '9,24,39,54 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-reputation', '13 \*\/2 \* \* \*'/);
  assert.match(migration, /'github-dispatch-safety-outcome', '14 \*\/2 \* \* \*'/);
  assert.match(migration, /'github-dispatch-daily-report', '16 0 \* \* \*'/);
  assert.match(migration, /'github-dispatch-monad-dex-market', '5,20,35,50 \* \* \* \*'/);
  assert.match(migration, /'price-records-cleanup', '6,36 \* \* \* \*'/);
  assert.match(migration, /'api-keys-deactivation', '2 \* \* \* \*'/);
});

test('0133 second probe retries only same-slot timed_out rows and marks cross-slot lost', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.dispatch_turso_snapshot_second_probe\(\)/
  );
  assert.match(migration, /r\.status = 'timed_out'/);
  // The old 30-minute window must be gone: same-slot equality is the only
  // retry gate.
  assert.doesNotMatch(migration, /r\.scheduled_for >= v_now - interval '30 minutes'/);
  assert.match(
    migration,
    /date_trunc\('hour', r\.scheduled_for\)\s+\+ floor\(extract\(minute FROM r\.scheduled_for\) \/ 15\) \* interval '15 minutes'\s+= v_slot/
  );
  assert.match(
    migration,
    /SET status = 'lost',\s+conclusion = 'cross_slot_abandoned: no late backfill'/
  );
  assert.match(migration, /<> v_slot/);
  assert.match(migration, /ADD CONSTRAINT cron_dispatch_runs_status_check[\s\S]*?'lost'/);
  assert.match(migration, /'scheduled_for', v_retry\.scheduled_for::text/);
  assert.match(migration, /status = 'dispatching'/);
  assert.match(migration, /NOT EXISTS \(\s+SELECT 1\s+FROM public\.turso_price_slot_receipts/);
  assert.match(migration, /'github-dispatch-turso-snapshot-second-probe',/);
});

test('0133 only re-registers jobs through unschedule-before-schedule', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  // The only cron.schedule calls without a matching named unschedule are the
  // new merged job and the second probe; both are guarded by an idempotent
  // unschedule-if-exists statement and the replaceable enable function.
  assert.match(
    migration,
    /cron\.unschedule\('nightly-retention-cleanup'\)\s+WHERE EXISTS[\s\S]*?cron\.schedule\(\s*'nightly-retention-cleanup'/s
  );
  assert.match(migration, /PERFORM public\.disable_github_workflow_dispatcher\(\);/);
});

test('the snapshot workflow refuses to resolve a slot from the runner clock', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/snapshot-collect.yml', import.meta.url),
    'utf8'
  );

  assert.match(workflow, /scheduled_for:[\s\S]*?required: true/);
  assert.match(workflow, /Require scheduler-provided slot[\s\S]*?CRON_SCHEDULED_FOR[\s\S]*?exit 1/);
  assert.doesNotMatch(workflow, /minute=\$(date -u \+%M)/);
});

test('the ingest path uses the strict scheduler slot resolver', async () => {
  const ingest = await readFile(
    new URL('../../src/lib/reports/snapshotIngest.ts', import.meta.url),
    'utf8'
  );
  assert.match(ingest, /resolveRequiredSnapshotSlot\(scheduledFor\)/);
  assert.doesNotMatch(ingest, /resolveSnapshotSlot\(scheduledFor\)/);
});

test('the collector retries registry reads and refuses to commit an empty slot', async () => {
  const resolver = await readFile(
    new URL('../../src/lib/oracles/utils/dynamicFeedResolver.ts', import.meta.url),
    'utf8'
  );
  assert.match(resolver, /FEED_REGISTRY_RETRY_DELAYS_MS = \[2_000, 5_000\]/);
  assert.match(resolver, /Failed to get oracle feeds; retrying in/);

  const collector = await readFile(
    new URL('../../src/lib/reports/snapshotCollector.ts', import.meta.url),
    'utf8'
  );
  assert.match(collector, /registryErrored && successCount === 0/);
  assert.match(collector, /not committing an empty slot/);
});
