/** @jest-environment node */
import { encodeAbiParameters } from 'viem';

import {
  clearRpcMetadataCache,
  flushRpcMetadataCache,
  primeRpcMetadataCache,
} from '@/lib/oracles/utils/rpcMetadataCache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Blockchain } from '@/types/oracle';

import { api3NetworkService } from '../api3NetworkService';
import { chainlinkOnChainService } from '../chainlinkOnChainService';

jest.mock('@/lib/supabase/server');
jest.mock('@api3/contracts', () => ({
  computeCommunalApi3ReaderProxyV1Address: () => '0x' + 'cd'.repeat(20),
}));
jest.mock('../chainlinkDataSources', () => ({
  ...jest.requireActual('../chainlinkDataSources'),
  getChainlinkRPCConfig: () => ({ endpoints: ['https://rpc.invalid'], chainId: 1, name: 'test' }),
}));

let saved: unknown[];
let round: bigint;
let decimals: bigint;
const uint = (value: bigint) => encodeAbiParameters([{ type: 'uint256' }], [value]);
beforeEach(() => {
  saved = [];
  round = 100n;
  decimals = 8n;
  chainlinkOnChainService.clearCache();
  chainlinkOnChainService.resetEndpointHealth();
  const query = {
    select: jest.fn(),
    gte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    abortSignal: jest.fn(),
  };
  for (const fn of [query.select, query.gte, query.order, query.limit]) fn.mockReturnValue(query);
  query.abortSignal.mockImplementation(async () => ({ data: saved, error: null }));
  (createServiceRoleClient as jest.Mock).mockReturnValue({
    from: () => query,
    rpc: (_: string, params: { p_rows: unknown[] }) => ({
      abortSignal: async () => {
        saved = params.p_rows;
        return { data: saved.length, error: null };
      },
    }),
  });
  global.fetch = jest.fn(async (_: unknown, options?: RequestInit) => {
    const request = JSON.parse(String(options?.body));
    const selector = request.params[0].data;
    const now = BigInt(Math.floor(Date.now() / 1000));
    let data: `0x${string}`;
    if (selector === '0x313ce567') data = uint(decimals);
    else if (selector === '0x7284e416')
      data = encodeAbiParameters([{ type: 'string' }], ['ETH / USD']);
    else if (selector === '0x54fd4d50') data = uint(4n);
    else if (selector === '0xfeaf968c')
      data = encodeAbiParameters(
        [
          { type: 'uint80' },
          { type: 'int256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint80' },
        ],
        [round, 3000n * 10n ** decimals, now, now, round]
      );
    else
      data = encodeAbiParameters(
        [{ type: 'int224' }, { type: 'uint32' }],
        [300000000000n, Number(now)]
      );
    return {
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: request.id, result: data }),
    } as Response;
  });
});

test('Chainlink cold read uses four calls, fresh-process reuse uses one and still reads a new oracle round', async () => {
  const address = ('0x' + 'ab'.repeat(20)) as `0x${string}`;
  const first = await chainlinkOnChainService.getPrice('ETH', 1, undefined, address);
  expect(first?.price).toBe(3000);
  expect(global.fetch).toHaveBeenCalledTimes(4);
  expect(await flushRpcMetadataCache()).toBe(1);
  chainlinkOnChainService.clearCache();
  expect(await primeRpcMetadataCache()).toBe(1);
  (global.fetch as jest.Mock).mockClear();
  round = 101n;
  const second = await chainlinkOnChainService.getPrice('ETH', 1, undefined, address);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(second).toMatchObject({
    price: 3000,
    decimals: 8,
    description: 'ETH / USD',
    version: 4n,
    roundId: 101n,
    decimalsIsFallback: false,
  });
  expect(await flushRpcMetadataCache()).toBe(0);
});

test('API3 fresh-process reuse eliminates decimals calls and preserves live price and confidence', async () => {
  const first = await api3NetworkService.getPrice('ETH', Blockchain.ETHEREUM, undefined, 'ETH/USD');
  expect(first).toMatchObject({ price: 3000, confidence: 0.98, decimals: 8 });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(await flushRpcMetadataCache()).toBe(1);
  clearRpcMetadataCache();
  expect(await primeRpcMetadataCache()).toBe(1);
  (global.fetch as jest.Mock).mockClear();
  const second = await api3NetworkService.getPrice(
    'ETH',
    Blockchain.ETHEREUM,
    undefined,
    'ETH/USD'
  );
  expect(second).toMatchObject({ price: 3000, confidence: 0.98, decimals: 8 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(await flushRpcMetadataCache()).toBe(0);
});

test('Chainlink aggregator phase change refreshes decimals before scaling the new round', async () => {
  const address = ('0x' + 'ab'.repeat(20)) as `0x${string}`;
  await chainlinkOnChainService.getPrice('ETH', 1, undefined, address);
  await flushRpcMetadataCache();
  chainlinkOnChainService.clearCache();
  await primeRpcMetadataCache();
  (global.fetch as jest.Mock).mockClear();
  round = (2n << 64n) | 101n;
  decimals = 18n;
  const result = await chainlinkOnChainService.getPrice('ETH', 1, undefined, address);
  expect(result).toMatchObject({ price: 3000, decimals: 18, roundId: round });
  expect(global.fetch).toHaveBeenCalledTimes(4);
  expect(await flushRpcMetadataCache()).toBe(1);
});

test('malformed decimals never become trusted cross-process metadata', async () => {
  (global.fetch as jest.Mock).mockImplementation(async (_: unknown, options?: RequestInit) => {
    const request = JSON.parse(String(options?.body));
    const data =
      request.params[0].data === '0x313ce567'
        ? '0x'
        : encodeAbiParameters(
            [{ type: 'int224' }, { type: 'uint32' }],
            [300000000000n, Math.floor(Date.now() / 1000)]
          );
    return { ok: true, json: async () => ({ result: data }) };
  });
  const result = await api3NetworkService.getPrice(
    'ETH',
    Blockchain.ETHEREUM,
    undefined,
    'ETH/USD'
  );
  expect(result?.confidence).toBe(0.45);
  expect(await flushRpcMetadataCache()).toBe(0);
});
