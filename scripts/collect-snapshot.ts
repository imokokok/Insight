/* eslint-disable no-console */
/**
 * High-frequency oracle price-snapshot collector.
 *
 * Runs on GitHub Actions (`/.github/workflows/snapshot-collect.yml`, every 15
 * minutes) — NOT inside Vercel — so it is not bound by the 60s serverless
 * timeout. Mirrors the Vercel `/api/cron/daily-report` pipeline by delegating
 * to `collectSnapshot()` (which upserts `hourly_price_snapshots` and updates
 * feed health), then persists fine-grained price evidence through a database
 * policy: core assets keep every sample; adaptive assets retain an hourly
 * baseline plus material changes and state transitions.
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
import {
  collectSnapshot,
  resolveSnapshotSlot,
  SnapshotCollectionError,
} from '@/lib/reports/snapshotCollector';
import { persistAdaptivePriceSnapshots } from '@/lib/supabase/adaptiveSnapshotPersistence';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[collect-snapshot] starting collection pipeline…');

  let result;
  try {
    result = await collectSnapshot(resolveSnapshotSlot(process.env.CRON_SCHEDULED_FOR), {
      reuseRpcMetadata: true,
    });
  } catch (error) {
    if (error instanceof SnapshotCollectionError) {
      console.error(
        `[collect-snapshot] pipeline failed at stage "${error.stage}": ${error.message}`
      );
    } else {
      console.error(
        '[collect-snapshot] pipeline failed:',
        error instanceof Error ? error.message : error
      );
    }
    process.exit(1);
  }

  const successCount = result.inputs.filter((i) => i.isSuccess).length;
  const failedCount = result.inputs.length - successCount;
  console.log(
    `[collect-snapshot] hourly upsert: ${result.insertedHourly} rows | ` +
      `feed health: ${result.updatedHealth} updated, ${result.deactivated} deactivated | ` +
      `${successCount} success / ${failedCount} failed`
  );

  // Policy-controlled fine-grained persistence for ML/anomaly detection. Only
  // the GH Actions job writes this table; the Vercel route is unchanged.
  try {
    const persistenceSummary = await persistAdaptivePriceSnapshots(
      result.inputs,
      result.snapshotTs
    );
    console.log(
      `[collect-snapshot] price_snapshots: ${persistenceSummary.persisted}/` +
        `${persistenceSummary.candidates} written | ` +
        `full=${persistenceSummary.fullResolution} hourly=${persistenceSummary.hourlyBaseline} ` +
        `events=${
          persistenceSummary.initial +
          persistenceSummary.stateTransition +
          persistenceSummary.errorChange +
          persistenceSummary.priceChange +
          persistenceSummary.deviationChange +
          persistenceSummary.dataAgeChange +
          persistenceSummary.confidenceChange
        } stable-skipped=${persistenceSummary.stableSkipped}`
    );
  } catch (error) {
    // The hourly snapshot + feed health already succeeded, so a fine-grained
    // persistence failure must NOT cause the whole run to be treated as failed
    // (that would skip feed-health/deactivate side effects on retry). Log and
    // exit non-zero so the run is visible as degraded, but the hourly data is
    // already persisted.
    console.error(
      '[collect-snapshot] adaptive price snapshot persistence failed (hourly data already persisted):',
      error instanceof Error ? error.message : error
    );
    process.exit(2);
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[collect-snapshot] done in ${elapsed}s — ` +
      `snapshot_ts=${result.snapshotTs.toISOString()} date=${result.snapshotDate}`
  );
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
