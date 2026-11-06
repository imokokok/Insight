/**
 * Oracle config snapshot route dispatch tests.
 *
 * The HyperCore quote path reads HandlePaidOptions.amountAtomic rather than
 * the resource-server accepts[]. A route with a per-route price override must
 * pass the SAME amount here, or that rail silently charges the merchant-wide
 * per-call price while EVM and Solana advertise the snapshot price.
 */

import type { NextRequest } from 'next/server';

import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { x402ConfigForPaymentScope } from '@/lib/api/x402/capabilityPayment';
import { getX402Config, usdToAtomicUnits } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { buildOracleConfigSnapshotPack } from '@/lib/oracleConfigSnapshot/service';

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
jest.mock('@/lib/api/x402/capabilityPayment', () => ({
  x402ConfigForPaymentScope: jest.fn(),
  X402_PAYMENT_SCOPE: { configured: 'configured' },
}));
jest.mock('@/lib/api/x402/config', () => ({
  getX402Config: jest.fn(),
  usdToAtomicUnits: jest.fn((usd: number) => String(Math.round(usd * 1_000_000))),
  X402_ORACLE_CONFIG_SNAPSHOT_ROUTE: '/api/v1/oracle-config/snapshot',
}));
jest.mock('@/lib/api/x402/guard', () => ({
  handlePaidPreTradeRequest: jest.fn(),
  hasAuthCredentials: jest.fn(),
  isPaidRequest: jest.fn(),
}));
jest.mock('@/lib/oracleConfigSnapshot/service', () => ({
  buildOracleConfigSnapshotPack: jest.fn(),
}));

const mockLegacyPost = (createApiHandler as jest.Mock).mock.results[0]?.value as jest.Mock;
const mockScopeConfig = x402ConfigForPaymentScope as jest.Mock;
const mockGetX402Config = getX402Config as jest.Mock;
const mockUsdToAtomic = usdToAtomicUnits as jest.Mock;
const mockHandleX402 = handlePaidPreTradeRequest as jest.Mock;
const mockHasAuthCredentials = hasAuthCredentials as jest.Mock;
const mockIsPaidRequest = isPaidRequest as jest.Mock;
const mockBuildPack = buildOracleConfigSnapshotPack as jest.Mock;
const mockSuccessResponse = ApiResponseBuilder.success as jest.Mock;
const mockErrorResponse = ApiResponseBuilder.error as jest.Mock;

const X402_CONFIG = { enabled: true, amountAtomic: '20000', priceUsd: 0.02 };
const SNAPSHOT_BODY = {
  chainId: 8453,
  protocolId: 'moonwell-iv2-base',
  assetSymbol: 'USDC',
};

function makeRequest(
  headers: Record<string, string> = {},
  body: unknown = SNAPSHOT_BODY
): NextRequest {
  return {
    headers: new Headers(headers),
    nextUrl: new URL('https://oracleinsight.xyz/api/v1/oracle-config/snapshot'),
    method: 'POST',
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

function routeContext() {
  return { params: Promise.resolve({}) };
}

beforeEach(() => {
  jest.clearAllMocks();
  // resetMocks: true in jest.config wipes factory implementations, re-seed.
  mockScopeConfig.mockImplementation((config) => config);
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
  mockBuildPack.mockResolvedValue({
    payload: { gateResult: 'OBSERVED', configHash: 'a'.repeat(64) },
    payloadHash: 'b'.repeat(64),
    attestation: null,
  });
  mockSuccessResponse.mockImplementation((data, metadata) => ({ ok: true, data, ...metadata }));
  mockErrorResponse.mockImplementation((code, message, details) => ({ code, message, details }));
  mockLegacyPost.mockResolvedValue(new Response('legacy handler', { status: 200 }));
});

describe('oracle-config snapshot route', () => {
  it('passes the SNAPSHOT price to every payment rail including HyperCore', async () => {
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

  it('rejects caller-supplied configuration claims inside the business callback', async () => {
    await POST(makeRequest({}, { ...SNAPSHOT_BODY, feedProviders: ['attacker'] }), routeContext());
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;

    const response = await runBusiness('req_snapshot_strict');

    expect(mockBuildPack).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });

  it('sends an API-key caller to the legacy credit-metered handler', async () => {
    const request = makeRequest({ 'x-api-key': 'ik_live_key' });
    const context = routeContext();

    await POST(request, context);

    expect(mockHandleX402).not.toHaveBeenCalled();
    expect(mockLegacyPost).toHaveBeenCalledWith(request, context);
  });

  it('sends a keyless caller to x402 even without a payment signature', async () => {
    await POST(makeRequest(), routeContext());

    expect(mockHandleX402).toHaveBeenCalledTimes(1);
    expect(mockLegacyPost).not.toHaveBeenCalled();
  });
});
