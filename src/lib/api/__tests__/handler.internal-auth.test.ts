import { NextResponse } from 'next/server';

import { createApiHandler } from '../handler';
import { verifyInternalToken } from '../internalToken';
import { createAuthMiddleware } from '../middleware';

const authMiddleware = jest.fn(async () => ({
  success: false as const,
  response: NextResponse.json({ error: 'auth required' }, { status: 401 }),
}));

jest.mock('../internalToken', () => ({
  INTERNAL_COOKIE_NAME: '__internal',
  verifyInternalToken: jest.fn(async () => true),
}));

jest.mock('../middleware', () => ({
  createAuthMiddleware: jest.fn(() => authMiddleware),
  createLoggingMiddleware: jest.fn(),
  createErrorMiddleware: jest.fn(
    () => async () => NextResponse.json({ error: 'unexpected' }, { status: 500 })
  ),
  createRateLimitMiddleware: jest.fn(),
  createQuotaMiddleware: jest.fn(),
  logResponse: jest.fn(),
}));

describe('paid v1 internal-cookie isolation', () => {
  beforeEach(() => {
    authMiddleware.mockImplementation(async () => ({
      success: false as const,
      response: NextResponse.json({ error: 'auth required' }, { status: 401 }),
    }));
    (createAuthMiddleware as jest.Mock).mockReturnValue(authMiddleware);
    (verifyInternalToken as jest.Mock).mockResolvedValue(true);
  });

  it('does not let a replayed website cookie bypass v1 API-key auth', async () => {
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const route = createApiHandler(handler, {
      middlewares: { auth: { required: true, requireApiKey: true } },
      skipInternalAuthAndRateLimit: true,
    });
    const request = {
      method: 'GET',
      nextUrl: new URL('https://www.oracleinsight.xyz/api/v1/safety/pre-trade'),
      headers: new Headers({ cookie: '__internal=valid-signed-token' }),
      cookies: { get: () => ({ value: 'valid-signed-token' }) },
    } as never;

    const response = await route(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    expect(authMiddleware).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('retains the legacy cookie bypass only for non-v1 UI read routes', async () => {
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const route = createApiHandler(handler, {
      middlewares: { auth: { required: true } },
      skipInternalAuthAndRateLimit: true,
    });
    const request = {
      method: 'GET',
      nextUrl: new URL('https://www.oracleinsight.xyz/api/reports'),
      headers: new Headers({ cookie: '__internal=valid-signed-token' }),
      cookies: { get: () => ({ value: 'valid-signed-token' }) },
    } as never;

    const response = await route(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(authMiddleware).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not let a replayed website cookie authorize a non-v1 mutation', async () => {
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const route = createApiHandler(handler, {
      middlewares: { auth: { required: true } },
      skipInternalAuthAndRateLimit: true,
    });
    const request = {
      method: 'POST',
      nextUrl: new URL('https://www.oracleinsight.xyz/api/reputation'),
      headers: new Headers({ cookie: '__internal=valid-signed-token' }),
      cookies: { get: () => ({ value: 'valid-signed-token' }) },
    } as never;

    const response = await route(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    expect(authMiddleware).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });
});
