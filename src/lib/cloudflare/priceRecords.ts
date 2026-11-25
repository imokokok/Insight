import type { PriceRecord, PriceRecordInsert } from '@/lib/supabase/queries';
import {
  readTursoPriceRecordsFallbackOnMiss,
  readTursoPriceRecordsMode,
  type TursoPriceRecordsMode,
} from '@/lib/turso/price/client';
import { normalizeTimestamp } from '@/lib/utils/timestamp';
import { FAILURE_MODE_VALUES } from '@/types/oracle/signals';

const MAX_PRICE = 999_999_999_999.99999999;
const MAX_QUERY_LIMIT = 10_000;
const INSERT_BATCH_SIZE = 100;

export interface D1Result<T> {
  results?: T[];
  success?: boolean;
  meta?: { changes?: number };
}

export interface D1Statement {
  bind(...values: Array<string | number | null>): D1Statement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result<never>>;
}

export interface PriceRecordsD1Database {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<Array<D1Result<T>>>;
}

export interface PriceRecordsFilters {
  provider?: string;
  symbol?: string;
  chain?: string | null;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

async function readWorkerTextBinding(name: string): Promise<string | undefined> {
  try {
    const workerModule = (await import('cloudflare:workers')) as { env?: unknown };
    const env = workerModule.env;
    if (!env || typeof env !== 'object') return process.env[name];
    const value = (env as Record<string, unknown>)[name];
    if (value === undefined) return process.env[name];
    if (typeof value !== 'string') throw new Error(`Invalid Worker text binding ${name}`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid Worker text binding')) {
      throw error;
    }
    return process.env[name];
  }
}

/** Read mode from the live Worker binding; Vite must not freeze this at build time. */
export async function getPriceRecordsMode(): Promise<TursoPriceRecordsMode> {
  return readTursoPriceRecordsMode(await readWorkerTextBinding('TURSO_PRICE_RECORDS_MODE'));
}

export async function getPriceRecordsFallbackOnMiss(): Promise<boolean> {
  return readTursoPriceRecordsFallbackOnMiss(
    await readWorkerTextBinding('TURSO_PRICE_RECORDS_FALLBACK_ON_MISS')
  );
}

interface PreparedRecord {
  provider: string;
  symbol: string;
  chain: string | null;
  price_e8: string;
  timestamp_ms: number;
  confidence_e4: number | null;
  source: string | null;
  created_at_ms: number;
  ttl_ms: number;
  failure_mode: string | null;
  signal_vector_json: string | null;
  decimals: number | null;
  verification_json: string | null;
  ingestion_timestamp_ms: number | null;
  metadata_fallback: number | null;
}

interface D1PriceRecordRow extends PreparedRecord {
  id: number;
}

function parseJson(value: string | null, field: string): unknown | null {
  if (value === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch (error) {
    throw new Error(`Invalid ${field} JSON in D1 price_records`, { cause: error });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Invalid ${field} object in D1 price_records`);
  }
  return parsed;
}

function parseSignalVector(value: string | null): PriceRecord['signal_vector'] {
  const parsed = parseJson(value, 'signal_vector');
  if (parsed === null) return null;
  const fields = [
    'freshness',
    'sourceReliability',
    'metadataCompleteness',
    'consistency',
    'auditStatus',
  ];
  const vector = parsed as Record<string, unknown>;
  if (
    !fields.every(
      (field) =>
        typeof vector[field] === 'number' &&
        Number.isFinite(vector[field]) &&
        vector[field] >= 0 &&
        vector[field] <= 1
    )
  ) {
    throw new Error('Invalid signal_vector fields in D1 price_records');
  }
  return vector as PriceRecord['signal_vector'];
}

function parseVerification(value: string | null): PriceRecord['verification'] {
  const parsed = parseJson(value, 'verification');
  if (parsed === null) return null;
  const verification = parsed as Record<string, unknown>;
  if (
    typeof verification.contractAddress !== 'string' ||
    !Number.isSafeInteger(verification.chainId) ||
    (verification.chainId as number) <= 0 ||
    typeof verification.explorerUrl !== 'string' ||
    typeof verification.method !== 'string' ||
    (verification.type !== undefined &&
      verification.type !== 'on-chain' &&
      verification.type !== 'api')
  ) {
    throw new Error('Invalid verification fields in D1 price_records');
  }
  return verification as unknown as PriceRecord['verification'];
}

function ttlToMilliseconds(value: string | undefined, nowMs: number): number {
  if (!value) return nowMs + 3_600_000;
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) return timestamp;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return nowMs + 3_600_000;
  const multiplier: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return nowMs + Number(match[1]) * multiplier[match[2]];
}

function prepareRecord(record: PriceRecordInsert, nowMs: number): PreparedRecord | null {
  if (!Number.isFinite(record.price) || record.price <= 0 || record.price > MAX_PRICE) {
    return null;
  }
  const timestamp = normalizeTimestamp(record.timestamp);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null;
  const ingestionTimestamp = record.ingestion_timestamp
    ? normalizeTimestamp(record.ingestion_timestamp)
    : null;
  return {
    provider: record.provider,
    symbol: record.symbol,
    chain: record.chain || null,
    price_e8: record.price.toFixed(8),
    timestamp_ms: timestamp,
    confidence_e4:
      record.confidence === null || record.confidence === undefined
        ? null
        : Math.round(record.confidence * 10_000),
    source: record.source ?? null,
    created_at_ms: nowMs,
    ttl_ms: ttlToMilliseconds(record.ttl, nowMs),
    failure_mode: record.failure_mode ?? null,
    signal_vector_json: record.signal_vector ? JSON.stringify(record.signal_vector) : null,
    decimals: record.decimals ?? null,
    verification_json: record.verification ? JSON.stringify(record.verification) : null,
    ingestion_timestamp_ms:
      ingestionTimestamp !== null && Number.isSafeInteger(ingestionTimestamp)
        ? ingestionTimestamp
        : null,
    metadata_fallback:
      record.metadata_fallback === null || record.metadata_fallback === undefined
        ? null
        : record.metadata_fallback
          ? 1
          : 0,
  };
}

function fingerprint(record: PreparedRecord): string {
  return JSON.stringify({ ...record, ttl_ms: undefined });
}

function isValidD1PriceRecordRow(value: unknown): value is D1PriceRecordRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(row.id) &&
    (row.id as number) > 0 &&
    typeof row.provider === 'string' &&
    typeof row.symbol === 'string' &&
    (row.chain === null || typeof row.chain === 'string') &&
    typeof row.price_e8 === 'string' &&
    Number.isSafeInteger(row.timestamp_ms) &&
    (row.confidence_e4 === null || Number.isSafeInteger(row.confidence_e4)) &&
    (row.source === null || typeof row.source === 'string') &&
    Number.isSafeInteger(row.created_at_ms) &&
    Number.isSafeInteger(row.ttl_ms) &&
    (row.failure_mode === null || typeof row.failure_mode === 'string') &&
    (row.signal_vector_json === null || typeof row.signal_vector_json === 'string') &&
    (row.decimals === null || Number.isSafeInteger(row.decimals)) &&
    (row.verification_json === null || typeof row.verification_json === 'string') &&
    (row.ingestion_timestamp_ms === null || Number.isSafeInteger(row.ingestion_timestamp_ms)) &&
    (row.metadata_fallback === null || row.metadata_fallback === 0 || row.metadata_fallback === 1)
  );
}

function rowToPriceRecord(row: D1PriceRecordRow): PriceRecord {
  const price = Number(row.price_e8);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
    throw new Error('Invalid price_records row price');
  }
  if (row.failure_mode !== null && !FAILURE_MODE_VALUES.includes(row.failure_mode as never)) {
    throw new Error('Invalid failure_mode in D1 price_records');
  }
  return {
    id: String(row.id),
    provider: row.provider,
    symbol: row.symbol,
    chain: row.chain,
    price,
    timestamp: new Date(row.timestamp_ms).toISOString(),
    decimals: row.decimals,
    confidence: row.confidence_e4 === null ? null : row.confidence_e4 / 10_000,
    source: row.source,
    verification: parseVerification(row.verification_json),
    ingestion_timestamp:
      row.ingestion_timestamp_ms === null
        ? null
        : new Date(row.ingestion_timestamp_ms).toISOString(),
    metadata_fallback: row.metadata_fallback === null ? null : row.metadata_fallback === 1,
    failure_mode: row.failure_mode,
    signal_vector: parseSignalVector(row.signal_vector_json),
    created_at: new Date(row.created_at_ms).toISOString(),
    ttl: new Date(row.ttl_ms).toISOString(),
  };
}

/** Stores the short-lived cache in D1 and reaps expired rows in the same batch. */
export async function saveD1PriceRecords(
  database: PriceRecordsD1Database,
  records: PriceRecordInsert[],
  nowMs = Date.now()
): Promise<number> {
  const seen = new Set<string>();
  const rows: PreparedRecord[] = [];
  for (const record of records) {
    const prepared = prepareRecord(record, nowMs);
    if (!prepared) continue;
    const key = fingerprint(prepared);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(prepared);
  }

  const statements: D1Statement[] = [
    database.prepare('DELETE FROM price_records WHERE ttl_ms < ?').bind(nowMs),
  ];
  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
    for (const row of rows.slice(offset, offset + INSERT_BATCH_SIZE)) {
      statements.push(
        database
          .prepare(
            `INSERT INTO price_records(
              provider,symbol,chain,price_e8,timestamp_ms,confidence_e4,source,
              created_at_ms,ttl_ms,failure_mode,signal_vector_json,decimals,
              verification_json,ingestion_timestamp_ms,metadata_fallback
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          )
          .bind(
            row.provider,
            row.symbol,
            row.chain,
            row.price_e8,
            row.timestamp_ms,
            row.confidence_e4,
            row.source,
            row.created_at_ms,
            row.ttl_ms,
            row.failure_mode,
            row.signal_vector_json,
            row.decimals,
            row.verification_json,
            row.ingestion_timestamp_ms,
            row.metadata_fallback
          )
      );
    }
  }
  if (statements.length === 1) {
    await statements[0].run();
    return 0;
  }
  for (let offset = 0; offset < statements.length; offset += INSERT_BATCH_SIZE + 1) {
    await database.batch(statements.slice(offset, offset + INSERT_BATCH_SIZE + 1));
  }
  return rows.length;
}

/**
 * Write through the Cloudflare binding when running in a Worker. The GitHub
 * snapshot collector runs in Node, where Worker bindings do not exist, so its
 * configured production path sends the same bounded batch through the
 * authenticated D1 cron endpoint.
 */
export async function saveD1PriceRecordsForRuntime(
  records: PriceRecordInsert[],
  options: { endpoint?: string; secret?: string; fetcher?: typeof fetch } = {}
): Promise<number> {
  const endpoint = options.endpoint ?? process.env.TURSO_PRICE_RECORDS_INGEST_URL;
  if (!endpoint) {
    return saveD1PriceRecords(await getPriceRecordsD1Database(), records);
  }

  const secret = options.secret ?? process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is required for remote D1 price_records writes');

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch (error) {
    throw new Error('Invalid TURSO_PRICE_RECORDS_INGEST_URL', { cause: error });
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/api/cron/price-records'
  ) {
    throw new Error('TURSO_PRICE_RECORDS_INGEST_URL must be the HTTPS price-records cron endpoint');
  }

  let saved = 0;
  for (let offset = 0; offset < records.length; offset += 100) {
    const batch = records.slice(offset, offset + 100);
    const response = await (options.fetcher ?? fetch)(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ records: batch }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Remote D1 price_records write failed with HTTP ${response.status}`);
    }
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      !Number.isSafeInteger((payload as Record<string, unknown>).saved) ||
      ((payload as Record<string, unknown>).saved as number) < 0 ||
      ((payload as Record<string, unknown>).saved as number) > batch.length
    ) {
      throw new Error('Remote D1 price_records endpoint returned an invalid response');
    }
    saved += (payload as { saved: number }).saved;
  }
  return saved;
}

function buildWhere(
  filters: PriceRecordsFilters,
  nowMs: number
): {
  where: string;
  values: Array<string | number>;
} {
  const conditions = ['ttl_ms >= ?'];
  const values: Array<string | number> = [nowMs];
  for (const field of ['provider', 'symbol'] as const) {
    const value = filters[field];
    if (value) {
      conditions.push(`${field} = ?`);
      values.push(value);
    }
  }
  if (filters.chain === null) conditions.push('chain IS NULL');
  else if (filters.chain) {
    conditions.push('chain = ?');
    values.push(filters.chain);
  }
  if (filters.startTime !== undefined) {
    conditions.push('timestamp_ms >= ?');
    values.push(filters.startTime);
  }
  if (filters.endTime !== undefined) {
    conditions.push('timestamp_ms <= ?');
    values.push(filters.endTime);
  }
  return { where: conditions.join(' AND '), values };
}

export async function listD1PriceRecords(
  database: PriceRecordsD1Database,
  filters: PriceRecordsFilters,
  nowMs = Date.now()
): Promise<PriceRecord[]> {
  const { where, values } = buildWhere(filters, nowMs);
  const requested = Number.isFinite(filters.limit) ? Math.floor(filters.limit!) : MAX_QUERY_LIMIT;
  const limit = Math.min(Math.max(1, requested), MAX_QUERY_LIMIT);
  const offset = Number.isFinite(filters.offset) ? Math.max(0, Math.floor(filters.offset!)) : 0;
  const result = await database
    .prepare(
      `SELECT * FROM price_records WHERE ${where} ORDER BY timestamp_ms DESC LIMIT ? OFFSET ?`
    )
    .bind(...values, limit, offset)
    .all<unknown>();
  const records: PriceRecord[] = [];
  for (const row of result.results ?? []) {
    if (!isValidD1PriceRecordRow(row)) throw new Error('Invalid price_records row from D1');
    records.push(rowToPriceRecord(row));
  }
  return records;
}

export async function getLatestD1PriceRecord(
  database: PriceRecordsD1Database,
  params: { provider: string; symbol: string; chain?: string | null },
  nowMs = Date.now()
): Promise<PriceRecord | null> {
  const records = await listD1PriceRecords(database, { ...params, limit: 1 }, nowMs);
  return records[0] ?? null;
}

/** Resolve the binding only when the D1 backend is selected. */
export async function getPriceRecordsD1Database(): Promise<PriceRecordsD1Database> {
  const workerModule = (await import('cloudflare:workers')) as { env?: unknown };
  const env = workerModule.env;
  if (!env || typeof env !== 'object') throw new Error('Cloudflare Worker environment unavailable');
  const database = (env as Record<string, unknown>).PRICE_RECORDS;
  if (
    !database ||
    typeof database !== 'object' ||
    typeof (database as { prepare?: unknown }).prepare !== 'function' ||
    typeof (database as { batch?: unknown }).batch !== 'function'
  ) {
    throw new Error('Cloudflare D1 binding PRICE_RECORDS is unavailable');
  }
  return database as PriceRecordsD1Database;
}
