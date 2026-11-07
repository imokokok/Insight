import { NextResponse } from 'next/server';

import { consumeCredits, precheckCredits, recordWaivedCredit } from '@/lib/billing/creditWallet';
import {
  clearMcpRequestCache,
  getCachedMcpResult,
  restRequestFingerprint,
} from '@/lib/billing/requestIdempotency';

import { logApiKeyUsage } from '../apiKey';
import { createApiHandler } from '../handler';
import { createAuthMiddleware, createErrorMiddleware, createQuotaMiddleware } from '../middleware';

jest.mock('@/lib/billing/creditWallet', () => ({
  consumeCredits: jest.fn(),
  precheckCredits: jest.fn(),
  recordWaivedCredit: jest.fn().mockResolvedValue(true),
}));
jest.mock('../apiKey', () => ({ logApiKeyUsage: jest.fn() }));
jest.mock('../middleware', () => ({
  createAuthMiddleware: jest.fn(),
  createQuotaMiddleware: jest.fn(),
  createLoggingMiddleware: jest.fn(),
  createErrorMiddleware: jest.fn(() => async () => NextResponse.json({}, { status: 500 })),
  createRateLimitMiddleware: jest.fn(),
  logResponse: jest.fn(),
}));

describe('REST billing receipt boundary', () => {
  beforeEach(() => {
    clearMcpRequestCache();
    (createErrorMiddleware as jest.Mock).mockImplementation(
      () => async () => NextResponse.json({}, { status: 500 })
    );
    (precheckCredits as jest.Mock).mockResolvedValue({ ok: true, balance: 15 });
    (createAuthMiddleware as jest.Mock).mockReturnValue(async () => ({
      success: true,
      context: { apiKey: { keyId: 'key-fixture', userId: 'user-fixture', plan: 'pro' } },
    }));
    (createQuotaMiddleware as jest.Mock).mockImplementation((_options, context) => async () => ({
      success: true,
      quotaInfo: {
        creditCost: 5,
        creditBalance: 20,
        pendingCharge: {
          apiKeyId: 'key-fixture',
          cost: 5,
          meteringKey: `rest:key-fixture:${context.requestId}`,
        },
      },
    }));
  });

  async function request(status = 200, headers = new Headers()) {
    const route = createApiHandler(
      async () => NextResponse.json({ result: 'fixture' }, { status }),
      {
        middlewares: { auth: { required: true, requireApiKey: true }, quota: true, cors: true },
      }
    );
    return route(
      {
        method: 'GET',
        nextUrl: new URL('https://example.test/api/v1/coverage'),
        headers,
      } as never,
      { params: Promise.resolve({}) }
    );
  }

  it.each([
    ['charged', false],
    ['replayed', true],
  ])('correlates a confirmed %s debit with the server request', async (status, idempotent) => {
    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: true,
      confirmed: true,
      balance: 15,
      idempotent,
    });
    const response = await request();
    expect(response.status).toBe(200);
    const receipt = response.headers.get('X-Credit-Receipt');
    expect(receipt).toBeTruthy();
    expect(consumeCredits).toHaveBeenCalledWith(
      'key-fixture',
      5,
      receipt,
      '/api/v1/coverage',
      expect.objectContaining({ reason: '/api/v1/coverage' })
    );
    expect(response.headers.get('X-Credit-Status')).toBe(status);
    expect(response.headers.get('X-Credit-Balance')).toBe('20');
    expect(response.headers.get('X-Credit-Balance-After')).toBe('15');
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain('X-Credit-Receipt');
  });

  it('serves an identical replay without re-executing or re-charging', async () => {
    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: true,
      confirmed: true,
      balance: 15,
    });

    const first = await request();
    expect(consumeCredits).toHaveBeenCalledTimes(1);
    expect(first.headers.get('X-Credit-Status')).toBe('charged');
    expect(first.headers.get('X-Credit-Cost')).toBe('5');
    expect(first.headers.get('X-Credit-Balance')).toBe('20');
    expect(first.headers.get('X-Credit-Balance-After')).toBe('15');
    const receipt = first.headers.get('X-Credit-Receipt');
    expect(receipt).toBeTruthy();

    const replay = await request();
    expect(consumeCredits).toHaveBeenCalledTimes(1);
    expect(replay.status).toBe(200);
    expect(replay.headers.get('X-Credit-Status')).toBe('replayed');
    // A replay is free: the header reports 0, not the original price.
    expect(replay.headers.get('X-Credit-Cost')).toBe('0');
    expect(replay.headers.get('X-Credit-Zero-Reason')).toBe('replay');
    expect(replay.headers.get('X-Credit-Balance-After')).toBe('15');
    expect(replay.headers.get('X-Credit-Receipt')).toBe(receipt);
    expect(await replay.json()).toEqual({ result: 'fixture' });
  });

  function batchRoute(body: unknown) {
    (createQuotaMiddleware as jest.Mock).mockImplementation((_options, context) => async () => ({
      success: true,
      quotaInfo: {
        creditCost: 6,
        creditUnitCost: 2,
        creditBalance: 20,
        billableItems: 3,
        pendingCharge: {
          apiKeyId: 'key-fixture',
          cost: 6,
          meteringKey: `rest:key-fixture:${context.requestId}`,
        },
      },
    }));
    return createApiHandler(async () => NextResponse.json(body), {
      middlewares: { auth: { required: true, requireApiKey: true }, quota: true, cors: true },
    });
  }

  it('bills a partial batch per successful item and echoes the settlement', async () => {
    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: true,
      confirmed: true,
      balance: 16,
    });
    const route = batchRoute({
      data: [{ error: null }, { error: null }, { error: 'no data' }],
    });

    const response = await route(
      {
        method: 'POST',
        nextUrl: new URL('https://example.test/api/v1/prices/batch'),
        headers: new Headers(),
      } as never,
      { params: Promise.resolve({}) }
    );

    // 3 requested, 2 usable → 2 credits × 2 = 4.
    expect(consumeCredits).toHaveBeenCalledWith(
      'key-fixture',
      4,
      expect.any(String),
      '/api/v1/prices/batch',
      expect.objectContaining({
        reason: 'batch_partial',
        meta: { requested: 3, charged: 2 },
      })
    );
    expect(response.headers.get('X-Credit-Cost')).toBe('4');
    expect(response.headers.get('X-Credit-Status')).toBe('charged');
    expect((await response.json()).billing).toEqual({
      itemsRequested: 3,
      itemsCharged: 2,
      unitCredits: 2,
      costCredits: 4,
      status: 'batch_partial',
    });
  });

  it('waives a batch with no usable rows and records a 0-delta ledger row', async () => {
    const route = batchRoute({ data: [{ error: 'timeout' }, { error: 'no data' }] });

    const response = await route(
      {
        method: 'POST',
        nextUrl: new URL('https://example.test/api/v1/prices/batch'),
        headers: new Headers(),
      } as never,
      { params: Promise.resolve({}) }
    );

    expect(consumeCredits).not.toHaveBeenCalled();
    expect(recordWaivedCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 'key-fixture',
        reason: 'upstream_failed',
      })
    );
    expect(response.headers.get('X-Credit-Cost')).toBe('0');
    expect(response.headers.get('X-Credit-Status')).toBe('waived');
    expect(response.headers.get('X-Credit-Zero-Reason')).toBe('upstream_failed');
    expect((await response.json()).billing).toEqual({
      itemsRequested: 3,
      itemsCharged: 0,
      unitCredits: 2,
      costCredits: 0,
      status: 'waived',
    });
  });

  function batchRequest(key: string) {
    return {
      method: 'POST',
      nextUrl: new URL('https://example.test/api/v1/prices/batch'),
      headers: new Headers({ 'Idempotency-Key': key }),
    } as never;
  }

  it('caches an all-failed batch with its original zero reason and replays it free', async () => {
    const route = batchRoute({ data: [{ error: 'timeout' }, { error: 'no data' }] });

    const first = await route(batchRequest('fail-a'), { params: Promise.resolve({}) });
    expect(first.headers.get('X-Credit-Status')).toBe('waived');
    expect(first.headers.get('X-Credit-Zero-Reason')).toBe('upstream_failed');
    expect(recordWaivedCredit).toHaveBeenCalledTimes(1);

    // The cache entry preserves the original terminal reason; only a replay
    // reports `replay`.
    const cached = getCachedMcpResult(
      restRequestFingerprint({
        identity: 'key-fixture',
        method: 'POST',
        path: '/api/v1/prices/batch',
        search: '',
        bodyText: '',
        clientKey: 'fail-a',
      })
    );
    expect(cached?.zeroReason).toBe('upstream_failed');
    expect(cached?.priceCredits).toBe(0);

    const replay = await route(batchRequest('fail-a'), { params: Promise.resolve({}) });
    expect(consumeCredits).not.toHaveBeenCalled();
    expect(recordWaivedCredit).toHaveBeenCalledTimes(1);
    expect(replay.status).toBe(200);
    expect(replay.headers.get('X-Credit-Status')).toBe('replayed');
    expect(replay.headers.get('X-Credit-Cost')).toBe('0');
    expect(replay.headers.get('X-Credit-Zero-Reason')).toBe('replay');
    const body = await replay.json();
    expect(body.data).toEqual([{ error: 'timeout' }, { error: 'no data' }]);
    expect(body.billing.status).toBe('waived');
  });

  it('keeps the all-failed entry separate from a priced request', async () => {
    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: true,
      confirmed: true,
      balance: 14,
    });
    const failed = batchRoute({ data: [{ error: 'upstream down' }] });
    const priced = batchRoute({
      data: [{ error: null }, { error: null }, { error: null }],
    });

    await failed(batchRequest('fail-b'), { params: Promise.resolve({}) });
    expect(consumeCredits).not.toHaveBeenCalled();

    await priced(batchRequest('paid-b'), { params: Promise.resolve({}) });
    expect(consumeCredits).toHaveBeenCalledTimes(1);
    expect(consumeCredits).toHaveBeenCalledWith(
      'key-fixture',
      6,
      expect.any(String),
      '/api/v1/prices/batch',
      expect.objectContaining({ reason: 'prices.batch' })
    );

    // Replaying either key cannot cross over to the other entry.
    await failed(batchRequest('fail-b'), { params: Promise.resolve({}) });
    const replayPriced = await priced(batchRequest('paid-b'), { params: Promise.resolve({}) });
    expect(consumeCredits).toHaveBeenCalledTimes(1);
    expect(replayPriced.headers.get('X-Credit-Status')).toBe('replayed');
    expect(replayPriced.headers.get('X-Credit-Zero-Reason')).toBe('replay');
  });

  it('treats different client idempotency keys as different logical requests', async () => {
    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: true,
      confirmed: true,
      balance: 15,
    });

    await request(200, new Headers({ 'Idempotency-Key': 'retry-a' }));
    await request(200, new Headers({ 'Idempotency-Key': 'retry-b' }));
    expect(consumeCredits).toHaveBeenCalledTimes(2);

    await request(200, new Headers({ 'Idempotency-Key': 'retry-a' }));
    expect(consumeCredits).toHaveBeenCalledTimes(2);
  });

  it('does not cache a handler failure, so a retry is free of a stale result', async () => {
    const failed = await request(500);
    expect(failed.status).toBe(500);

    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: true,
      confirmed: true,
      balance: 15,
    });
    const retried = await request(200);
    expect(retried.status).toBe(200);
    expect(consumeCredits).toHaveBeenCalledTimes(1);
  });

  it('does not represent an unknown commit as a confirmed charge or balance', async () => {
    (consumeCredits as jest.Mock).mockResolvedValue({ ok: true, confirmed: false });
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Credit-Status')).toBe('degraded');
    expect(response.headers.get('X-Credit-Balance-After')).toBeNull();
  });

  it('withholds successful output when the atomic debit rejects a race', async () => {
    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: false,
      confirmed: true,
      reason: 'INSUFFICIENT_CREDITS',
    });
    const response = await request();
    expect(response.status).toBe(402);
    expect(response.headers.get('X-Credit-Status')).toBe('not_charged');
    expect(response.headers.get('X-Credit-Receipt')).toBeTruthy();
    expect(await response.json()).not.toHaveProperty('result');
  });

  it('emits the 80% spend-cap warning header when the precheck flags it', async () => {
    (createQuotaMiddleware as jest.Mock).mockImplementation((_options, context) => async () => ({
      success: true,
      quotaInfo: {
        creditCost: 5,
        creditBalance: 20,
        creditBudgetWarning: true,
        pendingCharge: {
          apiKeyId: 'key-fixture',
          cost: 5,
          meteringKey: `rest:key-fixture:${context.requestId}`,
        },
      },
    }));
    (consumeCredits as jest.Mock).mockResolvedValue({
      ok: true,
      confirmed: true,
      balance: 15,
      idempotent: false,
    });

    const response = await request();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Credit-Budget-Warning')).toBe('80');
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain(
      'X-Credit-Budget-Warning'
    );
  });

  it.each([400, 500])('never charges a handler failure (%s)', async (status) => {
    const response = await request(status);
    expect(response.status).toBe(status);
    expect(consumeCredits).not.toHaveBeenCalled();
    expect(response.headers.get('X-Credit-Status')).toBe('not_charged');
    expect(response.headers.get('X-Credit-Cost')).toBe('0');
  });

  it('waives and never bills a success that arrives after the 25 s route deadline', async () => {
    jest.useFakeTimers();
    try {
      (consumeCredits as jest.Mock).mockClear();
      (recordWaivedCredit as jest.Mock).mockClear();
      (logApiKeyUsage as jest.Mock).mockClear();

      // Exercise the real error middleware so the 504 body contract is
      // asserted end to end rather than through the default 500 stub.
      const actualMiddleware = jest.requireActual('../middleware') as {
        createErrorMiddleware: typeof createErrorMiddleware;
      };
      (createErrorMiddleware as jest.Mock).mockImplementation(() =>
        actualMiddleware.createErrorMiddleware({ logErrors: false })
      );

      let resolveLate: ((response: NextResponse) => void) | undefined;
      const late = new Promise<NextResponse>((resolve) => {
        resolveLate = resolve;
      });

      const route = createApiHandler(() => late, {
        middlewares: { auth: { required: true, requireApiKey: true }, quota: true, cors: true },
      });

      const pending = route(
        {
          method: 'GET',
          nextUrl: new URL('https://example.test/api/v1/coverage'),
          headers: new Headers(),
        } as never,
        { params: Promise.resolve({}) }
      );

      await jest.advanceTimersByTimeAsync(25_000);
      const response = await pending;
      const body = await response.json();

      expect(response.status).toBe(504);
      expect(body.error.code).toBe('ROUTE_DEADLINE_EXCEEDED');
      expect(body.error.retryable).toBe(true);
      expect(body.error.details).toMatchObject({ scope: 'route', deadlineMs: 25_000 });
      expect(response.headers.get('X-Credit-Status')).toBe('not_charged');
      expect(response.headers.get('X-Credit-Zero-Reason')).toBe('timeout');
      expect(recordWaivedCredit).toHaveBeenCalledTimes(1);
      expect(recordWaivedCredit).toHaveBeenCalledWith(
        expect.objectContaining({ keyId: 'key-fixture', reason: 'timeout' })
      );
      expect(consumeCredits).not.toHaveBeenCalled();

      // The abandoned upstream now answers successfully. The response is
      // already committed as a 504, so this late result must not add a debit,
      // a second waiver row or a second usage row.
      await jest.advanceTimersByTimeAsync(0);
      const usageRowsAfterDeadline = (logApiKeyUsage as jest.Mock).mock.calls.length;
      resolveLate?.(NextResponse.json({ result: 'late' }, { status: 200 }));
      await jest.advanceTimersByTimeAsync(10_000);
      await Promise.resolve();

      expect(consumeCredits).not.toHaveBeenCalled();
      expect(recordWaivedCredit).toHaveBeenCalledTimes(1);
      expect((logApiKeyUsage as jest.Mock).mock.calls.length).toBe(usageRowsAfterDeadline);
    } finally {
      jest.useRealTimers();
    }
  });
});
