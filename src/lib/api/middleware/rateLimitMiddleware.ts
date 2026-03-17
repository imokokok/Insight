import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import { ApiResponseBuilder } from '../response';

const logger = createLogger('rate-limit-middleware');

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitMiddlewareOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (request: NextRequest, retryAfter: number) => NextResponse;
  preset?: 'strict' | 'moderate' | 'lenient' | 'api';
}

export type RateLimitMiddlewareResult =
  | { success: true; remaining: number; resetTime: number }
  | { success: false; response: NextResponse };

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions = {}) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    handler = defaultRateLimitHandler,
  } = options;

  return async (request: NextRequest): Promise<RateLimitMiddlewareResult> => {
    const key = keyGenerator(request);
    const now = Date.now();
    const resetTime = now + windowMs;

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime });
      return { success: true, remaining: maxRequests - 1, resetTime };
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      logger.warn('Rate limit exceeded', { key, count: entry.count, maxRequests });
      return { success: false, response: handler(request, retryAfter) };
    }

    entry.count++;
    return { success: true, remaining: maxRequests - entry.count, resetTime };
  };
}

function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

function defaultRateLimitHandler(request: NextRequest, retryAfter: number): NextResponse {
  const response = NextResponse.json(
    ApiResponseBuilder.error('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later', {
      retryable: true,
      i18nKey: 'errors.rateLimit',
      details: { retryAfter },
    }),
    { status: 429 }
  );

  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + retryAfter));

  return response;
}

export function withRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));
  return response;
}

export const strictRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 20,
});

export const moderateRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 60,
});

export const lenientRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 200,
});

export const apiRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 100,
});

export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
