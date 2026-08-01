/* eslint-disable no-console */
/**
 * High-frequency oracle price-snapshot collector.
 *
 * Runs on GitHub Actions (`/.github/workflows/snapshot-collect.yml`, every 15
 * minutes) — NOT inside Vercel — so it is not bound by the 60s serverless
 * timeout. Mirrors the Vercel `/api/cron/daily-report` pipeline by delegating
 * to `collectSnapshot()` (which upserts `hourly_price_snapshots` and updates
 * feed health), then ADDITIONALLY appends a fine-grained row per feed to the
 * `price_snapshots` table for ML / anomaly detection.
 *
 * Why a separate table: `hourly_price_snapshots` upserts on
 * `(snapshot_hour, provider, symbol, chain_id)`, so running more frequently
 * would just overwrite the same hourly row. `price_snapshots` appends with a
 * precise `snapshot_ts`, so each 15-min run produces new data points (4x
 * denser signal for ML, which previously only had hourly grain).
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/collect-snapshot.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service-role, bypasses
 * RLS — same credentials the ml-train workflow already uses).
 */
import { collectSnapshot, SnapshotCollectionError } from '@/lib/reports/snapshotCollector';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { type HourlySnapshotInput } from '@/lib/reports/reportService';

function buildPriceSnapshotRows(
  inputs: HourlySnapshotInput[],
  snapshotTs: Date
): Array<Record<string, unknown>> {
  return inputs.map((input) => ({
    snapshot_ts: snapshotTs.toISOString(),
    snapshot_hour: input.snapshotHour.toISOString(),
    provider: input.provider,
    symbol: input.symbol,
    chain_id: input.chainId ?? 0,
    price: input.price,
    consensus_price: input.consensusPrice ?? null,
    deviation_pct: input.deviationPct ?? null,
    latency_ms: input.latencyMs ?? null,
    data_age_seconds: input.dataAgeSeconds ?? null,
    confidence: input.confidence ?? null,
    is_success: input.isSuccess,
    error_message: input.errorMessage ?? null,
  }));
}

async function insertPriceSnapshots(rows: Array<Record<string, unknown>>): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('price_snapshots').insert(rows);
  if (error) {
    throw new Error(
      `Failed to insert ${rows.length} price_snapshots rows: ${
        typeof error.message === 'string' ? error.message : '[object Object]'
      }`
    );
  }
  return rows.length;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[collect-snapshot] starting collection pipeline…');

  let result;
  try {
    result = await collectSnapshot();
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

  // Fine-grained append for ML/anomaly detection. Only the GH Actions job
  // writes this table; the Vercel route does not, so its behaviour is unchanged.
  let insertedFine = 0;
  try {
    const rows = buildPriceSnapshotRows(result.inputs, result.snapshotTs);
    insertedFine = await insertPriceSnapshots(rows);
    console.log(`[collect-snapshot] price_snapshots append: ${insertedFine} rows`);
  } catch (error) {
    // The hourly snapshot + feed health already succeeded, so a fine-grained
    // insert failure must NOT cause the whole run to be treated as failed
    // (that would skip feed-health/deactivate side effects on retry). Log and
    // exit non-zero so the run is visible as degraded, but the hourly data is
    // already persisted.
    console.error(
      '[collect-snapshot] price_snapshots append failed (hourly data already persisted):',
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

main().catch((error) => {
  console.error('[collect-snapshot] unhandled error:', error);
  process.exit(1);
});
