/**
 * Monitored-window purchase route dispatch tests.
 *
 * The begin route is the product's cash register, so the invariants tested are
 * the payment ones: a keyless caller is dispatched to x402 with the WINDOW
 * price (never the per-call price), an API-key caller falls through to the
 * legacy credit-metered handler, and the x402 business callback validates the
 * body before persisting anything.
 */

import type { NextRequest } from 'next/server';

import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { beginOracleWatchWindow } from '@/lib/api/services/oracleWatchWindowService';
import { ProductLimitError } from '@/lib/api/services/productLimits';
import { getX402Config, usdToAtomicUnits } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';

import { POST } from '../route';

jest.mock('next/server', () => {
  class NextResponse {
    body: BodyInit | null;
    headers: Headers;
    status: number;

    constructor(body: BodyInit | null, init?: ResponseInit) {
      this.body = body;
      this.headers = new Headers(init?.headers);
      this.status = init?.status ?? 200;
    }

    static json(data: unknown, init?: ResponseInit) {
      return new NextResponse(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers as object) },
      });
    }
  }

  return { NextResponse };
});

jest.mock('@/lib/api/handler', () => ({
  ApiResponseBuilder: { error: jest.fn(), success: jest.fn() },
  createApiHandler: jest.fn(() => jest.fn()),
  createOptionsHandler: jest.fn(() => jest.fn()),
  V1_STANDARD_MIDDLEWARES: [],
}));
jest.mock('@/lib/api/utils', () => ({ CACHE_PRESETS: { noStore: 'no-store' } }));
jest.mock('@/lib/api/x402/config', () => ({
  getX402Config: jest.fn(),
  usdToAtomicUnits: jest.fn((usd: number) => String(Math.round(usd * 1_000_000))),
}));
jest.mock('@/lib/api/x402/guard', () => ({
  handlePaidPreTradeRequest: jest.fn(),
  hasAuthCredentials: jest.fn(),
  isPaidRequest: jest.fn(),
}));
jest.mock('@/lib/api/services/oracleWatchWindowService', () => ({
  beginOracleWatchWindow: jest.fn(),
}));
jest.mock('@/lib/api/services/productLimits', () => {
  class ProductLimitError extends Error {
    constructor(
      readonly scope: string,
      readonly limit: number,
      readonly current: number,
      readonly retryAfterSeconds: number | null,
      readonly retryAfterBasis: string
    ) {
      super(`Product limit reached: ${scope}`);
    }
  }
  return { ProductLimitError, productLimitMessage: jest.fn() };
});

const mockLegacyPost = (createApiHandler as jest.Mock).mock.results[0]?.value as jest.Mock;
const mockGetX402Config = getX402Config as jest.Mock;
const mockUsdToAtomic = usdToAtomicUnits as jest.Mock;
const mockHandleX402 = handlePaidPreTradeRequest as jest.Mock;
const mockHasAuthCredentials = hasAuthCredentials as jest.Mock;
const mockIsPaidRequest = isPaidRequest as jest.Mock;
const mockBegin = beginOracleWatchWindow as jest.Mock;
const mockSuccessResponse = ApiResponseBuilder.success as jest.Mock;
const mockErrorResponse = ApiResponseBuilder.error as jest.Mock;

const X402_CONFIG = { enabled: true, amountAtomic: '20000', priceUsd: 0.02 };

const WINDOW = {
  windowId: '11111111-1111-4111-8111-111111111111',
  symbol: 'ETH',
  chain: 'arbitrum',
  status: 'active',
  paymentMethod: 'x402',
  openedAt: '2026-11-03T06:00:00.000Z',
  expiresAt: '2026-11-04T06:00:00.000Z',
  closedAt: null,
  pollCount: 0,
  pollCap: 300,
};

function makeRequest(
  headers: Record<string, string> = {},
  body: unknown = { symbol: 'ETH', chain: 'arbitrum' }
): NextRequest {
  return {
    headers: new Headers(headers),
    nextUrl: new URL('https://oracleinsight.xyz/api/v1/safety/oracle-watch-window'),
    method: 'POST',
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

function routeContext() {
  return { params: Promise.resolve({}) };
}

beforeEach(() => {
  jest.clearAllMocks();
  // resetMocks: true in jest.config wipes factory implementations — re-seed.
  mockUsdToAtomic.mockImplementation((usd: number) => String(Math.round(usd * 1_000_000)));
  mockGetX402Config.mockReturnValue(X402_CONFIG);
  mockHasAuthCredentials.mockImplementation(
    (request: NextRequest) =>
      request.headers.has('x-api-key') || request.headers.has('authorization')
  );
  mockIsPaidRequest.mockImplementation((request: NextRequest) =>
    request.headers.has('payment-signature')
  );
  mockHandleX402.mockResolvedValue(new Response('x402 handled', { status: 200 }));
  mockBegin.mockResolvedValue({ window: WINDOW, windowToken: 'oww_' + 'a'.repeat(64) });
  mockSuccessResponse.mockImplementation((data, metadata) => ({ ok: true, data, ...metadata }));
  mockErrorResponse.mockImplementation((code, message, details) => ({ code, message, details }));
  mockLegacyPost.mockResolvedValue(new Response('legacy handler', { status: 200 }));
});

describe('oracle-watch-window begin route', () => {
  it('quotes the WINDOW price — not the per-call price — on the x402 path', async () => {
    await POST(makeRequest(), routeContext());

    expect(mockUsdToAtomic).toHaveBeenCalledWith(0.5);
    expect(mockHandleX402).toHaveBeenCalledWith(
      expect.anything(),
      X402_CONFIG,
      expect.any(Function),
      { amountAtomic: '500000' }
    );
    // The merchant-wide per-call price must never leak into this product.
    expect(X402_CONFIG.amountAtomic).not.toBe('500000');
  });

  it('persists an x402-purchased window with no api key when the business callback runs', async () => {
    await POST(makeRequest(), routeContext());
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;

    const response = await runBusiness('req_window_x402');

    expect(mockBegin).toHaveBeenCalledWith({
      symbol: 'ETH',
      chain: 'arbitrum',
      paymentMethod: 'x402',
      apiKeyId: null,
    });
    expect(response.status).toBe(200);
    const payload = mockSuccessResponse.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      product: 'oracle-watch-window-24h',
      window: { windowId: WINDOW.windowId },
      windowToken: expect.stringMatching(/^oww_[0-9a-f]{64}$/),
    });
    expect(payload.usage).toMatchObject({
      poll: { method: 'GET', url: `/api/v1/safety/oracle-watch-window/${WINDOW.windowId}` },
      close: { method: 'POST', url: `/api/v1/safety/oracle-watch-window/${WINDOW.windowId}` },
    });
  });

  it('rejects an invalid body inside the x402 business callback with 400', async () => {
    await POST(makeRequest({}, { symbol: 'A'.repeat(25) }), routeContext());
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;

    const response = await runBusiness('req_window_bad');

    expect(mockBegin).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });

  it('rejects a non-JSON body inside the x402 business callback with 400', async () => {
    const request = makeRequest();
    (request.json as jest.Mock).mockRejectedValue(new Error('Unexpected token'));
    await POST(request, routeContext());
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;

    const response = await runBusiness('req_window_notjson');

    expect(mockBegin).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });

  it('returns 429 without Retry-After when the key is at its open-window cap', async () => {
    mockBegin.mockRejectedValue(new ProductLimitError('open_windows', 5, 5, null, 'recheck'));
    await POST(makeRequest(), routeContext());
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;

    const response = await runBusiness('req_window_cap');

    expect(response.status).toBe(429);
    // A concurrency slot does not free on a clock, so any Retry-After would be
    // a false promise and invite a retry storm.
    expect(response.headers.get('Retry-After')).toBeNull();
    const body = JSON.parse(response.body as string) as {
      code: string;
      details: { retryable: boolean; details: Record<string, unknown> };
    };
    expect(body.code).toBe('PRODUCT_CONCURRENCY_LIMIT');
    expect(body.details).toMatchObject({
      retryable: true,
      details: {
        scope: 'open_windows',
        limit: 5,
        current: 5,
      },
    });
    expect(body.details.details).not.toHaveProperty('retryAfterSeconds');
    expect(body.details.details).not.toHaveProperty('retryAfterBasis');
    expect(String(body.details.details.hint)).toContain('24h expiry');
  });

  it('sends an API-key caller to the legacy credit-metered handler, never to x402', async () => {
    const request = makeRequest({ 'x-api-key': 'ik_live_key' });
    const context = routeContext();

    const response = await POST(request, context);

    expect(mockHandleX402).not.toHaveBeenCalled();
    expect(mockBegin).not.toHaveBeenCalled();
    expect(mockLegacyPost).toHaveBeenCalledWith(request, context);
    expect(response.status).toBe(200);
  });

  it('sends a keyless caller to x402 even without a payment signature (payment required)', async () => {
    await POST(makeRequest(), routeContext());
    expect(mockHandleX402).toHaveBeenCalledTimes(1);
    expect(mockLegacyPost).not.toHaveBeenCalled();
  });

  it('sends everyone to the legacy handler when x402 is disabled', async () => {
    mockGetX402Config.mockReturnValue({ ...X402_CONFIG, enabled: false });

    await POST(makeRequest(), routeContext());

    expect(mockHandleX402).not.toHaveBeenCalled();
    expect(mockLegacyPost).toHaveBeenCalledTimes(1);
  });
});
