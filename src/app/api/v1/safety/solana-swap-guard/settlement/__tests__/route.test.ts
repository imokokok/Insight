import type { NextRequest } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/handler';
import {
  settleSolanaSwapGuard,
  verifySolanaSwapGuardSettlement,
} from '@/lib/dex/solanaSwapGuardSettlement';

import { POST } from '../route';

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
  // Pass the inner handler straight through so the tests exercise route logic.
  createApiHandler: jest.fn((handler: unknown) => handler),
  createOptionsHandler: jest.fn(() => jest.fn()),
  ApiResponseBuilder: {
    success: jest.fn((data: unknown, extra?: object) => ({ ok: true, data, ...extra })),
    error: jest.fn((code: string, message: string, extra?: object) => ({
      ok: false,
      code,
      message,
      ...extra,
    })),
  },
}));

jest.mock('@/lib/dex/solanaSwapGuardSettlement', () => ({
  settleSolanaSwapGuard: jest.fn(),
  verifySolanaSwapGuardSettlement: jest.fn(),
}));

const mockSettle = settleSolanaSwapGuard as jest.Mock;
const mockVerify = verifySolanaSwapGuardSettlement as jest.Mock;

const SIGNATURE = '5'.repeat(87);
const SETTLEMENT = { payload: { decisionHash: 'decision-hash', status: 'SETTLED' }, signer: {} };
const FACTS = {
  signature: SIGNATURE,
  status: 'CONFIRMED',
  slot: 281_500_000,
  sourceAmountRaw: '1000000',
  destinationAmountRaw: '1002000',
  feeLamports: '5000',
};

function call(body: Record<string, unknown>): Promise<Response> {
  return POST(
    { method: 'POST' } as unknown as NextRequest,
    { requestId: 'test-request', validated: { body } } as never
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // The jest config resets mocks (including factory implementations) per test.
  (ApiResponseBuilder.success as jest.Mock).mockImplementation((data: unknown, extra?: object) => ({
    ok: true,
    data,
    ...extra,
  }));
  (ApiResponseBuilder.error as jest.Mock).mockImplementation(
    (code: string, message: string, extra?: object) => ({ ok: false, code, message, ...extra })
  );
  mockSettle.mockResolvedValue({
    ok: true,
    settlement: SETTLEMENT,
    reason: 'AMOUNTS_AND_MIN_OUT_RECONCILED',
    facts: FACTS,
  });
  mockVerify.mockReturnValue({ valid: true, reason: 'verified' });
});

describe('POST /api/v1/safety/solana-swap-guard/settlement', () => {
  it('returns the signed settlement with execution facts and no-store caching', async () => {
    const response = await call({ decision: { guard: {} }, signature: SIGNATURE });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const json = (await response.json()) as { data: { settlement: unknown; facts: unknown } };
    expect(json.data.settlement).toEqual(SETTLEMENT);
    expect(json.data.facts).toEqual(FACTS);
    expect(mockSettle).toHaveBeenCalledWith(expect.objectContaining({ signature: SIGNATURE }));
  });

  it('maps settlement failures to explicit statuses', async () => {
    mockSettle.mockResolvedValue({ ok: false, code: 'NOT_FOUND', message: 'signature not found' });
    const notFound = await call({ decision: {}, signature: SIGNATURE });
    expect(notFound.status).toBe(404);

    mockSettle.mockResolvedValue({
      ok: false,
      code: 'EXECUTED_MESSAGE_MISMATCH',
      message: 'the executed transaction is not the reviewed one',
    });
    const mismatch = await call({ decision: {}, signature: SIGNATURE });
    expect(mismatch.status).toBe(400);

    mockSettle.mockResolvedValue({ ok: false, code: 'RPC_UNAVAILABLE', message: 'rpc down' });
    const upstream = await call({ decision: {}, signature: SIGNATURE });
    expect(upstream.status).toBe(502);

    mockSettle.mockResolvedValue({ ok: false, code: 'DECISION_INVALID', message: 'bad decision' });
    const invalid = await call({ decision: {}, signature: SIGNATURE });
    expect(invalid.status).toBe(400);
  });

  it('supports verifyOnly mode against a presented settlement', async () => {
    const response = await call({ verifyOnly: true, settlement: { payload: {} } });
    expect(response.status).toBe(200);
    const json = (await response.json()) as { data: { valid: boolean } };
    expect(json.data.valid).toBe(true);
    expect(mockVerify).toHaveBeenCalledWith({ payload: {} });
    expect(mockSettle).not.toHaveBeenCalled();
  });

  it('requires a settlement object in verifyOnly mode', async () => {
    const response = await call({ verifyOnly: true });
    expect(response.status).toBe(400);
    const json = (await response.json()) as { code: string };
    expect(json.code).toBe('SETTLEMENT_REQUIRED');
  });
});
