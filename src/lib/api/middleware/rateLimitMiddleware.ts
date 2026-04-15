import { type NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

import { ApiResponseBuilder } from '../response';

const logger = createLogger('rate-limit-middleware');

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAccessTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10000;
const CLEANUP_INTERVAL = 60000;

let cleanupTimer: NodeJS.Timeout | null = null;
let isCleanupScheduled = false;

function scheduleCleanup(): void {
  if (isCleanupScheduled) return;
  isCleanupScheduled = true;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }, CLEANUP_INTERVAL);
}

function ensureCleanupScheduled(): void {
  if (!isCleanupScheduled) {
    scheduleCleanup();
  }
}

function cleanupOldestEntries(count: number): void {
  const entries = Array.from(rateLimitStore.entries());
  entries.sort((a, b) => a[1].lastAccessTime - b[1].lastAccessTime);

  for (let i = 0; i < Math.min(count, entries.length); i++) {
    rateLimitStore.delete(entries[i][0]);
  }
}

export function stopRateLimitCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    isCleanupScheduled = false;
  }
}

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
    ensureCleanupScheduled();

    const key = keyGenerator(request);
    const now = Date.now();
    const resetTime = now + windowMs;

    // 检查存储大小限制，如果超过则清理最旧的条目
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      cleanupOldestEntries(Math.floor(MAX_STORE_SIZE * 0.1)); // 清理 10% 的条目
      logger.warn('Rate limit store reached max size, cleaned up oldest entries');
    }

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime, lastAccessTime: now });
      return { success: true, remaining: maxRequests - 1, resetTime };
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      logger.warn('Rate limit exceeded', { key, count: entry.count, maxRequests });
      return { success: false, response: handler(request, retryAfter, maxRequests) };
    }

    entry.count++;
    entry.lastAccessTime = now;
    return { success: true, remaining: maxRequests - entry.count, resetTime };
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
      i18nKey: 'errors.rateLimit',
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
  rateLimitStore.clear();
}
