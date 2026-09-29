/** @jest-environment node */
import { NextRequest } from 'next/server';

import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';

import { POST as v1Post } from '../../../v1/prices/batch/route';
import { POST as legacyPost } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
  };
});
jest.mock('@/lib/oracles/base/databaseOperations', () => ({ fetchPriceWithDatabase: jest.fn() }));

const mockFetch = fetchPriceWithDatabase as jest.MockedFunction<typeof fetchPriceWithDatabase>;
const queries = [
  { provider: 'chainlink', symbol: 'ETH', chain: 'ethereum' },
  { provider: 'api3', symbol: 'BTC', chain: 'ethereum' },
];
const price = {
  provider: 'chainlink',
  symbol: 'ETH',
  chain: 'ethereum',
  price: 2000,
  timestamp: 1,
};

function request(body: unknown, signal?: AbortSignal) {
  return new NextRequest('https://test/api/oracles/batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

async function invokeLegacy(body: unknown, signal?: AbortSignal) {
  return (legacyPost as unknown as (request: NextRequest) => Promise<Response>)(
    request(body, signal)
  );
}

async function invokeV1(body: { queries: typeof queries; forceRefresh: boolean }) {
  return (v1Post as unknown as (request: NextRequest, context: unknown) => Promise<Response>)(
    request(body),
    { requestId: 'v1-test', validated: { body } }
  );
}

it('legacy POST keeps success:false and item order on partial upstream failure', async () => {
  mockFetch
    .mockResolvedValueOnce(price as never)
    .mockRejectedValueOnce(new Error('RPC unavailable'));
  const response = await invokeLegacy({ queries, forceRefresh: true });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toContain('s-maxage=5');
  expect(body).toEqual({
    success: false,
    data: [
      { ...queries[0], price, error: null },
      { ...queries[1], price: null, error: 'RPC unavailable' },
    ],
  });
  expect(mockFetch).toHaveBeenNthCalledWith(
    1,
    'chainlink',
    'ETH',
    'ethereum',
    true,
    true,
    expect.any(AbortSignal)
  );
});

it('legacy POST fans request cancellation out to per-query signals', async () => {
  const parent = new AbortController();
  const observed: AbortSignal[] = [];
  mockFetch.mockImplementation(
    async (_provider, _symbol, _chain, _database, _refresh, signal) =>
      new Promise((_, reject) => {
        observed.push(signal!);
        signal!.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
        if (signal!.aborted) reject(new Error('cancelled'));
      })
  );

  const pending = invokeLegacy({ queries }, parent.signal);
  await new Promise((resolve) => setImmediate(resolve));
  expect(observed).toHaveLength(2);
  expect(observed[0]).not.toBe(observed[1]);

  parent.abort('leave-page');
  const response = await pending;
  const body = await response.json();
  expect(observed.every((signal) => signal.aborted)).toBe(true);
  expect(observed.map((signal) => signal.reason)).toEqual(['leave-page', 'leave-page']);
  expect(body.success).toBe(false);
  expect(body.data.map((entry: { error: string }) => entry.error)).toEqual([
    'cancelled',
    'cancelled',
  ]);
});

it('legacy POST keeps the 400 validation envelope', async () => {
  const response = await invokeLegacy({ queries: Array(21).fill(queries[0]) });
  const body = await response.json();
  expect(response.status).toBe(400);
  expect(body.success).toBe(false);
  expect(body.error.code).toBe('VALIDATION_ERROR');
  expect(mockFetch).not.toHaveBeenCalled();
});

it('v1 POST keeps success:true, request metadata, and partialErrors without a signal', async () => {
  mockFetch
    .mockResolvedValueOnce(price as never)
    .mockRejectedValueOnce(new Error('RPC unavailable'));
  const response = await invokeV1({ queries, forceRefresh: false });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
  expect(body.data).toEqual([
    { ...queries[0], price, error: null },
    { ...queries[1], price: null, error: 'RPC unavailable' },
  ]);
  expect(body.meta).toMatchObject({
    requestId: 'v1-test',
    queryCount: 2,
    partialErrors: [{ ...queries[1], error: 'RPC unavailable' }],
  });
  expect(mockFetch).toHaveBeenNthCalledWith(1, 'chainlink', 'ETH', 'ethereum', true, false);
  expect(mockFetch.mock.calls[0]).toHaveLength(5);
  expect(mockFetch.mock.calls[1]).toHaveLength(5);
});
