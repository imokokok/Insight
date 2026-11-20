import { type NextRequest } from 'next/server';

import {
  checkPreAuthBurstLimit,
  clearPreAuthBurstLimiter,
} from '@/lib/api/middleware/preAuthBurstLimiter';

describe('pre-auth burst limiter', () => {
  beforeEach(() => clearPreAuthBurstLimiter());

  function request(ip = '203.0.113.10'): NextRequest {
    const url = new URL('http://localhost/api/v1/prices');
    return {
      url: url.toString(),
      method: 'GET',
      headers: new Headers({ 'cf-connecting-ip': ip }),
      nextUrl: url,
    } as unknown as NextRequest;
  }

  it('allows requests within the local burst budget', () => {
    expect(checkPreAuthBurstLimit(request(), 2)).toBeNull();
    expect(checkPreAuthBurstLimit(request(), 2)).toBeNull();
  });

  it('rejects a burst before it reaches database-backed authentication', async () => {
    checkPreAuthBurstLimit(request(), 1);
    const response = checkPreAuthBurstLimit(request(), 1);

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBeTruthy();
    expect((await response?.json()).error.details.phase).toBe('pre-auth');
  });

  it('keeps trusted Cloudflare client IPs isolated', () => {
    const previousRuntime = process.env.INSIGHT_RUNTIME;
    process.env.INSIGHT_RUNTIME = 'cloudflare';
    try {
      checkPreAuthBurstLimit(request('203.0.113.10'), 1);
      expect(checkPreAuthBurstLimit(request('203.0.113.11'), 1)).toBeNull();
    } finally {
      if (previousRuntime === undefined) delete process.env.INSIGHT_RUNTIME;
      else process.env.INSIGHT_RUNTIME = previousRuntime;
    }
  });

  it('does not trust caller supplied IP headers outside Cloudflare Workers', () => {
    const previousRuntime = process.env.INSIGHT_RUNTIME;
    delete process.env.INSIGHT_RUNTIME;
    try {
      expect(checkPreAuthBurstLimit(request('203.0.113.10'), 1)).toBeNull();
      expect(checkPreAuthBurstLimit(request('203.0.113.11'), 1)?.status).toBe(429);
    } finally {
      if (previousRuntime === undefined) delete process.env.INSIGHT_RUNTIME;
      else process.env.INSIGHT_RUNTIME = previousRuntime;
    }
  });
});
