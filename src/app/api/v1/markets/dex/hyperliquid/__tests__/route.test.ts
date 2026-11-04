/** @jest-environment node */
import { NextRequest } from 'next/server';

import {
  getHyperliquidPerpMarketSnapshot,
  hyperliquidPerpMarketProfile,
} from '@/lib/dex/hyperliquidPerpMarket';

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

jest.mock('@/lib/dex/hyperliquidPerpMarket', () => ({
  HYPERLIQUID_REVIEWED_PERP_MARKETS: ['BTC', 'ETH', 'HYPE'],
  getHyperliquidPerpMarketSnapshot: jest.fn(),
  hyperliquidPerpMarketProfile: jest.fn((market: string) => ({ coin: market })),
}));

const mockedSnapshot = jest.mocked(getHyperliquidPerpMarketSnapshot);
const mockedProfile = jest.mocked(hyperliquidPerpMarketProfile);
const requestHandler = GET as unknown as (
  request: NextRequest,
  context: { requestId: string }
) => Promise<Response>;

beforeEach(() => {
  jest.clearAllMocks();
});

it('rejects an unreviewed market before reading Hyperliquid', async () => {
  const response = await requestHandler(
    new NextRequest('https://test/api/v1/markets/dex/hyperliquid?market=SOL'),
    { requestId: 'test' }
  );

  expect(response.status).toBe(400);
  expect(mockedSnapshot).not.toHaveBeenCalled();
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: { code: 'INVALID_MARKET' },
  });
});

it('uses the reviewed default market and returns read-only CLOB caveats', async () => {
  mockedSnapshot.mockResolvedValue({
    source: 'dex-market',
    venue: 'hyperliquid-perp',
    network: 'hyperliquid:mainnet',
    market: 'BTC-PERP',
    coin: 'BTC',
    sourceFreshnessSeconds: 2,
    observedAt: '2026-10-25T00:00:02.000Z',
    book: {
      timestamp: '2026-10-25T00:00:00.000Z',
      displayedLevelsPerSide: 20,
      bestBid: 100,
      bestAsk: 101,
      spreadBps: 100,
      bidDepthNotionalUsd: 100_000,
      askDepthNotionalUsd: 100_000,
    },
    perpetual: {
      markPrice: 100.5,
      midPrice: 100.5,
      oraclePrice: 100.25,
      markDeviationBpsFromOracle: 24.9,
      fundingRate: 0.00001,
      openInterest: 12_000,
      dayNotionalVolume: 2_500_000,
      sizeDecimals: 5,
      maxLeverage: 40,
    },
    estimates: [],
  });

  const response = await requestHandler(
    new NextRequest('https://test/api/v1/markets/dex/hyperliquid'),
    { requestId: 'test' }
  );

  expect(response.status).toBe(200);
  expect(mockedProfile).toHaveBeenCalledWith('BTC');
  const body = await response.json();
  expect(body.data.market).toBe('BTC-PERP');
  expect(body.data.caveats).toContain(
    'Hyperliquid perpetual-market evidence is read-only CLOB context, not an oracle-consensus vote or venue-independent fair price.'
  );
});
