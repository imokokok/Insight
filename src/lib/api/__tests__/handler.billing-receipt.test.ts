import { NextResponse } from 'next/server';

import { consumeCredits } from '@/lib/billing/creditWallet';

import { createApiHandler } from '../handler';
import { createAuthMiddleware, createQuotaMiddleware } from '../middleware';

jest.mock('@/lib/billing/creditWallet', () => ({ consumeCredits: jest.fn() }));
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

  async function request(status = 200) {
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
        headers: new Headers(),
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
    const receipt = `rest:key-fixture:${response.headers.get('X-Request-Id')}`;
    expect(response.headers.get('X-Credit-Receipt')).toBe(receipt);
    expect(consumeCredits).toHaveBeenCalledWith('key-fixture', 5, receipt, '/api/v1/coverage');
    expect(response.headers.get('X-Credit-Status')).toBe(status);
    expect(response.headers.get('X-Credit-Balance')).toBe('20');
    expect(response.headers.get('X-Credit-Balance-After')).toBe('15');
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain('X-Credit-Receipt');
  });

  it('does not represent an unknown commit as a confirmed charge or balance', async () => {
    (consumeCredits as jest.Mock).mockResolvedValue({ ok: true, confirmed: false });
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Credit-Status')).toBe('unconfirmed');
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

  it.each([400, 500])('never charges a handler failure (%s)', async (status) => {
    const response = await request(status);
    expect(response.status).toBe(status);
    expect(consumeCredits).not.toHaveBeenCalled();
    expect(response.headers.get('X-Credit-Status')).toBeNull();
  });
});
