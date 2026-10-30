import type { Client } from '@libsql/client';
import { z } from 'zod';

import { CONFIDENCE_SCALE, DEVIATION_SCALE, PRICE_SCALE } from './decimal';

export const TURSO_PRICE_HISTORY_FIELDS = [
  'id',
  'snapshot_ts',
  'snapshot_hour',
  'provider',
  'symbol',
  'chain_id',
  'price',
  'consensus_price',
  'deviation_pct',
  'latency_ms',
  'data_age_seconds',
  'confidence',
  'is_success',
  'error_message',
  'created_at',
] as const;

export type TursoPriceHistoryField = (typeof TURSO_PRICE_HISTORY_FIELDS)[number];

export interface TursoPriceHistoryPageOptions {
  providers?: string[];
  symbol?: string;
  chainId?: number;
  successOnly?: boolean;
  ascending?: boolean;
  limit?: number;
  offset?: number;
  inclusiveBefore?: boolean;
}

export type TursoPriceHistoryRecord = Record<
  TursoPriceHistoryField,
  string | number | boolean | null
>;

const MAX_PAGE_SIZE = 10_001;
const ROWS_PER_SLOT = 1_024;
const maxSlotMsForSyntheticId = Math.floor(
  (Number.MAX_SAFE_INTEGER - ROWS_PER_SLOT) / ROWS_PER_SLOT
);

const nonemptyText = z.string().min(1);

function asSafeInteger(value: unknown, field: string): number {
  const parsed = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid Turso ${field}`);
  return parsed;
}

function asNonnegativeInteger(value: unknown, field: string): number {
  const parsed = asSafeInteger(value, field);
  if (parsed < 0) throw new Error(`Invalid Turso ${field}`);
  return parsed;
}

function asNullableInteger(value: unknown, field: string): number | null {
  return value === null || value === undefined ? null : asSafeInteger(value, field);
}

function asText(value: unknown, field: string): string {
  try {
    return nonemptyText.parse(value);
  } catch {
    throw new Error(`Invalid Turso ${field}`);
  }
}

function asNullableText(value: unknown, field: string): string | null {
  return value === null || value === undefined ? null : asText(value, field);
}

function scaledToNumber(value: unknown, scale: number, field: string): number {
  let scaled: bigint;
  try {
    if (typeof value === 'string') scaled = BigInt(value);
    else if (typeof value === 'bigint') scaled = value;
    else if (typeof value === 'number' && Number.isSafeInteger(value)) scaled = BigInt(value);
    else throw new Error('invalid scaled value');
  } catch {
    throw new Error(`Invalid Turso ${field}`);
  }
  const result = Number(scaled) / 10 ** scale;
  if (!Number.isFinite(result)) throw new Error(`Invalid Turso ${field}`);
  return result;
}

function nullableScaledToNumber(value: unknown, scale: number, field: string): number | null {
  return value === null || value === undefined ? null : scaledToNumber(value, scale, field);
}

function asBoolean(value: unknown, field: string): boolean {
  if (value === 1 || value === 1n) return true;
  if (value === 0 || value === 0n) return false;
  throw new Error(`Invalid Turso ${field}`);
}

function isoTimestamp(value: number, field: string): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid Turso ${field}`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid Turso ${field}`);
  return date.toISOString();
}

function validatePage(
  fromMs: number,
  beforeMs: number,
  options: TursoPriceHistoryPageOptions
): Required<
  Pick<TursoPriceHistoryPageOptions, 'limit' | 'offset' | 'ascending' | 'inclusiveBefore'>
> {
  const limit = options.limit ?? 1_000;
  const offset = options.offset ?? 0;
  if (
    !Number.isSafeInteger(fromMs) ||
    !Number.isSafeInteger(beforeMs) ||
    fromMs < 0 ||
    beforeMs < fromMs ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_PAGE_SIZE ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    (options.chainId !== undefined &&
      (!Number.isSafeInteger(options.chainId) || options.chainId < 0)) ||
    (options.providers !== undefined &&
      options.providers.some((provider) => provider.trim().length === 0))
  ) {
    throw new Error('Invalid Turso price history page');
  }
  return {
    limit,
    offset,
    ascending: options.ascending ?? false,
    inclusiveBefore: options.inclusiveBefore ?? false,
  };
}

/**
 * Query Turso's immutable fine-price stream. IDs are deterministic local
 * cursor keys: every slot permits at most 500 inputs, well below 1,024.
 */
export async function loadTursoPriceHistoryPage(
  client: Client,
  fromMs: number,
  beforeMs: number,
  options: TursoPriceHistoryPageOptions = {}
): Promise<TursoPriceHistoryRecord[]> {
  const page = validatePage(fromMs, beforeMs, options);
  if (fromMs > maxSlotMsForSyntheticId || beforeMs > maxSlotMsForSyntheticId) {
    throw new Error('Turso price history timestamp exceeds the cursor range');
  }

  const conditions = ['slot_ms >= ?', page.inclusiveBefore ? 'slot_ms <= ?' : 'slot_ms < ?'];
  const args: Array<string | number> = [fromMs, beforeMs];
  if (options.providers?.length) {
    conditions.push(`provider IN (${options.providers.map(() => '?').join(',')})`);
    args.push(...options.providers);
  }
  if (options.symbol !== undefined) {
    conditions.push('symbol = ?');
    args.push(options.symbol);
  }
  if (options.chainId !== undefined) {
    conditions.push('chain_id = ?');
    args.push(options.chainId);
  }
  if (options.successOnly) conditions.push("is_success = 1 AND price_e8 <> '0'");

  const direction = page.ascending ? 'ASC' : 'DESC';
  const result = await client.execute({
    sql: `SELECT slot_ms,snapshot_hour_ms,provider,symbol,chain_id,price_e8,consensus_price_e8,
      deviation_e4,latency_ms,data_age_seconds,confidence_e4,is_success,error_message,created_at_ms,
      ROW_NUMBER() OVER (PARTITION BY slot_ms ORDER BY provider ASC,symbol ASC,chain_id ASC) - 1 AS row_ordinal
      FROM price_snapshots
      WHERE ${conditions.join(' AND ')}
      ORDER BY slot_ms ${direction},provider ${direction},symbol ${direction},chain_id ${direction}
      LIMIT ? OFFSET ?`,
    args: [...args, page.limit, page.offset],
  });

  return result.rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const slotMs = asNonnegativeInteger(row.slot_ms, 'slot timestamp');
    const ordinal = asNonnegativeInteger(row.row_ordinal, 'slot ordinal');
    if (ordinal >= ROWS_PER_SLOT || slotMs > maxSlotMsForSyntheticId) {
      throw new Error('Invalid Turso price history cursor');
    }
    return {
      id: slotMs * ROWS_PER_SLOT + ordinal + 1,
      snapshot_ts: isoTimestamp(slotMs, 'slot timestamp'),
      snapshot_hour: isoTimestamp(
        asNonnegativeInteger(row.snapshot_hour_ms, 'snapshot hour'),
        'snapshot hour'
      ),
      provider: asText(row.provider, 'provider'),
      symbol: asText(row.symbol, 'symbol'),
      chain_id: asNonnegativeInteger(row.chain_id, 'chain id'),
      price: scaledToNumber(row.price_e8, PRICE_SCALE, 'price'),
      consensus_price: nullableScaledToNumber(
        row.consensus_price_e8,
        PRICE_SCALE,
        'consensus price'
      ),
      deviation_pct: nullableScaledToNumber(row.deviation_e4, DEVIATION_SCALE, 'deviation'),
      latency_ms: asNullableInteger(row.latency_ms, 'latency'),
      data_age_seconds: asNullableInteger(row.data_age_seconds, 'data age'),
      confidence: nullableScaledToNumber(row.confidence_e4, CONFIDENCE_SCALE, 'confidence'),
      is_success: asBoolean(row.is_success, 'success flag'),
      error_message: asNullableText(row.error_message, 'error message'),
      created_at:
        row.created_at_ms === null || row.created_at_ms === undefined
          ? null
          : isoTimestamp(
              asNonnegativeInteger(row.created_at_ms, 'created timestamp'),
              'created timestamp'
            ),
    };
  });
}
