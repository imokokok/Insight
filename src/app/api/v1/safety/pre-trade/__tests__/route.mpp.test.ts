import type { NextRequest } from 'next/server';

import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { getMppConfig } from '@/lib/api/mpp/config';
import {
  handleMppPaidPreTradeRequest,
  hasMppCredential,
  issueMppPreTradeQuote,
} from '@/lib/api/mpp/preTrade';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';

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

jest.mock('@/lib/api/mpp/config', () => ({ getMppConfig: jest.fn() }));

jest.mock('@/lib/api/mpp/preTrade', () => ({
  handleMppPaidPreTradeRequest: jest.fn(),
  hasMppCredential: jest.fn(),
  issueMppPreTradeQuote: jest.fn(),
}));

jest.mock('@/lib/api/services/preTradeSafetyService', () => ({
  preTradeSafetyCheck: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({ CACHE_PRESETS: { noStore: 'no-store' } }));

jest.mock('@/lib/api/x402/config', () => ({ getX402Config: jest.fn() }));

jest.mock('@/lib/api/x402/guard', () => ({
  handlePaidPreTradeRequest: jest.fn(),
  hasAuthCredentials: jest.fn(),
  isPaidRequest: jest.fn(),
}));

const mockLegacyGet = (createApiHandler as jest.Mock).mock.results[0]?.value as jest.Mock;
const mockMppConfig = getMppConfig as jest.Mock;
const mockHandleMpp = handleMppPaidPreTradeRequest as jest.Mock;
const mockHasMppCredential = hasMppCredential as jest.Mock;
const mockIssueMppQuote = issueMppPreTradeQuote as jest.Mock;
const mockPreTradeSafetyCheck = preTradeSafetyCheck as jest.Mock;
const mockGetX402Config = getX402Config as jest.Mock;
const mockHandleX402 = handlePaidPreTradeRequest as jest.Mock;
const mockHasAuthCredentials = hasAuthCredentials as jest.Mock;
const mockIsPaidRequest = isPaidRequest as jest.Mock;
const mockSuccessResponse = ApiResponseBuilder.success as jest.Mock;
const mockErrorResponse = ApiResponseBuilder.error as jest.Mock;

const X402_CONFIG = {
  enabled: true,
  network: 'eip155:84532',
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
};
const MPP_CONFIG = { enabled: true, secretKey: 'mpp-test-secret-key-with-at-least-32-bytes' };
const TOOL_RESULT = { verdict: 'PASS', consensusPrice: 2000 };
const QUERY = 'asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000';

function makeRequest(headers: Record<string, string> = {}, query = QUERY): NextRequest {
  return {
    headers: new Headers(headers),
    nextUrl: new URL(`https://oracleinsight.xyz/api/v1/safety/pre-trade?${query}`),
    method: 'GET',
  } as unknown as NextRequest;
}

function routeContext() {
  return { params: Promise.resolve({}) };
}

beforeEach(() => {
  mockGetX402Config.mockReturnValue(X402_CONFIG);
  mockMppConfig.mockReturnValue(MPP_CONFIG);
  mockHasMppCredential.mockImplementation(
    (request: NextRequest) => request.headers.get('authorization')?.startsWith('Payment ') ?? false
  );
  mockHasAuthCredentials.mockImplementation(
    (request: NextRequest) =>
      request.headers.has('x-api-key') || request.headers.has('authorization')
  );
  mockIsPaidRequest.mockImplementation((request: NextRequest) =>
    request.headers.has('payment-signature')
  );
  mockHandleMpp.mockResolvedValue(new Response('mpp handled', { status: 200 }));
  mockHandleX402.mockResolvedValue(new Response('x402 handled', { status: 200 }));
  mockIssueMppQuote.mockImplementation(
    async (_request, _config, _secretKey, issueX402Quote: () => Promise<Response>) =>
      issueX402Quote()
  );
  mockPreTradeSafetyCheck.mockResolvedValue(TOOL_RESULT);
  mockSuccessResponse.mockImplementation((data, metadata) => ({ ok: true, data, ...metadata }));
  mockErrorResponse.mockImplementation((code, message, details) => ({ code, message, details }));
  mockLegacyGet.mockResolvedValue(new Response('legacy handler', { status: 200 }));
});

describe('pre-trade route MPP dispatch', () => {
  it('dispatches MPP credentials through MPP and executes the validated business callback', async () => {
    const request = makeRequest({ authorization: 'Payment credential=abc' });

    await GET(request, routeContext());

    expect(mockHandleMpp).toHaveBeenCalledWith(
      request,
      X402_CONFIG,
      MPP_CONFIG.secretKey,
      expect.any(Function)
    );
    expect(mockHandleX402).not.toHaveBeenCalled();
    const runBusiness = mockHandleMpp.mock.calls[0][3] as (requestId: string) => Promise<Response>;
    const response = await runBusiness('req_mpp_route');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mockPreTradeSafetyCheck).toHaveBeenCalledWith(
      {
        asset: 'ETH',
        chainId: 1,
        action: 'swap',
        tradeAmountUsd: 1000,
        targetProviders: undefined,
        protocolId: undefined,
        schemaVersion: undefined,
        destinationAsset: undefined,
      },
      expect.objectContaining({ requestId: 'req_mpp_route' })
    );
  });

  it('does not execute or charge for invalid MPP business parameters', async () => {
    const request = makeRequest(
      { authorization: 'Payment credential=abc' },
      'asset=ETH&chainId=1&action=not-an-action&tradeAmountUsd=1000'
    );

    await GET(request, routeContext());
    const runBusiness = mockHandleMpp.mock.calls[0][3] as (requestId: string) => Promise<Response>;
    const response = await runBusiness('req_mpp_invalid');

    expect(response.status).toBe(400);
    expect(mockPreTradeSafetyCheck).not.toHaveBeenCalled();
    expect(mockErrorResponse).toHaveBeenCalledWith(
      'VALIDATION_ERROR',
      'Invalid pre-trade query parameters',
      expect.objectContaining({ details: expect.any(Object) })
    );
  });

  it('routes a request containing both MPP and x402 credentials to MPP conflict handling', async () => {
    const request = makeRequest({
      authorization: 'Payment credential=abc',
      'payment-signature': 'x402-signature',
    });

    await GET(request, routeContext());

    expect(mockHandleMpp).toHaveBeenCalledTimes(1);
    expect(mockHandleX402).not.toHaveBeenCalled();
  });

  it('offers the MPP challenge alongside the x402 quote for anonymous requests', async () => {
    const request = makeRequest();

    await GET(request, routeContext());

    expect(mockIssueMppQuote).toHaveBeenCalledWith(
      request,
      X402_CONFIG,
      MPP_CONFIG.secretKey,
      expect.any(Function)
    );
    expect(mockHandleMpp).not.toHaveBeenCalled();
    expect(mockHandleX402).toHaveBeenCalledTimes(1);
  });

  it('routes x402 signatures to x402 and leaves API-key authorization on the legacy handler', async () => {
    const x402Request = makeRequest({ 'payment-signature': 'x402-signature' });
    await GET(x402Request, routeContext());

    expect(mockHandleX402).toHaveBeenCalledWith(x402Request, X402_CONFIG, expect.any(Function));
    expect(mockHandleMpp).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockGetX402Config.mockReturnValue(X402_CONFIG);
    mockMppConfig.mockReturnValue(MPP_CONFIG);
    mockHasMppCredential.mockReturnValue(false);
    mockIsPaidRequest.mockReturnValue(false);
    mockHasAuthCredentials.mockReturnValue(true);
    mockLegacyGet.mockResolvedValue(new Response('legacy handler', { status: 200 }));

    const apiKeyRequest = makeRequest({ 'x-api-key': 'ins_test' });
    const response = await GET(apiKeyRequest, routeContext());

    expect(mockLegacyGet).toHaveBeenCalledWith(apiKeyRequest, expect.any(Object));
    expect(mockHandleMpp).not.toHaveBeenCalled();
    expect(mockIssueMppQuote).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it('falls back to the x402 quote when MPP is disabled', async () => {
    mockMppConfig.mockReturnValue({ enabled: false, secretKey: null });

    await GET(makeRequest(), routeContext());

    expect(mockIssueMppQuote).not.toHaveBeenCalled();
    expect(mockHandleX402).toHaveBeenCalledTimes(1);
  });
});
