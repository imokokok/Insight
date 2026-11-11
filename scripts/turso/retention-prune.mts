import { getTursoOpsClient, readTursoOpsConfig } from '@/lib/turso/ops/client';

/* eslint-disable no-console */
/**
 * Turso ops retention prune — the cleanup layers the collector's own
 * maintenance does NOT cover.
 *
 * Already enforced elsewhere (do NOT duplicate here):
 *   - price_snapshots: pruned daily by pruneExpiredTursoPriceEvents
 *     (slotRepository.ts, ledger task_key 'raw-event-retention',
 *     TURSO_PRICE_RAW_RETENTION_DAYS default 30).
 *   - snapshot_slots canonical payloads: compacted once Supabase acknowledges
 *     the projection hand-off. Rows are the projection queue (retry/
 *     quarantine state) and must never be deleted by a batch prune.
 *
 * What this script adds (checked nightly, after the backup export):
 *   - snapshot_ingest_leases: ephemeral coordination records, never pruned.
 *   - price_records: ttl-driven 24h cache; cleanup only exists in the
 *     Supabase copy, so the Turso mirror would grow unbounded once
 *     TURSO_PRICE_RECORDS_MODE=turso switches the cache over.
 *   - settlement_window_candles: evidence-derived candles grow with watched
 *     markets; packs themselves (settlement_evidence_packs) are permanent.
 *
 * Credentials are data-plane-only (TURSO_OPS_* / TURSO_PRICE_*). Deletions
 * count toward the free-tier 10M row-writes/month budget; steady state here
 * is at most a few thousand rows/day, negligible next to the capture writes.
 *
 * Runs inside turso-backup.yml AFTER the artifact upload, so every pruned
 * row is already exported to the 90-day backup trail. Run bookkeeping lands
 * in price_maintenance (task_key 'retention-prune').
 */
readTursoOpsConfig();
const client = getTursoOpsClient();

interface PrunePolicy {
  table: string;
  column: string;
  days: number;
  note: string;
}

const PRUNE_POLICIES: readonly PrunePolicy[] = [
  { table: 'snapshot_ingest_leases', column: 'slot_ms', days: 14, note: 'ephemeral leases' },
  { table: 'price_records', column: 'ttl_ms', days: 0, note: 'ttl-driven 24h cache' },
  { table: 'settlement_window_candles', column: 'collected_at_ms', days: 365, note: 'evidence-derived candles' },
];

const MAINTENANCE_TASK_KEY = 'retention-prune';

function cutoffMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

try {
  const now = Date.now();
  const summary: { table: string; deleted: number }[] = [];

  for (const policy of PRUNE_POLICIES) {
    const cutoff = cutoffMs(policy.days);
    // Statement built from a fixed internal policy list; identifiers never
    // come from user input.
    const sql = `DELETE FROM ${policy.table} WHERE ${policy.column} < ${cutoff}`;
    const result = await client.execute(sql);
    const deleted = result.rowsAffected ?? 0;
    summary.push({ table: policy.table, deleted });
    console.log(
      `[turso-retention] ${policy.table} (${policy.note}): deleted ${deleted} rows older than ` +
        `${policy.days === 0 ? 'their ttl' : `${policy.days}d`}`
    );
  }

  await client.execute({
    sql: `INSERT INTO price_maintenance(task_key, last_run_ms) VALUES(?, ?)
      ON CONFLICT(task_key) DO UPDATE SET last_run_ms = excluded.last_run_ms`,
    args: [MAINTENANCE_TASK_KEY, now],
  });

  const totalDeleted = summary.reduce((sum, item) => sum + item.deleted, 0);
  console.log(`[turso-retention] done: ${totalDeleted} rows pruned across ${summary.length} tables`);

  if (totalDeleted > 1_000_000) {
    // Far above the steady-state churn — surface it instead of silently
    // burning the write budget (e.g. after a long pause in scheduled runs).
    throw new Error(`retention prune deleted an abnormally large number of rows (${totalDeleted}); verify retention windows`);
  }
} finally {
  client.close();
}
