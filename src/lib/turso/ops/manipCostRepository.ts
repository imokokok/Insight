// Turso repository for the manipulation-cost domain (egress retirement v3,
// 2026-11). Mirrors the write shape of scripts/collect-manip-cost.ts: one row
// per (snapshot_ts, pool_key), duplicate-tolerant upsert, 365-day retention.
//
// Mode contract (house pattern):
//   'supabase' — write Supabase only (pre-migration behaviour)
//   'turso'    — write Turso only (egress-retired end state)
// No shadow mode: the run is a daily duplicate-tolerant upsert of可再生
// machine data, and dual-writing would burn egress during the restricted
// window this migration exists to escape.
import type { ManipCostRow } from '@/lib/manipCost/collector';

import type { Client, InStatement, InValue } from '@libsql/client/web';

export type TursoManipCostMode = 'supabase' | 'turso';

export function readTursoManipCostMode(
  value: string | undefined = process.env.TURSO_MANIP_COST_MODE
): TursoManipCostMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_MANIP_COST_MODE must be supabase or turso');
}

function toInt(flag: boolean | undefined): 0 | 1 {
  return flag ? 1 : 0;
}

function toText(
  value: Record<string, unknown> | Array<Record<string, unknown>> | null
): string | null {
  return value === null ? null : JSON.stringify(value);
}

const INSERT_SQL = `
  INSERT INTO manip_cost_pool_snapshots (
    snapshot_ts, pool_key, chain, pool_addr, dex, fee_tier,
    block_number, mid_price, tvl_usd, eth_usd_mid,
    pool_state, cost_curve, is_success, error_message, collector_version
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (snapshot_ts, pool_key) DO NOTHING
`;

function bindRow(row: ManipCostRow): InValue[] {
  return [
    row.snapshot_ts,
    row.pool_key,
    row.chain,
    row.pool_addr,
    row.dex,
    row.fee_tier,
    row.block_number,
    row.mid_price,
    row.tvl_usd,
    row.eth_usd_mid,
    toText(row.pool_state),
    toText(row.cost_curve),
    toInt(row.is_success),
    row.error_message,
    row.collector_version,
  ];
}

/** Duplicate-tolerant batch upsert, mirroring the Supabase upsert semantics. */
export async function upsertTursoManipCostRows(
  client: Client,
  rows: readonly ManipCostRow[]
): Promise<number> {
  if (rows.length === 0) return 0;
  const statements: InStatement[] = rows.map((row) => ({
    sql: INSERT_SQL,
    args: bindRow(row),
  }));
  const results = await client.batch(statements, 'write');
  return results.reduce((sum, r) => sum + Number(r.rowsAffected ?? 0), 0);
}

/**
 * Retention trim (365-day window, migration 0138). The collector calls this
 * on every run so no nightly cron is required. A failure here must not fail
 * the collection run (the window only drifts, data correctness is unaffected).
 */
export async function trimTursoManipCostRows(
  client: Client,
  retentionDays: number,
  now: Date = new Date()
): Promise<number> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer');
  }
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const result = await client.execute({
    sql: 'DELETE FROM manip_cost_pool_snapshots WHERE snapshot_ts < ?',
    args: [cutoff],
  });
  return Number(result.rowsAffected ?? 0);
}
