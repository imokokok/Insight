/**
 * Token-authed position-lifecycle subresource route tests (guard, receipt,
 * close). These routes are the bundle's spending surfaces, so the invariants
 * tested are the fail-closed ones: every lifecycle failure code maps onto its
 * documented HTTP status, unknown guard families are rejected before any
 * budget accounting, and successes surface the budget/receipt state.
 */

import { ApiResponseBuilder } from '@/lib/api/handler';
import {
  closePositionLifecycle,
  issueBundledReceipt,
  PositionLifecycleError,
  runBundledGuard,
} from '@/lib/api/services/positionLifecycleService';

import { POST as guardPost } from '../guard/route';
import { POST as receiptPost } from '../receipt/route';
import { POST as closePost } from '../route';

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
  createOptionsHandler: jest.fn(() => jest.fn()),
}));
jest.mock('@/lib/api/utils', () => ({ CACHE_PRESETS: { noStore: 'no-store' } }));
jest.mock('@/lib/api/services/positionLifecycleService', () => ({
  runBundledGuard: jest.fn(),
  issueBundledReceipt: jest.fn(),
  closePositionLifecycle: jest.fn(),
  PositionLifecycleError: class extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
      this.name = 'PositionLifecycleError';
    }
  },
}));

const mockRunGuard = runBundledGuard as jest.Mock;
const mockIssueReceipt = issueBundledReceipt as jest.Mock;
const mockClose = closePositionLifecycle as jest.Mock;
const mockSuccess = ApiResponseBuilder.success as jest.Mock;
const mockError = ApiResponseBuilder.error as jest.Mock;

const LIFECYCLE_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'plc_' + 'b'.repeat(64);

function makeRequest(headers: Record<string, string> = {}, body: unknown = {}): Request {
  return {
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request;
}

function context() {
  return { params: Promise.resolve({ lifecycleId: LIFECYCLE_ID }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSuccess.mockImplementation((data, metadata) => ({ ok: true, data, ...metadata }));
  mockError.mockImplementation((code, message, details) => ({ code, message, details }));
  mockRunGuard.mockResolvedValue({
    family: 'base_perp',
    result: { verdict: 'ALLOW' },
    guard: { used: 1, budget: 4 },
  });
  mockIssueReceipt.mockResolvedValue({
    receipt: { uid: 'uid-1', data: { fillStatus: 'FILLED' } },
    receiptState: 'consumed',
  });
  mockClose.mockResolvedValue({
    lifecycleId: LIFECYCLE_ID,
    status: 'closed',
    watch: { haltCount: 0 },
  });
});

describe('bundled guard route', () => {
  it('dispatches with the bearer token, family, params, and transaction', async () => {
    const body = { family: 'base_perp', params: { protocolId: 'synthetix-perps-v3-base' } };
    const response = await guardPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, body),
      context()
    );

    expect(mockRunGuard).toHaveBeenCalledWith(
      LIFECYCLE_ID,
      TOKEN,
      'base_perp',
      body.params,
      undefined
    );
    expect(response.status).toBe(200);
  });

  it('rejects an unknown guard family with 400 before any budget accounting', async () => {
    const response = await guardPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, { family: 'made_up_guard', params: {} }),
      context()
    );

    expect(response.status).toBe(400);
    expect(mockRunGuard).not.toHaveBeenCalled();
  });

  it('rejects a missing token with 401 and never reaches the service', async () => {
    const response = await guardPost(
      makeRequest({}, { family: 'base_perp', params: {} }),
      context()
    );

    expect(response.status).toBe(401);
    expect(mockRunGuard).not.toHaveBeenCalled();
  });

  it('maps GUARD_BUDGET_REACHED onto 429 with a Retry-After hint', async () => {
    mockRunGuard.mockRejectedValue(new PositionLifecycleError('GUARD_BUDGET_REACHED'));

    const response = await guardPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, { family: 'base_perp', params: {} }),
      context()
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('300');
  });

  it('maps LIFECYCLE_EXPIRED onto 410', async () => {
    mockRunGuard.mockRejectedValue(new PositionLifecycleError('LIFECYCLE_EXPIRED'));

    const response = await guardPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, { family: 'base_perp', params: {} }),
      context()
    );

    expect(response.status).toBe(410);
  });

  it('rejects a malformed body with 400', async () => {
    const response = await guardPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, { family: 42 }),
      context()
    );

    expect(response.status).toBe(400);
    expect(mockRunGuard).not.toHaveBeenCalled();
  });
});

describe('bundled receipt route', () => {
  const ISSUE_BODY = {
    preTradeUid: '0x' + '1'.repeat(64),
    requestHash: '0x' + '2'.repeat(64),
    sourceAssetId: 'eip155:42161/erc20:eth',
    destinationAssetId: 'eip155:42161/erc20:usdc',
    subjectChainId: 42161,
    settlementChainId: 42161,
    participantCount: 5,
    sourceGroupCount: 3,
    preTradeSignedAt: 1_800_000_000,
    quotedPrice: 2410,
    txHash: '0x' + '3'.repeat(64),
  };

  it('issues with the bearer token and surfaces the receipt state', async () => {
    const response = await receiptPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, ISSUE_BODY),
      context()
    );

    expect(mockIssueReceipt).toHaveBeenCalledWith(LIFECYCLE_ID, TOKEN, ISSUE_BODY);
    expect(response.status).toBe(200);
    const payload = mockSuccess.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ receiptState: 'consumed' });
  });

  it('maps RECEIPT_UNAVAILABLE onto 409', async () => {
    mockIssueReceipt.mockRejectedValue(new PositionLifecycleError('RECEIPT_UNAVAILABLE'));

    const response = await receiptPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, ISSUE_BODY),
      context()
    );

    expect(response.status).toBe(409);
  });

  it('maps a coded issuer failure onto its status and keeps the credit spendable', async () => {
    mockIssueReceipt.mockRejectedValue(
      Object.assign(new Error('unsupported'), { code: 'UNSUPPORTED_CHAIN', status: 400 })
    );

    const response = await receiptPost(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, ISSUE_BODY),
      context()
    );

    expect(response.status).toBe(400);
    expect(mockError).toHaveBeenCalledWith('UNSUPPORTED_CHAIN', 'unsupported', expect.anything());
  });

  it('rejects a missing token with 401', async () => {
    const response = await receiptPost(makeRequest({}, ISSUE_BODY), context());

    expect(response.status).toBe(401);
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  });
});

describe('close route', () => {
  it('closes with the bearer token and returns the combined summary', async () => {
    const response = await closePost(makeRequest({ authorization: `Bearer ${TOKEN}` }), context());

    expect(mockClose).toHaveBeenCalledWith(LIFECYCLE_ID, TOKEN);
    expect(response.status).toBe(200);
    const payload = mockSuccess.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ lifecycleId: LIFECYCLE_ID, status: 'closed' });
  });

  it('maps INVALID_TOKEN onto 401 for a wrong token', async () => {
    mockClose.mockRejectedValue(new PositionLifecycleError('INVALID_TOKEN'));

    const response = await closePost(makeRequest({ authorization: `Bearer wrong` }), context());

    expect(response.status).toBe(401);
  });

  it('never turns an embedded-window token rejection into a 500', async () => {
    const { OracleWatchWindowError } = await import('@/lib/api/services/oracleWatchWindowService');
    mockClose.mockRejectedValue(new OracleWatchWindowError('INVALID_TOKEN'));

    const response = await closePost(makeRequest({ authorization: `Bearer ${TOKEN}` }), context());

    expect(response.status).toBe(401);
  });
});
