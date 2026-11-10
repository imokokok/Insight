// Monad DEX market write path on the Turso ops data plane (egress retirement
// v6). Mirrors the Supabase contract in src/lib/dex/monadUniswapV3Volume.ts:
// the cursor is the resumability pointer (it must only advance after the
// swap-event batch for the same window is persisted), and swap events are
// keyed on the natural identity so re-runs are idempotent.
import type { Client, InValue } from '@libsql/client';

export type TursoDexMarketMode = 'supabase' | 'turso';

export function readTursoDexMarketMode(
  value: string | undefined = process.env.TURSO_DEX_MARKET_MODE
): TursoDexMarketMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_DEX_MARKET_MODE must be supabase or turso');
}

export interface TursoDexCursor {
  lastScannedBlock: string;
  lastScannedTimestamp: string;
  coverageStartedAt: string;
}

export interface TursoDexSwapRow {
  chainId: number;
  dex: string;
  poolAddress: string;
  txHash: string;
  logIndex: string;
  blockNumber: string;
  blockHash: string;
  blockTimestamp: string;
  amount0Raw: string;
  amount1Raw: string;
}

export interface TursoDexCursorKey {
  chainId: number;
  dex: string;
  poolAddress: string;
}

/** Cursor read; null when the pool has never been scanned (initial backfill). */
export async function loadTursoDexCursor(
  client: Client,
  key: TursoDexCursorKey
): Promise<TursoDexCursor | null> {
  const result = await client.execute({
    sql: `
      SELECT last_scanned_block, last_scanned_timestamp, coverage_started_at
      FROM dex_market_sync_cursors
      WHERE chain_id = ? AND dex = ? AND pool_address = ?
    `,
    args: [key.chainId, key.dex, key.poolAddress],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    lastScannedBlock: String(row.last_scanned_block),
    lastScannedTimestamp: String(row.last_scanned_timestamp),
    coverageStartedAt: String(row.coverage_started_at),
  };
}

/**
 * Idempotent swap-event upsert + cursor advance in ONE transaction: the
 * Supabase path advances the cursor only after the event batch succeeds so a
 * failure stays retryable without manufacturing a coverage gap; the Turso
 * path keeps that contract atomically.
 */
export async function persistTursoDexWindow(
  client: Client,
  key: TursoDexCursorKey,
  swaps: readonly TursoDexSwapRow[],
  cursor: {
    lastScannedBlock: string;
    lastScannedTimestamp: string;
    coverageStartedAt: string;
  }
): Promise<void> {
  const statements: Array<{ sql: string; args: InValue[] }> = swaps.map((swap) => ({
    sql: `
      INSERT INTO dex_market_swap_events (
        chain_id, dex, pool_address, tx_hash, log_index, block_number,
        block_hash, block_timestamp, amount0_raw, amount1_raw, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (chain_id, dex, pool_address, tx_hash, log_index) DO NOTHING
    `,
    args: [
      swap.chainId,
      swap.dex,
      swap.poolAddress,
      swap.txHash,
      swap.logIndex,
      swap.blockNumber,
      swap.blockHash,
      swap.blockTimestamp,
      swap.amount0Raw,
      swap.amount1Raw,
      new Date().toISOString(),
    ],
  }));
  statements.push({
    sql: `
      INSERT INTO dex_market_sync_cursors (
        chain_id, dex, pool_address, last_scanned_block,
        last_scanned_timestamp, coverage_started_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (chain_id, dex, pool_address) DO UPDATE SET
        last_scanned_block = excluded.last_scanned_block,
        last_scanned_timestamp = excluded.last_scanned_timestamp,
        updated_at = excluded.updated_at
    `,
    args: [
      key.chainId,
      key.dex,
      key.poolAddress,
      cursor.lastScannedBlock,
      cursor.lastScannedTimestamp,
      cursor.coverageStartedAt,
      new Date().toISOString(),
    ],
  });
  await client.batch(statements, 'write');
}

/** Retention trim (35-day window, migration 0137). Best-effort per run. */
export async function trimTursoDexSwapEvents(
  client: Client,
  retentionDays: number,
  now: Date = new Date()
): Promise<number> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer');
  }
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const result = await client.execute({
    sql: 'DELETE FROM dex_market_swap_events WHERE block_timestamp < ?',
    args: [cutoff],
  });
  return Number(result.rowsAffected ?? 0);
}
