import { NextResponse } from 'next/server';

import { createApiHandler, ok } from '../handler';

jest.mock('../apiKey', () => ({ logApiKeyUsage: jest.fn() }));
jest.mock('../middleware', () => ({
  createAuthMiddleware: jest.fn(),
  createLoggingMiddleware: jest.fn(),
  createErrorMiddleware: jest.fn(() => async () => NextResponse.json({}, { status: 500 })),
  createRateLimitMiddleware: jest.fn(),
  logResponse: jest.fn(),
}));

/** Minimal route invocation with no middlewares — exercises only the
 *  handler-result normalization boundary. */
async function invoke(handlerResult: unknown): Promise<Response> {
  const route = createApiHandler(async () => handlerResult as never);
  return route(
    {
      method: 'GET',
      nextUrl: new URL('https://example.test/api/v1/fixture'),
      headers: new Headers(),
    } as never,
    { params: Promise.resolve({}) }
  );
}

describe('createApiHandler response normalization', () => {
  it('wraps a raw object payload in the standard success envelope', async () => {
    const response = await invoke({ symbol: 'ETH', price: 123.45 });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ symbol: 'ETH', price: 123.45 });
    expect(typeof body.meta.timestamp).toBe('number');
  });

  it('wraps raw array and primitive payloads', async () => {
    const arrayResponse = await invoke(['a', 'b']);
    expect((await arrayResponse.json()).data).toEqual(['a', 'b']);

    const stringResponse = await invoke('pong');
    expect((await stringResponse.json()).data).toBe('pong');
  });

  it('serializes a pre-built ok() envelope verbatim, including custom meta', async () => {
    const response = await invoke(ok({ n: 1 }, { source: 'fixture' }));
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: { n: 1 },
      meta: { timestamp: expect.any(Number), source: 'fixture' },
    });
  });

  it('passes a ready-made NextResponse through untouched', async () => {
    const custom = NextResponse.json({ raw: true, success: false }, { status: 201 });
    custom.headers.set('X-Custom', 'kept');
    const response = await invoke(custom);
    expect(response.status).toBe(201);
    expect(response.headers.get('X-Custom')).toBe('kept');
    // No envelope added: the route owns the wire format entirely.
    expect(await response.json()).toEqual({ raw: true, success: false });
  });

  it('passes a plain (non-Next) Response through without double wrapping', async () => {
    const plain = new Response(JSON.stringify({ plain: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await invoke(plain);
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ plain: true });
  });

  it('keeps X-Request-Id / Server-Timing diagnostics on normalized responses', async () => {
    const response = await invoke({ fixture: true });
    expect(response.headers.get('X-Request-Id')).toMatch(/^req_/);
    expect(response.headers.get('Server-Timing')).toMatch(/^app;dur=\d+$/);
  });
});
