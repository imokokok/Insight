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

export interface TursoManipCostAdvisoryRow {
  pool_key: string;
  dex: string;
  fee_tier: string | null;
  snapshot_ts: string;
  block_number: number | null;
  mid_price: number | null;
  tvl_usd: number | null;
  /** Parsed cost-curve JSON (same shape Supabase REST returned). */
  cost_curve: unknown;
}

/**
 * Hot-path read for the pre-trade manipulation-cost advisory
 * (src/lib/manipCost/baseline.ts). Mirrors the Supabase read: freshest
 * successful rows for the symbol's pools, over-fetched so a missing pool is
 * distinguishable from a short window; the caller dedupes newest-per-pool.
 */
export async function readTursoManipCostAdvisoryRows(
  client: Client,
  poolKeys: string[],
  limit: number
): Promise<TursoManipCostAdvisoryRow[]> {
  if (poolKeys.length === 0) return [];
  const boundedLimit = Math.max(1, Math.floor(limit));
  const placeholders = poolKeys.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `SELECT pool_key, dex, fee_tier, snapshot_ts, block_number, mid_price,
                 tvl_usd, cost_curve
          FROM manip_cost_pool_snapshots
          WHERE pool_key IN (${placeholders}) AND is_success = 1
          ORDER BY snapshot_ts DESC
          LIMIT ${boundedLimit}`,
    args: poolKeys,
  });
  return result.rows.map((row) => {
    const curveRaw = row.cost_curve;
    let curve: unknown = null;
    if (typeof curveRaw === 'string' && curveRaw.length > 0) {
      try {
        curve = JSON.parse(curveRaw);
      } catch {
        curve = null; // malformed curve → caller withholds (fail-closed)
      }
    }
    return {
      pool_key: String(row.pool_key),
      dex: String(row.dex),
      fee_tier: row.fee_tier === null || row.fee_tier === undefined ? null : String(row.fee_tier),
      snapshot_ts: String(row.snapshot_ts),
      block_number:
        row.block_number === null || row.block_number === undefined
          ? null
          : Number(row.block_number),
      mid_price:
        row.mid_price === null || row.mid_price === undefined ? null : Number(row.mid_price),
      tvl_usd: row.tvl_usd === null || row.tvl_usd === undefined ? null : Number(row.tvl_usd),
      cost_curve: curve,
    };
  });
}
