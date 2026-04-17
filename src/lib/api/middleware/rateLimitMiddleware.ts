import { type NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

import { ApiResponseBuilder } from '../response';

import { rateLimitStore } from './rateLimitStore';

const logger = createLogger('rate-limit-middleware');

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

    const result = await rateLimitStore.increment(key, windowMs);

    if (result.count >= maxRequests) {
      const now = Date.now();
      const retryAfter = Math.ceil((result.resetTime - now) / 1000);
      logger.warn('Rate limit exceeded', { key, count: result.count, maxRequests });
      return { success: false, response: handler(request, retryAfter, maxRequests) };
    }

    return { success: true, remaining: maxRequests - result.count, resetTime: result.resetTime };
  };
}

function defaultKeyGenerator(request: NextRequest): string {
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const forwarded = request.headers.get('x-forwarded-for');

  let ip: string;
  if (vercelIp) {
    ip = vercelIp.split(',').pop()?.trim() || 'unknown';
  } else if (realIp) {
    ip = realIp.trim();
  } else if (forwarded) {
    ip = forwarded.split(',').pop()?.trim() || 'unknown';
  } else {
    ip = 'unknown';
  }

  if (ip === 'unknown') {
    const authHeader = request.headers.get('key');
    if (authHeader) {
      let hash = 0;
      for (let i = 0; i < authHeader.length; i++) {
        const char = authHeader.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      ip = `token:${Math.abs(hash).toString(36)}`;
    }
  }

  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

function defaultRateLimitHandler(
  request: NextRequest,
  retryAfter: number,
  limit: number = 100
): NextResponse {
  const response = NextResponse.json(
    ApiResponseBuilder.error('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later', {
      retryable: true,
      details: { retryAfter },
    }),
    { status: 429 }
  );

  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Limit', String(limit));
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
  rateLimitStore.clear?.();
}

export function stopRateLimitCleanup(): void {
  rateLimitStore.stopCleanup?.();
}
