import type { NextRequest } from 'next/server';

import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { assessExecutionPreflight } from '@/lib/preflight/executionPreflight';

import { GET } from '../route';

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
jest.mock('@/lib/api/x402/config', () => ({ getX402Config: jest.fn() }));
jest.mock('@/lib/api/x402/guard', () => ({
  handlePaidPreTradeRequest: jest.fn(),
  hasAuthCredentials: jest.fn(),
  isPaidRequest: jest.fn(),
}));
jest.mock('@/lib/preflight/executionPreflight', () => ({ assessExecutionPreflight: jest.fn() }));

const mockLegacyGet = (createApiHandler as jest.Mock).mock.results[0]?.value as jest.Mock;
const mockGetX402Config = getX402Config as jest.Mock;
const mockHandleX402 = handlePaidPreTradeRequest as jest.Mock;
const mockHasAuthCredentials = hasAuthCredentials as jest.Mock;
const mockIsPaidRequest = isPaidRequest as jest.Mock;
const mockAssessPreflight = assessExecutionPreflight as jest.Mock;
const mockSuccessResponse = ApiResponseBuilder.success as jest.Mock;
const mockErrorResponse = ApiResponseBuilder.error as jest.Mock;

const X402_CONFIG = {
  enabled: true,
  network: 'eip155:8453',
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
};
const QUERY = 'asset=MON&chainId=143&action=swap&tradeAmountUsd=1000&destinationAsset=USDC';

function makeRequest(headers: Record<string, string> = {}, query = QUERY): NextRequest {
  return {
    headers: new Headers(headers),
    nextUrl: new URL(`https://oracleinsight.xyz/api/v1/safety/preflight?${query}`),
    method: 'GET',
  } as unknown as NextRequest;
}

function routeContext() {
  return { params: Promise.resolve({}) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetX402Config.mockReturnValue(X402_CONFIG);
  mockHasAuthCredentials.mockImplementation(
    (request: NextRequest) =>
      request.headers.has('x-api-key') || request.headers.has('authorization')
  );
  mockIsPaidRequest.mockImplementation((request: NextRequest) =>
    request.headers.has('payment-signature')
  );
  mockHandleX402.mockResolvedValue(new Response('x402 handled', { status: 200 }));
  mockAssessPreflight.mockResolvedValue({
    verdict: 'caution',
    recommendation: 'review_before_execution',
    gates: {},
  });
  mockSuccessResponse.mockImplementation((data, metadata) => ({ ok: true, data, ...metadata }));
  mockErrorResponse.mockImplementation((code, message, details) => ({ code, message, details }));
  mockLegacyGet.mockResolvedValue(new Response('legacy handler', { status: 200 }));
});

describe('execution-preflight route', () => {
  it('runs validated keyless x402 requests through the preflight callback and returns its decision', async () => {
    const request = makeRequest();

    await GET(request, routeContext());

    expect(mockHandleX402).toHaveBeenCalledWith(request, X402_CONFIG, expect.any(Function));
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;
    const response = await runBusiness('req_preflight_x402');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mockAssessPreflight).toHaveBeenCalledWith(
      expect.objectContaining({
        asset: 'MON',
        destinationAsset: 'USDC',
        chainId: 143,
        action: 'swap',
        tradeAmountUsd: 1000,
      }),
      { requestId: 'req_preflight_x402', apiKeyId: undefined },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockSuccessResponse).toHaveBeenCalledWith(
      expect.objectContaining({ verdict: 'caution' }),
      expect.objectContaining({
        meta: { verdict: 'caution', recommendation: 'review_before_execution' },
      })
    );
  });

  it('rejects invalid x402 business parameters before computing or settling a preflight', async () => {
    await GET(
      makeRequest({}, 'asset=MON&chainId=143&action=unsupported&tradeAmountUsd=1000'),
      routeContext()
    );
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;
    const response = await runBusiness('req_preflight_invalid');

    expect(response.status).toBe(400);
    expect(mockAssessPreflight).not.toHaveBeenCalled();
    expect(mockErrorResponse).toHaveBeenCalledWith(
      'VALIDATION_ERROR',
      'Invalid execution preflight query parameters',
      expect.any(Object)
    );
  });

  it('forwards an opt-in reviewed Uniswap V3 lane only with the validated decision input', async () => {
    const query = [
      'asset=WETH',
      'chainId=8453',
      'action=swap',
      'tradeAmountUsd=1000',
      'destinationAsset=USDC',
      'decisionInputCheck=1',
      'decisionPriceUsd=2000',
      'quotePriceUsd=2000',
      'quoteObservedAt=2026-10-25T00%3A00%3A00.000Z',
      'maxReferenceDeviationBps=50',
      'maxSlippageBps=50',
      'maxQuoteAgeSeconds=30',
      'reviewedUniswapV3AmountIn=0.5',
      'reviewedUniswapV3MaxQuoteDeviationBps=50',
      'reviewedUniswapV3MaxTwapDeviationBps=50',
    ].join('&');
    const request = makeRequest({}, query);

    await GET(request, routeContext());
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;
    await runBusiness('req_preflight_reviewed_dex');

    expect(mockAssessPreflight).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationAsset: 'USDC',
        decisionInput: expect.objectContaining({
          reviewedUniswapV3: {
            amountIn: '0.5',
            maxQuoteDeviationBps: 50,
            maxTwapDeviationBps: 50,
          },
        }),
      }),
      expect.any(Object),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('forwards an opt-in reviewed Aerodrome Slipstream lane with the validated decision input', async () => {
    const query = [
      'asset=WETH',
      'chainId=8453',
      'action=swap',
      'tradeAmountUsd=1000',
      'destinationAsset=USDC',
      'decisionInputCheck=1',
      'decisionPriceUsd=2000',
      'quotePriceUsd=2000',
      'quoteObservedAt=2026-10-25T00%3A00%3A00.000Z',
      'maxReferenceDeviationBps=50',
      'maxSlippageBps=50',
      'maxQuoteAgeSeconds=30',
      'reviewedAerodromeSlipstreamAmountIn=0.5',
      'reviewedAerodromeSlipstreamMaxQuoteDeviationBps=50',
      'reviewedAerodromeSlipstreamMaxTwapDeviationBps=50',
    ].join('&');
    const request = makeRequest({}, query);

    await GET(request, routeContext());
    const runBusiness = mockHandleX402.mock.calls[0][2] as (requestId: string) => Promise<Response>;
    await runBusiness('req_preflight_reviewed_aerodrome');

    expect(mockAssessPreflight).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationAsset: 'USDC',
        decisionInput: expect.objectContaining({
          reviewedAerodromeSlipstream: {
            amountIn: '0.5',
            maxQuoteDeviationBps: 50,
            maxTwapDeviationBps: 50,
          },
        }),
      }),
      expect.any(Object),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('leaves API-key requests on the standard credit-metered v1 handler', async () => {
    const request = makeRequest({ 'x-api-key': 'ins_test' });

    const response = await GET(request, routeContext());

    expect(mockLegacyGet).toHaveBeenCalledWith(request, expect.any(Object));
    expect(mockHandleX402).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
