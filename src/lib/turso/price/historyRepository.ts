import { z } from 'zod';

import { CONFIDENCE_SCALE, DEVIATION_SCALE, PRICE_SCALE } from './decimal';

import type { Client } from '@libsql/client';

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

export interface TursoLatestPriceRecord {
  snapshot_ts: string;
  provider: string;
  symbol: string;
  chain_id: number;
  price: number;
  confidence: number | null;
  data_age_seconds: number | null;
  is_success: boolean;
}

const MAX_PAGE_SIZE = 10_001;
const ROWS_PER_SLOT = 1_024;
const maxSlotMsForSyntheticId = Math.floor(
  (Number.MAX_SAFE_INTEGER - ROWS_PER_SLOT) / ROWS_PER_SLOT
);
const HISTORY_CACHE_TTL_MS = 30_000;
const LATEST_CACHE_TTL_MS = 5_000;
const MAX_CACHE_ENTRIES = 256;

interface CacheEntry<T> {
  value: T;
  expiresAtMs: number;
}

const completedReads = new Map<string, CacheEntry<unknown>>();
const inFlightReads = new Map<string, Promise<unknown>>();
const clientIds = new WeakMap<Client, number>();
let nextClientId = 1;

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

function cloneRows(rows: TursoPriceHistoryRecord[]): TursoPriceHistoryRecord[] {
  return rows.map((row) => ({ ...row }));
}

function cachedRead<T>(key: string, ttlMs: number, read: () => Promise<T>): Promise<T> {
  const nowMs = Date.now();
  const cached = completedReads.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAtMs > nowMs) return Promise.resolve(cached.value);

  const pending = inFlightReads.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = read()
    .then((value) => {
      completedReads.set(key, { value, expiresAtMs: Date.now() + ttlMs });
      while (completedReads.size > MAX_CACHE_ENTRIES) {
        const oldest = completedReads.keys().next().value;
        if (oldest === undefined) break;
        completedReads.delete(oldest);
      }
      return value;
    })
    .finally(() => inFlightReads.delete(key));
  inFlightReads.set(key, request);
  return request;
}

function cacheNamespace(client: Client): number {
  const existing = clientIds.get(client);
  if (existing !== undefined) return existing;
  const created = nextClientId++;
  clientIds.set(client, created);
  return created;
}

/** Test seam; production entries expire quickly and remain process-local. */
export function resetTursoPriceReadCacheForTests(): void {
  completedReads.clear();
  inFlightReads.clear();
}

/**
 * Query Turso's immutable fine-price stream. IDs are deterministic local
 * cursor keys: every slot permits at most 500 inputs, well below 1,024.
 */
async function queryTursoPriceHistoryPage(
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

export async function loadTursoPriceHistoryPage(
  client: Client,
  fromMs: number,
  beforeMs: number,
  options: TursoPriceHistoryPageOptions = {}
): Promise<TursoPriceHistoryRecord[]> {
  const key = `history:${cacheNamespace(client)}:${JSON.stringify({ fromMs, beforeMs, options })}`;
  const rows = await cachedRead(key, HISTORY_CACHE_TTL_MS, () =>
    queryTursoPriceHistoryPage(client, fromMs, beforeMs, options)
  );
  return cloneRows(rows);
}

function validateLatestOptions(options: {
  provider: string;
  symbol: string;
  chainId?: number;
  successOnly?: boolean;
}): void {
  if (
    options.provider.trim().length === 0 ||
    options.symbol.trim().length === 0 ||
    (options.chainId !== undefined &&
      (!Number.isSafeInteger(options.chainId) || options.chainId < 0))
  ) {
    throw new Error('Invalid Turso latest-price query');
  }
}

/**
 * The hot current-price read model avoids an ordered scan of raw history. It
 * stays process-local cached only; authenticated HTTP responses still run
 * their normal authorization, rate-limit, and credit-metering middleware.
 */
export async function loadTursoLatestPrice(
  client: Client,
  options: {
    provider: string;
    symbol: string;
    chainId?: number;
    successOnly?: boolean;
  }
): Promise<TursoLatestPriceRecord | null> {
  validateLatestOptions(options);
  const key = `latest:${cacheNamespace(client)}:${JSON.stringify(options)}`;
  const record = await cachedRead(key, LATEST_CACHE_TTL_MS, async () => {
    const conditions = ['provider=?', 'symbol=?'];
    const args: Array<string | number> = [options.provider, options.symbol];
    if (options.chainId !== undefined) {
      conditions.push('chain_id=?');
      args.push(options.chainId);
    }
    const result = await client.execute({
      sql: `SELECT slot_ms,provider,symbol,chain_id,price_e8,confidence_e4,data_age_seconds,is_success
        FROM price_latest WHERE ${conditions.join(' AND ')}
        ORDER BY slot_ms DESC LIMIT 1`,
      args,
    });
    const raw = result.rows[0] as Record<string, unknown> | undefined;
    if (!raw) return null;
    const latest = {
      snapshot_ts: isoTimestamp(
        asNonnegativeInteger(raw.slot_ms, 'latest slot timestamp'),
        'latest slot timestamp'
      ),
      provider: asText(raw.provider, 'latest provider'),
      symbol: asText(raw.symbol, 'latest symbol'),
      chain_id: asNonnegativeInteger(raw.chain_id, 'latest chain id'),
      price: scaledToNumber(raw.price_e8, PRICE_SCALE, 'latest price'),
      confidence: nullableScaledToNumber(raw.confidence_e4, CONFIDENCE_SCALE, 'latest confidence'),
      data_age_seconds: asNullableInteger(raw.data_age_seconds, 'latest data age'),
      is_success: asBoolean(raw.is_success, 'latest success flag'),
    } satisfies TursoLatestPriceRecord;
    if (!options.successOnly || (latest.is_success && latest.price > 0)) return latest;

    // This is an outage-only path: the current collection outcome failed, so
    // find the prior successful durable event. Normal current-price reads
    // remain a single primary-key lookup against `price_latest`.
    const previous = await client.execute({
      sql: `SELECT slot_ms,provider,symbol,chain_id,price_e8,confidence_e4,data_age_seconds,is_success
        FROM price_snapshots
        WHERE ${conditions.join(' AND ')} AND is_success=1 AND price_e8<>'0'
        ORDER BY slot_ms DESC LIMIT 1`,
      args,
    });
    const prior = previous.rows[0] as Record<string, unknown> | undefined;
    if (!prior) return null;
    return {
      snapshot_ts: isoTimestamp(
        asNonnegativeInteger(prior.slot_ms, 'fallback slot timestamp'),
        'fallback slot timestamp'
      ),
      provider: asText(prior.provider, 'fallback provider'),
      symbol: asText(prior.symbol, 'fallback symbol'),
      chain_id: asNonnegativeInteger(prior.chain_id, 'fallback chain id'),
      price: scaledToNumber(prior.price_e8, PRICE_SCALE, 'fallback price'),
      confidence: nullableScaledToNumber(
        prior.confidence_e4,
        CONFIDENCE_SCALE,
        'fallback confidence'
      ),
      data_age_seconds: asNullableInteger(prior.data_age_seconds, 'fallback data age'),
      is_success: asBoolean(prior.is_success, 'fallback success flag'),
    } satisfies TursoLatestPriceRecord;
  });
  return record === null ? null : { ...record };
}
