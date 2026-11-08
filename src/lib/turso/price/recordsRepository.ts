import type { PriceRecord, PriceRecordInsert } from '@/lib/supabase/queries';
import { normalizeTimestamp } from '@/lib/utils/timestamp';

import type { Client } from '@libsql/client';

/** Matches the export route's 10,000-row egress guard. */
const MAX_PRICE_RECORDS_QUERY_LIMIT = 10_000;
const INSERT_BATCH_SIZE = 100;
/** price_records.price is DECIMAL(20, 8) in Supabase. */
const MAX_PRICE = 999_999_999_999.99999999;

export interface TursoPriceRecordsFilters {
  provider?: string;
  symbol?: string;
  chain?: string | null;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

interface PreparedPriceRecord {
  provider: string;
  symbol: string;
  chain: string | null;
  priceE8: string;
  timestampMs: number;
  confidenceE4: number | null;
  source: string | null;
  createdAtMs: number;
  ttlMs: number;
  failureMode: string | null;
  signalVectorJson: string | null;
  decimals: number | null;
  verificationJson: string | null;
  ingestionTimestampMs: number | null;
  metadataFallback: 0 | 1 | null;
}

interface PriceRecordRow {
  id: number | bigint;
  provider: string;
  symbol: string;
  chain: string | null;
  price_e8: string;
  timestamp_ms: number | bigint;
  confidence_e4: number | bigint | null;
  source: string | null;
  created_at_ms: number | bigint;
  ttl_ms: number | bigint;
  failure_mode: string | null;
  signal_vector_json: string | null;
  decimals: number | bigint | null;
  verification_json: string | null;
  ingestion_timestamp_ms: number | bigint | null;
  metadata_fallback: number | bigint | null;
}

function calculateTtlMs(ttl: string | undefined, nowMs: number): number {
  const value = ttl || '1h';
  if (value.includes('T') || value.includes('-')) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  const match = value.match(/^(\d+)([smhd])$/);
  const multiplier: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  if (match) return nowMs + Number(match[1]) * multiplier[match[2]];
  return nowMs + 3_600_000;
}

function prepareRecord(record: PriceRecordInsert, nowMs: number): PreparedPriceRecord | null {
  if (!Number.isFinite(record.price) || record.price <= 0 || record.price > MAX_PRICE) {
    return null;
  }
  const timestampMs = normalizeTimestamp(record.timestamp);
  if (!Number.isFinite(timestampMs)) return null;
  const ingestionTimestampMs = record.ingestion_timestamp
    ? normalizeTimestamp(record.ingestion_timestamp)
    : null;

  return {
    provider: record.provider,
    symbol: record.symbol,
    chain: record.chain || null,
    priceE8: record.price.toFixed(8),
    timestampMs,
    confidenceE4:
      record.confidence === null || record.confidence === undefined
        ? null
        : Math.round(record.confidence * 10_000),
    source: record.source ?? null,
    createdAtMs: nowMs,
    ttlMs: calculateTtlMs(record.ttl, nowMs),
    failureMode: record.failure_mode ?? null,
    signalVectorJson: record.signal_vector ? JSON.stringify(record.signal_vector) : null,
    decimals: record.decimals ?? null,
    verificationJson: record.verification ? JSON.stringify(record.verification) : null,
    ingestionTimestampMs: Number.isFinite(ingestionTimestampMs) ? ingestionTimestampMs : null,
    metadataFallback:
      record.metadata_fallback === null || record.metadata_fallback === undefined
        ? null
        : record.metadata_fallback
          ? 1
          : 0,
  };
}

function fingerprint(record: PreparedPriceRecord): string {
  return JSON.stringify({ ...record, ttlMs: undefined });
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function rowToPriceRecord(row: PriceRecordRow): PriceRecord {
  return {
    id: String(row.id),
    provider: row.provider,
    symbol: row.symbol,
    chain: row.chain,
    price: Number(row.price_e8),
    timestamp: new Date(Number(row.timestamp_ms)).toISOString(),
    decimals: row.decimals === null ? null : Number(row.decimals),
    confidence: row.confidence_e4 === null ? null : Number(row.confidence_e4) / 10_000,
    source: row.source,
    verification: parseJson(row.verification_json),
    ingestion_timestamp:
      row.ingestion_timestamp_ms === null
        ? null
        : new Date(Number(row.ingestion_timestamp_ms)).toISOString(),
    metadata_fallback: row.metadata_fallback === null ? null : Number(row.metadata_fallback) === 1,
    failure_mode: row.failure_mode,
    signal_vector: parseJson(row.signal_vector_json),
    created_at: new Date(Number(row.created_at_ms)).toISOString(),
    ttl: new Date(Number(row.ttl_ms)).toISOString(),
  };
}

/**
 * Write the same rows the Supabase writer accepts. Out-of-range prices are
 * skipped, and identical rows inside one batch are deduplicated (the Supabase
 * writer does the same; the table has no unique constraint).
 */
export async function insertTursoPriceRecords(
  client: Client,
  records: PriceRecordInsert[],
  nowMs: number = Date.now()
): Promise<number> {
  const seen = new Set<string>();
  const rows: PreparedPriceRecord[] = [];
  for (const record of records) {
    const prepared = prepareRecord(record, nowMs);
    if (!prepared) continue;
    const key = fingerprint(prepared);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(prepared);
  }

  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + INSERT_BATCH_SIZE);
    await client.batch(
      batch.map((row) => ({
        sql: `INSERT INTO price_records(
          provider,symbol,chain,price_e8,timestamp_ms,confidence_e4,source,
          created_at_ms,ttl_ms,failure_mode,signal_vector_json,decimals,
          verification_json,ingestion_timestamp_ms,metadata_fallback
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          row.provider,
          row.symbol,
          row.chain,
          row.priceE8,
          row.timestampMs,
          row.confidenceE4,
          row.source,
          row.createdAtMs,
          row.ttlMs,
          row.failureMode,
          row.signalVectorJson,
          row.decimals,
          row.verificationJson,
          row.ingestionTimestampMs,
          row.metadataFallback,
        ],
      })),
      'write'
    );
  }
  return rows.length;
}

/** Delete rows whose TTL has passed; indexed by ttl_ms. */
export async function deleteExpiredTursoPriceRecords(
  client: Client,
  nowMs: number = Date.now()
): Promise<number> {
  const result = await client.execute({
    sql: 'DELETE FROM price_records WHERE ttl_ms < ?',
    args: [nowMs],
  });
  return Number(result.rowsAffected ?? 0);
}

/** Latest non-expired row, matching `getLatestPrice`'s chain semantics. */
export async function readTursoLatestPriceRecord(
  client: Client,
  params: {
    provider: string;
    symbol: string;
    chain?: string | null;
    nowMs?: number;
  }
): Promise<PriceRecord | null> {
  const conditions = ['provider = ?', 'symbol = ?', 'ttl_ms >= ?'];
  const args: Array<string | number> = [params.provider, params.symbol, params.nowMs ?? Date.now()];
  if (params.chain === null) {
    conditions.push('chain IS NULL');
  } else if (params.chain) {
    conditions.push('chain = ?');
    args.push(params.chain);
  }
  const result = await client.execute({
    sql: `SELECT * FROM price_records WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp_ms DESC LIMIT 1`,
    args,
  });
  const row = result.rows[0] as unknown as PriceRecordRow | undefined;
  return row ? rowToPriceRecord(row) : null;
}

/** Filtered history used by the export/signals routes. */
export async function listTursoPriceRecords(
  client: Client,
  filters: TursoPriceRecordsFilters
): Promise<PriceRecord[]> {
  const conditions: string[] = [];
  const args: Array<string | number> = [];
  if (filters.provider) {
    conditions.push('provider = ?');
    args.push(filters.provider);
  }
  if (filters.symbol) {
    conditions.push('symbol = ?');
    args.push(filters.symbol);
  }
  if (filters.chain) {
    conditions.push('chain = ?');
    args.push(filters.chain);
  }
  if (filters.startTime !== undefined) {
    conditions.push('timestamp_ms >= ?');
    args.push(filters.startTime);
  }
  if (filters.endTime !== undefined) {
    conditions.push('timestamp_ms <= ?');
    args.push(filters.endTime);
  }

  const offset = Number.isFinite(filters.offset) ? Math.max(0, Math.floor(filters.offset!)) : 0;
  const requestedLimit = Number.isFinite(filters.limit)
    ? Math.floor(filters.limit!)
    : MAX_PRICE_RECORDS_QUERY_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_PRICE_RECORDS_QUERY_LIMIT);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const pagination = filters.offset !== undefined ? 'LIMIT ? OFFSET ?' : 'LIMIT ?';
  if (filters.offset !== undefined) {
    args.push(limit, offset);
  } else {
    args.push(limit);
  }

  const result = await client.execute({
    sql: `SELECT * FROM price_records ${where} ORDER BY timestamp_ms DESC ${pagination}`,
    args,
  });
  return result.rows.map((row) => rowToPriceRecord(row as unknown as PriceRecordRow));
}
