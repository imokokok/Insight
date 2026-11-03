/* eslint-disable no-console */
/**
 * High-frequency oracle price-snapshot collector.
 *
 * Runs as the primary GitHub Actions collector. Its Turso slot lease makes
 * schedule retries and manual recovery runs idempotent, so they never produce
 * a different payload for the same 15-minute slot.
 *
 * Why a separate table: `hourly_price_snapshots` upserts on
 * `(snapshot_hour, provider, symbol, chain_id)`, so running more frequently
 * would just overwrite the same hourly row. `price_snapshots` uses a precise
 * `snapshot_ts`; its persistence policy preserves high-resolution core
 * history while eliminating stable, redundant raw writes for adaptive feeds.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/collect-snapshot.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service-role, bypasses
 * RLS — same credentials the ml-train workflow already uses).
 */
import { runSnapshotIngest } from '@/lib/reports/snapshotIngest';

function resolveTriggerSource(): 'github_actions' | 'manual' {
  if (process.env.SNAPSHOT_TRIGGER_SOURCE === 'manual') return 'manual';

  // A human workflow_dispatch remains an explicit recovery path.
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' && !process.env.CRON_DISPATCH_ID) {
    return 'manual';
  }
  return 'github_actions';
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[collect-snapshot] starting collection pipeline…');

  try {
    const result = await runSnapshotIngest(process.env.CRON_SCHEDULED_FOR, resolveTriggerSource());
    console.log(
      `[collect-snapshot] ${result.outcome} slot=${new Date(result.slotMs).toISOString()} ` +
        `projection=${result.projection ?? 'n/a'} inputs=${result.inputCount}`
    );
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `[collect-snapshot] done in ${elapsed}s — ` +
        `slot=${new Date(result.slotMs).toISOString()} outcome=${result.outcome}`
    );
  } catch (error) {
    console.error(
      '[collect-snapshot] pipeline failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

// Hard deadline: if the pipeline hangs beyond this (e.g. an oracle client
// keeps an open socket that prevents the event loop from draining), force
// exit so the GitHub Actions job fails fast instead of timing out at the
// 15-min workflow limit. Mirrors the pattern in scripts/sync-feeds.ts.
const HARD_DEADLINE_MS = Number(process.env.SNAPSHOT_DEADLINE_MS) || 12 * 60 * 1000;
const deadlineTimer = setTimeout(() => {
  console.error(`[collect-snapshot] hard deadline (${HARD_DEADLINE_MS}ms) exceeded — forcing exit`);
  process.exit(1);
}, HARD_DEADLINE_MS);
deadlineTimer.unref?.();

main()
  .then(() => {
    clearTimeout(deadlineTimer);
    // Give pending I/O (logs, fire-and-forget DB writes) a brief grace period
    // before exiting, so they aren't truncated. unref() ensures this timer
    // alone never keeps the process alive.
    const graceTimer = setTimeout(() => process.exit(0), 2000);
    graceTimer.unref?.();
  })
  .catch((error) => {
    clearTimeout(deadlineTimer);
    console.error('[collect-snapshot] unhandled error:', error);
    process.exit(1);
  });
