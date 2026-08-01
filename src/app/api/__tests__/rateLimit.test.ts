import { type NextRequest } from 'next/server';

import { createRateLimitMiddleware } from '@/lib/api/middleware/rateLimitMiddleware';
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@/lib/api/middleware/rateLimitStore', () => {
  const store = new Map<string, { count: number; resetTime: number }>();
  return {
    rateLimitStore: {
      increment: (key: string, windowMs: number) => {
        const now = Date.now();
        const resetTime = now + windowMs;
        const entry = store.get(key);
        if (!entry || entry.resetTime < now) {
          store.set(key, { count: 1, resetTime });
          return Promise.resolve({ count: 1, resetTime });
        }
        entry.count++;
        return Promise.resolve({ count: entry.count, resetTime: entry.resetTime });
      },
      get: (key: string) => {
        const entry = store.get(key);
        if (!entry || entry.resetTime < Date.now()) {
          store.delete(key);
          return Promise.resolve(null);
        }
        return Promise.resolve({ count: entry.count, resetTime: entry.resetTime });
      },
      clear: () => {
        store.clear();
      },
    },
  };
});

function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', url = 'http://localhost/api/test', headers = {} } = options;

  return {
    method,
    url,
    headers: new Headers(headers),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe('API Rate Limit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitStore.clear();
  });

  describe('Normal Request Handling', () => {
    it('should allow requests under the limit', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 5 });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.remaining).toBe(4);
      }
    });

    it('should track remaining requests correctly', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 5 });
      const request = createMockRequest();

      for (let i = 0; i < 5; i++) {
        const result = await middleware(request);
        if (result.success) {
          expect(result.remaining).toBe(4 - i);
        }
      }
    });

    it('should return resetTime in result', async () => {
      const middleware = createRateLimitMiddleware();
      const request = createMockRequest();

      const result = await middleware(request);

      if (result.success) {
        expect(result.resetTime).toBeGreaterThan(Date.now());
      }
    });

    it('should handle multiple independent keys', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request1 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const request2 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });

      const result1 = await middleware(request1);
      const result2 = await middleware(request2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Rate Limit Enforcement (429)', () => {
    it('should block requests over the limit', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 2 });
      const request = createMockRequest();

      await middleware(request);
      await middleware(request);
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(429);
      }
    });

    it('should return RATE_LIMIT_EXCEEDED error code', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    it('should indicate request is retryable', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error.retryable).toBe(true);
      }
    });

    it('should include retryAfter in error details', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error.details).toHaveProperty('retryAfter');
      }
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set Retry-After header on rate limit', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        const retryAfter = result.response.headers.get('Retry-After');
        expect(retryAfter).toBeDefined();
        expect(parseInt(retryAfter!)).toBeGreaterThan(0);
      }
    });

    it('should set X-RateLimit-Limit header', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        expect(result.response.headers.get('X-RateLimit-Limit')).toBeDefined();
      }
    });

    it('should set X-RateLimit-Remaining header to 0 when rate limited', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        expect(result.response.headers.get('X-RateLimit-Remaining')).toBe('0');
      }
    });

    it('should set X-RateLimit-Reset header', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        expect(result.response.headers.get('X-RateLimit-Reset')).toBeDefined();
      }
    });
  });

  describe('Preset Configuration', () => {
    it('should apply strict preset (20 req/min)', async () => {
      const middleware = createRateLimitMiddleware({ preset: 'strict' });
      const request = createMockRequest();

      for (let i = 0; i < 20; i++) {
        await middleware(request);
      }

      const result = await middleware(request);
      expect(result.success).toBe(false);
    });

    it('should apply moderate preset (60 req/min)', async () => {
      const middleware = createRateLimitMiddleware({ preset: 'moderate' });
      const request = createMockRequest();

      for (let i = 0; i < 60; i++) {
        await middleware(request);
      }

      const result = await middleware(request);
      expect(result.success).toBe(false);
    });

    it('should apply api preset (100 req/min)', async () => {
      const middleware = createRateLimitMiddleware({ preset: 'api' });
      const request = createMockRequest();

      for (let i = 0; i < 100; i++) {
        await middleware(request);
      }

      const result = await middleware(request);
      expect(result.success).toBe(false);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom key generator', async () => {
      const keyGenerator = jest.fn().mockReturnValue('custom-key');
      const middleware = createRateLimitMiddleware({
        maxRequests: 5,
        keyGenerator,
      });
      const request = createMockRequest();

      await middleware(request);

      expect(keyGenerator).toHaveBeenCalledWith(request, undefined);
    });

    it('should use custom handler for rate limit exceeded', async () => {
      const customHandler = jest.fn((_req: NextRequest, _retryAfter: number) => {
        return new Response(JSON.stringify({ custom: 'error' }), { status: 429 });
      }) as unknown as (
        request: NextRequest,
        retryAfter: number,
        limit?: number
      ) => import('next/server').NextResponse;

      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        handler: customHandler,
      });
      const request = createMockRequest();

      await middleware(request);
      await middleware(request);

      expect(customHandler).toHaveBeenCalled();
    });
  });

  describe('IP Address Handling', () => {
    it('should use IP from x-forwarded-for header', async () => {
      const middleware = createRateLimitMiddleware();
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should handle missing x-forwarded-for header', async () => {
      const middleware = createRateLimitMiddleware();
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should handle different IPs independently', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request1 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const request2 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });

      await middleware(request1);
      const result1 = await middleware(request1);
      const result2 = await middleware(request2);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(true);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body).toHaveProperty('success');
        expect(body.success).toBe(false);
        expect(body).toHaveProperty('error');
        expect(body.error).toHaveProperty('code');
        expect(body.error).toHaveProperty('message');
        expect(body.error).toHaveProperty('retryable');
      }
    });
  });
});
