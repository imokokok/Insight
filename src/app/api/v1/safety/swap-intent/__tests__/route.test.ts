import type { NextRequest } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/handler';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials } from '@/lib/api/x402/guard';
import { activateJourneyReceiptCredit } from '@/lib/tradeJourney/journeyService';
import { createSwapIntent } from '@/lib/tradeJourney/swapIntent';

import { GET, HEAD } from '../route';

jest.mock('next/server', () => {
  class NextResponse extends Response {
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
}));
jest.mock('@/lib/tradeJourney/journeyService', () => ({ activateJourneyReceiptCredit: jest.fn() }));
jest.mock('@/lib/tradeJourney/swapIntent', () => ({
  createSwapIntent: jest.fn(),
  SwapIntentAttestationUnavailableError: class SwapIntentAttestationUnavailableError extends Error {},
  SwapIntentBodySchema: {
    safeParse: jest.fn(),
  },
}));

const mockGetX402Config = getX402Config as jest.Mock;
const mockHandlePaid = handlePaidPreTradeRequest as jest.Mock;
const mockHasAuthCredentials = hasAuthCredentials as jest.Mock;
const mockCreateSwapIntent = createSwapIntent as jest.Mock;
const mockActivateJourneyReceiptCredit = activateJourneyReceiptCredit as jest.Mock;
const mockSuccess = ApiResponseBuilder.success as jest.Mock;

const config = {
  enabled: true,
  network: 'eip155:8453',
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
};

function request(): NextRequest {
  return {
    headers: new Headers(),
    nextUrl: new URL(
      'https://oracleinsight.xyz/api/v1/safety/swap-intent?sourceAsset=ETH&destinationAsset=USDC&subjectChainId=1&settlementChainId=1&declaredNotionalUsd=1000'
    ),
    method: 'GET',
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetX402Config.mockReturnValue(config);
  mockHasAuthCredentials.mockReturnValue(false);
  mockHandlePaid.mockResolvedValue(new Response('handled', { status: 200 }));
  mockSuccess.mockImplementation((data, meta) => ({ data, ...meta }));
  const parsed = {
    sourceAsset: 'ETH',
    destinationAsset: 'USDC',
    subjectChainId: 1,
    settlementChainId: 1,
    declaredNotionalUsd: 1000,
  };
  const { SwapIntentBodySchema } = jest.requireMock('@/lib/tradeJourney/swapIntent') as {
    SwapIntentBodySchema: { safeParse: jest.Mock };
  };
  SwapIntentBodySchema.safeParse.mockReturnValue({ success: true, data: parsed });
  mockCreateSwapIntent.mockResolvedValue({
    journeyId: '11111111-1111-4111-8111-111111111111',
    outcomeToken: 'a'.repeat(43),
    receiptCreditState: 'pending_settlement',
    sourceCheck: { verdict: 'PASS' },
    destinationCheck: { verdict: 'PASS' },
    next: {},
  });
  mockActivateJourneyReceiptCredit.mockResolvedValue(undefined);
});

it('rejects HEAD without entering the x402 payment dispatch', () => {
  const response = HEAD();

  expect(response.status).toBe(405);
  expect(response.headers.get('allow')).toBe('GET, POST, OPTIONS');
  expect(mockHandlePaid).not.toHaveBeenCalled();
});

it('uses a discoverable x402 GET path and only unlocks its receipt after settlement', async () => {
  const req = request();
  await GET(req, { params: Promise.resolve({}) });

  expect(mockHandlePaid).toHaveBeenCalledWith(
    req,
    config,
    expect.any(Function),
    expect.any(Object)
  );
  const runBusiness = mockHandlePaid.mock.calls[0][2] as (id: string) => Promise<Response>;
  const response = await runBusiness('req_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  expect(response.status).toBe(200);
  expect((await response.json()) as { data: { journeyId: string } }).toMatchObject({
    data: { journeyId: '11111111-1111-4111-8111-111111111111' },
  });
  expect(mockCreateSwapIntent).toHaveBeenCalledWith(
    expect.objectContaining({ sourceAsset: 'ETH', destinationAsset: 'USDC' }),
    expect.objectContaining({
      requestId: 'req_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      receiptCreditState: 'pending_settlement',
    })
  );

  const options = mockHandlePaid.mock.calls[0][3] as {
    onSettled: (value: unknown) => Promise<void>;
  };
  await options.onSettled({
    requestId: 'req_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    payer: '0x1111111111111111111111111111111111111111',
    network: 'eip155:8453',
    txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  });
  expect(mockActivateJourneyReceiptCredit).toHaveBeenCalledWith(
    expect.objectContaining({ journeyId: '11111111-1111-4111-8111-111111111111' })
  );
});
