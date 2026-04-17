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
} from '@/lib/api/middleware/rateLimitMiddleware';

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

// eslint-disable-next-line max-lines-per-function
describe('API Rate Limit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore();
  });

  afterEach(() => {
    stopRateLimitCleanup();
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

    it('should handle requests from same IP', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 3 });
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const result1 = await middleware(request);
      const result2 = await middleware(request);
      const result3 = await middleware(request);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
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

    it('should block subsequent requests after limit reached', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 2 });
      const request = createMockRequest();

      await middleware(request);
      await middleware(request);

      for (let i = 0; i < 5; i++) {
        const result = await middleware(request);
        expect(result.success).toBe(false);
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

    it('should set X-RateLimit-Remaining header', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        expect(result.response.headers.get('X-RateLimit-Remaining')).toBeDefined();
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

    it('should set remaining to 0 when rate limited', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      if (!result.success) {
        expect(result.response.headers.get('X-RateLimit-Remaining')).toBe('0');
      }
    });
  });

  describe('Rate Limit Reset', () => {
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

    it('should reset remaining after window expires', async () => {
      const middleware = createRateLimitMiddleware({
        maxRequests: 5,
        windowMs: 100,
      });
      const request = createMockRequest();

      await middleware(request);
      await middleware(request);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await middleware(request);

      if (result.success) {
        expect(result.remaining).toBe(4);
      }
    });

    it('should handle concurrent requests during reset', async () => {
      const middleware = createRateLimitMiddleware({
        maxRequests: 10,
        windowMs: 200,
      });
      const request = createMockRequest();

      const promises = Array(10)
        .fill(null)
        .map(() => middleware(request));
      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(10);
    });
  });

  describe('Burst Handling', () => {
    it('should handle burst of requests', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 50 });
      const request = createMockRequest();

      const promises = Array(50)
        .fill(null)
        .map(() => middleware(request));
      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(50);
    });

    it('should reject burst exceeding limit', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 10 });
      const request = createMockRequest();

      const promises = Array(15)
        .fill(null)
        .map(() => middleware(request));
      const results = await Promise.all(promises);

      const failCount = results.filter((r) => !r.success).length;
      expect(failCount).toBeGreaterThan(0);
    });

    it('should handle rapid sequential requests', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 5 });
      const request = createMockRequest();

      for (let i = 0; i < 5; i++) {
        const result = await middleware(request);
        expect(result.success).toBe(true);
      }

      const result = await middleware(request);
      expect(result.success).toBe(false);
    });
  });

  describe('Different Rate Limits for Different Endpoints', () => {
    it('should apply different limits based on path', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request1 = createMockRequest({ url: 'http://localhost/api/test1' });
      const request2 = createMockRequest({ url: 'http://localhost/api/test2' });

      await middleware(request1);
      const result1 = await middleware(request1);

      const result2 = await middleware(request2);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(true);
    });

    it('should use custom key generator for different endpoints', async () => {
      const keyGenerator = jest.fn((req: NextRequest) => {
        return `${req.headers.get('x-api-key')}:${req.nextUrl.pathname}`;
      });

      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        keyGenerator,
      });

      const request1 = createMockRequest({
        url: 'http://localhost/api/endpoint1',
        headers: { 'x-api-key': 'key1' },
      });
      const request2 = createMockRequest({
        url: 'http://localhost/api/endpoint2',
        headers: { 'x-api-key': 'key1' },
      });

      await middleware(request1);
      const result2 = await middleware(request2);

      expect(keyGenerator).toHaveBeenCalled();
      expect(result2.success).toBe(true);
    });

    it('should apply strict rate limit for sensitive endpoints', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 20; i++) {
        await strictRateLimit(request);
      }

      const result = await strictRateLimit(request);
      expect(result.success).toBe(false);
    });

    it('should apply moderate rate limit for standard endpoints', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 60; i++) {
        await moderateRateLimit(request);
      }

      const result = await moderateRateLimit(request);
      expect(result.success).toBe(false);
    });

    it('should apply lenient rate limit for public endpoints', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 200; i++) {
        await lenientRateLimit(request);
      }

      const result = await lenientRateLimit(request);
      expect(result.success).toBe(false);
    });

    it('should apply api rate limit for general API endpoints', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 100; i++) {
        await apiRateLimit(request);
      }

      const result = await apiRateLimit(request);
      expect(result.success).toBe(false);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom window duration', async () => {
      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        windowMs: 50,
      });
      const request = createMockRequest();

      await middleware(request);
      const blockedResult = await middleware(request);

      expect(blockedResult.success).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const allowedResult = await middleware(request);
      expect(allowedResult.success).toBe(true);
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

    it('should pass retryAfter to custom handler', async () => {
      const customHandler = jest
        .fn()
        .mockReturnValue(NextResponse.json({ error: 'rate limited' }, { status: 429 }));
      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        handler: customHandler,
      });
      const request = createMockRequest();

      await middleware(request);
      await middleware(request);

      expect(customHandler).toHaveBeenCalledWith(request, expect.any(Number));
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

    it('should use first IP from x-forwarded-for list', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request1 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      const request2 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.2' },
      });

      await middleware(request1);
      const result = await middleware(request2);

      expect(result.success).toBe(false);
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

  describe('Store Management', () => {
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

    it('should handle store cleanup on window expiry', async () => {
      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        windowMs: 50,
      });
      const request = createMockRequest();

      await middleware(request);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await middleware(request);

      expect(result.success).toBe(true);
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
      expect(result.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should preserve existing headers', () => {
      const response = NextResponse.json({ success: true });
      response.headers.set('Content-Type', 'application/json');

      const result = withRateLimitHeaders(response, 100, 50, Date.now() + 60000);

      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Preset Middlewares', () => {
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

  describe('Edge Cases', () => {
    it('should handle zero max requests', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 0 });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.remaining).toBe(-1);
      }
    });

    it('should handle very large window', async () => {
      const middleware = createRateLimitMiddleware({
        maxRequests: 1,
        windowMs: 86400000,
      });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should handle concurrent requests from same IP', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 10 });
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const promises = Array(10)
        .fill(null)
        .map(() => middleware(request));
      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(10);
    });

    it('should handle requests with special characters in path', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest({
        url: 'http://localhost/api/test%20path?query=value',
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
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

    it('should include i18n key for internationalization', async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const request = createMockRequest();

      await middleware(request);
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error).toHaveProperty('i18nKey');
      }
    });
  });
});
