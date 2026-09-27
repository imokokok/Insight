/** @jest-environment node */
import { createServiceRoleClient } from '@/lib/supabase/server';

import {
  clearRpcMetadataCache,
  flushRpcMetadataCache,
  getRpcMetadata,
  primeRpcMetadataCache,
  rememberRpcMetadata,
  RPC_METADATA_TTL_MS,
} from '../rpcMetadataCache';

jest.mock('@/lib/supabase/server');
const address = '0x' + 'ab'.repeat(20);
const metadata = { decimals: 8, description: 'ETH / USD', version: '4', phase: 0 };
const now = Date.parse('2026-09-27T12:00:00Z');
const row = (data: unknown = metadata, checkedAt = now) => ({
  provider: 'chainlink',
  chain_id: 1,
  address,
  checked_at: new Date(checkedAt).toISOString(),
  data,
});

function database(data: unknown = [], error: unknown = null) {
  const query = {
    select: jest.fn(),
    gte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    abortSignal: jest.fn(),
  };
  for (const method of [query.select, query.gte, query.order, query.limit])
    method.mockReturnValue(query);
  query.abortSignal.mockResolvedValue({ data, error });
  const rpc = jest.fn().mockImplementation((_: string, params: { p_rows: unknown[] }) => ({
    abortSignal: jest.fn().mockResolvedValue({ data: params.p_rows.length, error: null }),
  }));
  (createServiceRoleClient as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue(query),
    rpc,
  });
  return { query, rpc };
}

beforeEach(() => {
  clearRpcMetadataCache();
  jest.spyOn(Date, 'now').mockReturnValue(now);
});
afterEach(() => jest.restoreAllMocks());

test('reuses validated persisted metadata across fresh processes without writing hits', async () => {
  const db = database([row()]);
  expect(await primeRpcMetadataCache()).toBe(1);
  expect(getRpcMetadata('chainlink', 1, address.toUpperCase().replace('0X', '0x'))).toEqual(
    metadata
  );
  expect(await flushRpcMetadataCache()).toBe(0);
  expect(db.rpc).not.toHaveBeenCalled();
  clearRpcMetadataCache();
  expect(getRpcMetadata('chainlink', 1, address)).toBeNull();
  expect(await primeRpcMetadataCache()).toBe(1);
  expect(getRpcMetadata('chainlink', 1, address)).toEqual(metadata);
});

test('never reuses expired, future-dated, malformed or differently scoped metadata', async () => {
  database([
    row(metadata, now - RPC_METADATA_TTL_MS),
    row(metadata, now + 1),
    row({ decimals: 8 }),
    row({ ...metadata, decimals: 256 }),
    row({ ...metadata, version: 'not-a-version' }),
    row(),
  ]);
  expect(await primeRpcMetadataCache()).toBe(1);
  expect(getRpcMetadata('api3', 1, address)).toBeNull();
  expect(getRpcMetadata('chainlink', 8453, address)).toBeNull();
  expect(getRpcMetadata('chainlink', 1, '0x' + 'cd'.repeat(20))).toBeNull();
  jest.spyOn(Date, 'now').mockReturnValue(now + RPC_METADATA_TTL_MS);
  expect(getRpcMetadata('chainlink', 1, address)).toBeNull();
});

test('preload outages leave live metadata intact and a stale preload cannot overwrite it', async () => {
  rememberRpcMetadata('chainlink', 1, address, metadata);
  database(null, { message: 'unavailable' });
  expect(await primeRpcMetadataCache()).toBe(0);
  database([row({ ...metadata, decimals: 18 }, now - 1000)]);
  expect(await primeRpcMetadataCache()).toBe(0);
  expect(getRpcMetadata('chainlink', 1, address)).toEqual(metadata);
});

test('batches refreshed entries and retries failed persistence without dropping a newer refresh', async () => {
  const db = database();
  rememberRpcMetadata('chainlink', 1, address, metadata);
  db.rpc.mockReturnValueOnce({
    abortSignal: jest.fn().mockResolvedValue({ error: { message: 'offline' } }),
  });
  expect(await flushRpcMetadataCache()).toBe(0);
  db.rpc.mockImplementationOnce(() => ({
    abortSignal: async () => {
      rememberRpcMetadata('chainlink', 1, address, { ...metadata, decimals: 18 });
      return { data: 1, error: null };
    },
  }));
  expect(await flushRpcMetadataCache()).toBe(1);
  expect(await flushRpcMetadataCache()).toBe(1);
  expect(await flushRpcMetadataCache()).toBe(0);
  expect(db.rpc.mock.calls[2][1].p_rows[0].data.decimals).toBe(18);
});

test('more than 100 refreshed contracts use bounded persistence batches', async () => {
  const db = database();
  for (let i = 1; i <= 205; i++)
    rememberRpcMetadata('api3', 1, '0x' + i.toString(16).padStart(40, '0'), { decimals: 18 });
  expect(await flushRpcMetadataCache()).toBe(205);
  expect(db.rpc.mock.calls.map((call) => call[1].p_rows.length)).toEqual([100, 100, 5]);
});
