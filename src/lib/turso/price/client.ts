// The cron runner executes committed bundles without node_modules. The Web
// client stays self-contained when bundled, unlike the native Node client
// which dynamically requires a platform-specific libSQL binary at runtime.
import { createClient, type Client } from '@libsql/client/web';

export type TursoPriceWriteMode = 'legacy' | 'shadow' | 'primary';

export interface TursoPriceConfig {
  url: string;
  authToken: string;
  partitionKey: string;
}

export interface TursoPriceRetentionPolicy {
  rawRetentionDays: number;
}

export interface TursoFeedRegistryPolicy {
  /** Maximum age of a mirrored registry that a collector may trust. */
  maxAgeMs: number;
}

export type TursoPriceRecordsMode = 'supabase' | 'shadow' | 'turso';

export interface TursoPricePayloadCompactionPolicy {
  /** ACKed slot payloads older than this are replaced with a compact summary. */
  ackedPayloadRetentionDays: number;
}

/**
 * The raw stream is only safe to read from Turso after a recorded cutover.
 * It lets readers combine the immutable Supabase history before this instant
 * with Turso rows at and after it.
 */
export function readTursoPriceReadCutoverMs(
  value: string | undefined = process.env.TURSO_PRICE_READ_CUTOVER_AT
): number {
  if (!value?.trim()) throw new Error('Missing TURSO_PRICE_READ_CUTOVER_AT for Turso primary mode');
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('Invalid TURSO_PRICE_READ_CUTOVER_AT');
  }
  return parsed;
}

let cachedClient: Client | undefined;

export function readTursoPriceWriteMode(
  value: string | undefined = process.env.TURSO_PRICE_WRITE_MODE
): TursoPriceWriteMode {
  if (value === undefined || value === '' || value === 'legacy') return 'legacy';
  if (value === 'shadow' || value === 'primary') return value;
  throw new Error('TURSO_PRICE_WRITE_MODE must be legacy, shadow, or primary');
}

export function readTursoPriceConfig(env: NodeJS.ProcessEnv = process.env): TursoPriceConfig {
  const url = env.TURSO_PRICE_DATABASE_URL?.trim();
  const authToken = env.TURSO_PRICE_AUTH_TOKEN?.trim();
  const partitionKey = (env.TURSO_PRICE_PARTITION_KEY ?? 'bootstrap').trim();
  if (!url || !/^libsqls?:\/\//.test(url)) {
    throw new Error('Missing or invalid TURSO_PRICE_DATABASE_URL');
  }
  if (!authToken) throw new Error('Missing TURSO_PRICE_AUTH_TOKEN');
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(partitionKey)) {
    throw new Error('Invalid TURSO_PRICE_PARTITION_KEY');
  }
  return { url, authToken, partitionKey };
}

/**
 * Fine-grained Turso events are a short-lived operational/audit layer. The
 * durable long-range business projection remains in Supabase. Keeping this
 * bounded prevents the raw table and its indexes from growing linearly.
 */
export function readTursoPriceRetentionPolicy(
  env: NodeJS.ProcessEnv = process.env
): TursoPriceRetentionPolicy {
  const raw = env.TURSO_PRICE_RAW_RETENTION_DAYS ?? '30';
  if (!/^\d+$/.test(raw)) throw new Error('Invalid TURSO_PRICE_RAW_RETENTION_DAYS');
  const rawRetentionDays = Number(raw);
  if (!Number.isSafeInteger(rawRetentionDays) || rawRetentionDays < 1 || rawRetentionDays > 3_650) {
    throw new Error('Invalid TURSO_PRICE_RAW_RETENTION_DAYS');
  }
  return { rawRetentionDays };
}

/**
 * price_records is a 24-hour cache in front of the price API. It is the last
 * high-write Supabase table with Postgres indexes (including two GIN indexes),
 * so it can be moved to Turso independently of the raw price stream.
 * `supabase` keeps today's behaviour; `shadow` writes both and reads Supabase;
 * `turso` writes Turso and reads it first, falling back to Supabase on failure.
 */
export function readTursoPriceRecordsMode(
  value: string | undefined = process.env.TURSO_PRICE_RECORDS_MODE
): TursoPriceRecordsMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'shadow' || value === 'turso') return value;
  throw new Error('TURSO_PRICE_RECORDS_MODE must be supabase, shadow, or turso');
}

/**
 * During the first 24 hours after switching reads to Turso, Supabase still
 * holds rows written before the cutover. Missing Turso rows must therefore
 * fall back to Supabase; after one TTL the flag can be turned off.
 */
export function readTursoPriceRecordsFallbackOnMiss(
  value: string | undefined = process.env.TURSO_PRICE_RECORDS_FALLBACK_ON_MISS
): boolean {
  if (value === undefined || value === '' || value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('TURSO_PRICE_RECORDS_FALLBACK_ON_MISS must be true or false');
}

/**
 * Raw slots stay for the full raw-retention window so quarantined or
 * unacknowledged slots can still be replayed. ACKed payloads are only needed
 * until the projector has consumed them, so their compact summary can replace
 * the 83 KB body earlier. Defaults to the raw window to preserve today's
 * behaviour; setting it to 7 caps payload storage at roughly 7 days.
 */
export function readTursoPricePayloadCompactionPolicy(
  env: NodeJS.ProcessEnv = process.env,
  retention: TursoPriceRetentionPolicy = readTursoPriceRetentionPolicy(env)
): TursoPricePayloadCompactionPolicy {
  const raw = env.TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS ?? String(retention.rawRetentionDays);
  if (!/^\d+$/.test(raw)) throw new Error('Invalid TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS');
  const ackedPayloadRetentionDays = Number(raw);
  if (
    !Number.isSafeInteger(ackedPayloadRetentionDays) ||
    ackedPayloadRetentionDays < 1 ||
    ackedPayloadRetentionDays > retention.rawRetentionDays
  ) {
    throw new Error('Invalid TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS');
  }
  return { ackedPayloadRetentionDays };
}

/**
 * Feed discovery remains administered in Supabase, but collection reads the
 * mirrored last-known-good registry from Turso while it is within this bound.
 * A bounded TTL prevents a long-lived outage from silently preserving a feed
 * that operators intentionally deactivated.
 */
export function readTursoFeedRegistryPolicy(
  env: NodeJS.ProcessEnv = process.env
): TursoFeedRegistryPolicy {
  const raw = env.TURSO_FEED_REGISTRY_MAX_AGE_SECONDS ?? '86400';
  if (!/^\d+$/.test(raw)) throw new Error('Invalid TURSO_FEED_REGISTRY_MAX_AGE_SECONDS');
  const maxAgeSeconds = Number(raw);
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 300 || maxAgeSeconds > 7 * 86_400) {
    throw new Error('Invalid TURSO_FEED_REGISTRY_MAX_AGE_SECONDS');
  }
  return { maxAgeMs: maxAgeSeconds * 1_000 };
}

export function getTursoPriceClient(): Client {
  if (!cachedClient) {
    const { url, authToken } = readTursoPriceConfig();
    cachedClient = createClient({ url, authToken, concurrency: 4 });
  }
  return cachedClient;
}

/** Test seam; production code never needs to discard a healthy remote client. */
export function resetTursoPriceClientForTests(): void {
  cachedClient = undefined;
}
