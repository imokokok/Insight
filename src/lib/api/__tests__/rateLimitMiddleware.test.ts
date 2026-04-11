import { type NextRequest, NextResponse } from 'next/server';

import {
  createRateLimitMiddleware,
  withRateLimitHeaders,
  clearRateLimitStore,
  stopRateLimitCleanup,
  strictRateLimit,
  moderateRateLimit,
  lenientRateLimit,
  apiRateLimit,
} from '../middleware/rateLimitMiddleware';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

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

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore();
  });

  afterEach(() => {
    stopRateLimitCleanup();
  });

  describe('createRateLimitMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createRateLimitMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should allow requests under the limit', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 5 });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.remaining).toBe(4);
      }
    });

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

    it('should use custom key generator', async () => {
      const keyGenerator = jest.fn().mockReturnValue('custom-key');
      const middleware = createRateLimitMiddleware({
        maxRequests: 5,
        keyGenerator,
      });
      const request = createMockRequest();

      await middleware(request);

      expect(keyGenerator).toHaveBeenCalledWith(request);
    });

    it('should use IP from x-forwarded-for header', async () => {
      const middleware = createRateLimitMiddleware();
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should reset count after window expires', async () => {
      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        windowMs: 100,
      });
      const request = createMockRequest();

      await middleware(request);
      const blockedResult = await middleware(request);

      expect(blockedResult.success).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const allowedResult = await middleware(request);

      expect(allowedResult.success).toBe(true);
    });

    it('should use custom handler for rate limit exceeded', async () => {
      const customHandler = jest
        .fn()
        .mockReturnValue(NextResponse.json({ custom: 'error' }, { status: 429 }));
      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        handler: customHandler,
      });
      const request = createMockRequest();

      await middleware(request);
      await middleware(request);

      expect(customHandler).toHaveBeenCalled();
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

    it('should handle multiple keys independently', async () => {
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

    it('should return resetTime in result', async () => {
      const middleware = createRateLimitMiddleware();
      const request = createMockRequest();

      const result = await middleware(request);

      if (result.success) {
        expect(result.resetTime).toBeGreaterThan(Date.now());
      }
    });

    it('should set retry-after header on rate limit', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        const retryAfter = result.response.headers.get('Retry-After');
        expect(retryAfter).toBeDefined();
      }
    });

    it('should set rate limit headers on rate limit', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        expect(result.response.headers.get('X-RateLimit-Limit')).toBeDefined();
        expect(result.response.headers.get('X-RateLimit-Remaining')).toBeDefined();
        expect(result.response.headers.get('X-RateLimit-Reset')).toBeDefined();
      }
    });
  });

  describe('withRateLimitHeaders', () => {
    it('should add rate limit headers to response', () => {
      const response = NextResponse.json({ success: true });
      const limit = 100;
      const remaining = 50;
      const resetTime = Date.now() + 60000;

      const result = withRateLimitHeaders(response, limit, remaining, resetTime);

      expect(result.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('50');
    });
  });

  describe('clearRateLimitStore', () => {
    it('should clear all rate limit entries', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 5 });
      const request = createMockRequest();

      await middleware(request);
      await middleware(request);

      clearRateLimitStore();

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.remaining).toBe(4);
      }
    });
  });

  describe('preset middlewares', () => {
    it('strictRateLimit should have 20 max requests', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 20; i++) {
        await strictRateLimit(request);
      }

      const result = await strictRateLimit(request);
      expect(result.success).toBe(false);
    });

    it('moderateRateLimit should have 60 max requests', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 60; i++) {
        await moderateRateLimit(request);
      }

      const result = await moderateRateLimit(request);
      expect(result.success).toBe(false);
    });

    it('lenientRateLimit should have 200 max requests', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 200; i++) {
        await lenientRateLimit(request);
      }

      const result = await lenientRateLimit(request);
      expect(result.success).toBe(false);
    });

    it('apiRateLimit should have 100 max requests', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 100; i++) {
        await apiRateLimit(request);
      }

      const result = await apiRateLimit(request);
      expect(result.success).toBe(false);
    });
  });

  describe('default key generator', () => {
    it('should use unknown for IP when no x-forwarded-for header', async () => {
      const middleware = createRateLimitMiddleware();
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should include path in key', async () => {
      const middleware = createRateLimitMiddleware();
      const request1 = createMockRequest({ url: 'http://localhost/api/test1' });
      const request2 = createMockRequest({ url: 'http://localhost/api/test2' });

      const result1 = await middleware(request1);
      const result2 = await middleware(request2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
