/** @jest-environment node */
import { NextRequest } from 'next/server';

import { getAerodromeSlipstreamMarketSnapshot } from '@/lib/dex/aerodromeSlipstream';

import { GET } from '../route';

jest.mock('@/lib/api/handler', () => ({
  createApiHandler: (handler: unknown) => handler,
  createOptionsHandler: () => jest.fn(),
  ApiResponseBuilder: {
    success: (data: unknown, options?: { requestId?: string }) => ({
      success: true,
      data,
      meta: { requestId: options?.requestId },
    }),
    error: (code: string, message: string) => ({ success: false, error: { code, message } }),
  },
  V1_READ_ONLY_MIDDLEWARES: ['read-api-key-and-credit'],
}));

jest.mock('@/lib/dex/aerodromeSlipstream', () => ({
  getAerodromeSlipstreamMarketSnapshot: jest.fn(),
}));

const mockedSnapshot = jest.mocked(getAerodromeSlipstreamMarketSnapshot);
const requestHandler = GET as unknown as (
  request: NextRequest,
  context: { requestId: string }
) => Promise<Response>;

beforeEach(() => {
  jest.clearAllMocks();
});

it('returns reviewed Aerodrome evidence with a dynamic-fee caveat', async () => {
  mockedSnapshot.mockResolvedValue({
    source: 'dex-market',
    venue: 'aerodrome-slipstream',
    chainId: 8453,
    market: 'WETH/USDC',
    sourceFreshnessSeconds: 2,
    observedAt: '2026-10-25T00:00:02.000Z',
    block: { number: '1', hash: `0x${'a'.repeat(64)}`, timestamp: '2026-10-25T00:00:00.000Z' },
    contracts: {
      factory: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A',
      quoterV2: '0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0',
      pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59',
      token0: '0x4200000000000000000000000000000000000006',
      token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      tickSpacing: 100,
      feePips: 150,
      codeIdentity: {
        factory: `0x${'1'.repeat(64)}`,
        quoterV2: `0x${'2'.repeat(64)}`,
        pool: `0x${'3'.repeat(64)}`,
      },
    },
    spot: { tick: 0, token1PerToken0: 1_000_000_000_000 },
    twap: {
      windowSeconds: 1_800,
      tick: 0,
      token1PerToken0: 1_000_000_000_000,
      deviationBpsFromSpot: 0,
    },
    activeLiquidityRaw: '1',
    poolBalances: { token0Raw: '1', token0: 1e-18, token1Raw: '1', token1: 0.000001 },
    quotes: [],
  });

  const response = await requestHandler(
    new NextRequest('https://test/api/v1/markets/dex/aerodrome'),
    { requestId: 'test' }
  );

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data).toMatchObject({
    venue: 'aerodrome-slipstream',
    market: 'WETH/USDC',
    contracts: { codeIdentity: { pool: `0x${'3'.repeat(64)}` } },
  });
  expect(body.data.caveats).toContain(
    'feePips is the pool fee read at the pinned block and can change with Aerodrome fee configuration.'
  );
});

it('fails closed when fresh Aerodrome evidence cannot be fetched', async () => {
  mockedSnapshot.mockRejectedValue(new Error('rpc unavailable'));

  const response = await requestHandler(
    new NextRequest('https://test/api/v1/markets/dex/aerodrome'),
    { requestId: 'test' }
  );

  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: { code: 'AERODROME_SLIPSTREAM_MARKET_UNAVAILABLE' },
  });
});
