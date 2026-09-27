import { z } from 'zod';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('RpcMetadataCache');
export const RPC_METADATA_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 4096;
const decimals = z.number().int().min(0).max(255);
const identity = {
  chain_id: z.number().int().positive().safe(),
  address: z.string().regex(/^0x[0-9a-f]{40}$/),
  checked_at: z.string().datetime({ offset: true }),
};
const rowSchema = z.discriminatedUnion('provider', [
  z
    .object({
      ...identity,
      provider: z.literal('chainlink'),
      data: z
        .object({
          decimals,
          phase: z.number().int().min(0).max(65535),
          description: z.string().max(4096),
          version: z.string().regex(/^(0|[1-9][0-9]{0,77})$/),
        })
        .strict(),
    })
    .strict(),
  z
    .object({ ...identity, provider: z.literal('api3'), data: z.object({ decimals }).strict() })
    .strict(),
]);
type Row = z.infer<typeof rowSchema>;
type Provider = Row['provider'];
export type ChainlinkMetadata = Extract<Row, { provider: 'chainlink' }>['data'];
export type Api3Metadata = Extract<Row, { provider: 'api3' }>['data'];
const entries = new Map<string, Row>();
const dirty = new Map<string, Row>();

function key(provider: Provider, chainId: number, address: string): string {
  return `${provider}:${chainId}:${address.toLowerCase()}`;
}

function fresh(row: Row, now: number): boolean {
  const age = now - Date.parse(row.checked_at);
  return age >= 0 && age < RPC_METADATA_TTL_MS;
}

export function clearRpcMetadataCache(): void {
  entries.clear();
  dirty.clear();
}

export function getRpcMetadata(
  provider: 'chainlink',
  chainId: number,
  address: string
): ChainlinkMetadata | null;
export function getRpcMetadata(
  provider: 'api3',
  chainId: number,
  address: string
): Api3Metadata | null;
export function getRpcMetadata(
  provider: Provider,
  chainId: number,
  address: string
): Row['data'] | null {
  const cacheKey = key(provider, chainId, address);
  const row = entries.get(cacheKey);
  if (!row) return null;
  if (!fresh(row, Date.now())) {
    entries.delete(cacheKey);
    return null;
  }
  return row.data;
}

/** Only actual successful contract reads enter this cache; catalog defaults never do. */
export function rememberRpcMetadata(
  provider: Provider,
  chainId: number,
  address: string,
  data: unknown,
  checkedAt: number = Date.now()
): void {
  const parsed = rowSchema.safeParse({
    provider,
    chain_id: chainId,
    address: address.toLowerCase(),
    checked_at: new Date(checkedAt).toISOString(),
    data,
  });
  if (!parsed.success || !fresh(parsed.data, Date.now())) return;
  const row = parsed.data;
  const cacheKey = key(provider, chainId, address);
  const existing = entries.get(cacheKey);
  if (existing && Date.parse(existing.checked_at) > checkedAt) return;
  if (!existing && entries.size >= MAX_ENTRIES) {
    // Bounded process memory. Eviction only causes another live read.
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
  entries.set(cacheKey, row);
  dirty.set(cacheKey, row);
  if (dirty.size > MAX_ENTRIES) {
    const oldest = dirty.keys().next().value;
    if (oldest !== undefined) dirty.delete(oldest);
  }
}

/** One bounded optional read per runner batch, never one DB request per feed. */
export async function primeRpcMetadataCache(): Promise<number> {
  try {
    const { data, error } = await createServiceRoleClient()
      .from('oracle_rpc_metadata_cache')
      .select('provider,chain_id,address,checked_at,data')
      .gte('checked_at', new Date(Date.now() - RPC_METADATA_TTL_MS).toISOString())
      .order('checked_at', { ascending: false })
      .limit(1000)
      .abortSignal(AbortSignal.timeout(5000));
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid RPC metadata cache response');
    let loaded = 0;
    for (const value of data) {
      const parsed = rowSchema.safeParse(value);
      if (!parsed.success || !fresh(parsed.data, Date.now())) continue;
      const row = parsed.data;
      const cacheKey = key(row.provider, row.chain_id, row.address);
      const existing = entries.get(cacheKey);
      if (existing && Date.parse(existing.checked_at) >= Date.parse(row.checked_at)) continue;
      if (entries.size >= MAX_ENTRIES && !entries.has(cacheKey)) continue;
      entries.set(cacheKey, row);
      loaded++;
    }
    return loaded;
  } catch (error) {
    // Missing migration, outages and invalid data fall back to contract reads.
    logger.warn('Optional RPC metadata preload unavailable', normalizeError(error));
    return 0;
  }
}

/** Persist only refreshed metadata; unchanged hits cause no writes. */
export async function flushRpcMetadataCache(): Promise<number> {
  const pending = [...dirty.entries()].filter(([, row]) => fresh(row, Date.now()));
  let saved = 0;
  try {
    for (let offset = 0; offset < pending.length; offset += 100) {
      const batch = pending.slice(offset, offset + 100);
      const { data, error } = await createServiceRoleClient()
        .rpc('save_oracle_rpc_metadata', { p_rows: batch.map(([, row]) => row) })
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw error;
      if (!Number.isSafeInteger(data) || data < 0 || data > batch.length)
        throw new Error('Invalid RPC metadata persistence count');
      for (const [cacheKey, row] of batch) {
        // A concurrent refresh must not be cleared by an older flush.
        if (dirty.get(cacheKey) === row) dirty.delete(cacheKey);
      }
      saved += data;
    }
  } catch (error) {
    logger.warn('Optional RPC metadata persistence unavailable', normalizeError(error));
  }
  return saved;
}
