import type { NextRequest } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/handler';
import {
  settleBaseAgentSwapGuard,
  verifyBaseAgentSwapGuardSettlement,
} from '@/lib/dex/baseAgentSwapGuardSettlement';

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

jest.mock('@/lib/dex/baseAgentSwapGuardSettlement', () => ({
  settleBaseAgentSwapGuard: jest.fn(),
  verifyBaseAgentSwapGuardSettlement: jest.fn(),
}));

const mockSettle = settleBaseAgentSwapGuard as jest.Mock;
const mockVerify = verifyBaseAgentSwapGuardSettlement as jest.Mock;

const SETTLEMENT = { uid: '0xsettlement', data: { decisionHash: '0xdecision' } };

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
  mockSettle.mockResolvedValue({ ok: true, settlement: SETTLEMENT });
  mockVerify.mockResolvedValue({ valid: true, reason: 'verified' });
});

describe('POST /api/v1/safety/base-agent-swap-guard/settlement', () => {
  it('returns the signed settlement with no-store caching', async () => {
    const response = await call({
      decision: { guard: {} },
      swapTxHash: `0x${'ab'.repeat(32)}`,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const json = (await response.json()) as { data: { settlement: unknown } };
    expect(json.data.settlement).toEqual(SETTLEMENT);
    expect(mockSettle).toHaveBeenCalledWith(
      expect.objectContaining({ swapTxHash: `0x${'ab'.repeat(32)}` })
    );
  });

  it('passes the presented approval transaction hash through', async () => {
    await call({
      decision: { guard: {} },
      swapTxHash: `0x${'ab'.repeat(32)}`,
      approvalTxHash: `0x${'cd'.repeat(32)}`,
    });
    expect(mockSettle).toHaveBeenCalledWith(
      expect.objectContaining({ approvalTxHash: `0x${'cd'.repeat(32)}` })
    );
  });

  it('maps settlement failures to explicit statuses', async () => {
    mockSettle.mockResolvedValue({
      ok: false,
      code: 'SWAP_TX_NOT_FOUND',
      message: 'not found',
    });
    const notFound = await call({ decision: {}, swapTxHash: `0x${'ab'.repeat(32)}` });
    expect(notFound.status).toBe(404);

    mockSettle.mockResolvedValue({
      ok: false,
      code: 'ON_CHAIN_CALL_MISMATCH',
      message: 'mismatch',
    });
    const mismatch = await call({ decision: {}, swapTxHash: `0x${'ab'.repeat(32)}` });
    expect(mismatch.status).toBe(400);

    mockSettle.mockResolvedValue({ ok: false, code: 'RPC_ERROR', message: 'rpc down' });
    const upstream = await call({ decision: {}, swapTxHash: `0x${'ab'.repeat(32)}` });
    expect(upstream.status).toBe(502);
  });

  it('supports verifyOnly mode against a presented settlement', async () => {
    const response = await call({
      verifyOnly: true,
      settlement: { data: {} },
    });
    expect(response.status).toBe(200);
    const json = (await response.json()) as { data: { valid: boolean } };
    expect(json.data.valid).toBe(true);
    expect(mockVerify).toHaveBeenCalledWith({ data: {} });
    expect(mockSettle).not.toHaveBeenCalled();
  });

  it('requires a settlement object in verifyOnly mode', async () => {
    const response = await call({ verifyOnly: true });
    expect(response.status).toBe(400);
  });
});
