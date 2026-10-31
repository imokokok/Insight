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
