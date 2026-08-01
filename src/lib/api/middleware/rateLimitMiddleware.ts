import { type NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

import { ApiResponseBuilder } from '../response';

import { rateLimitStore } from './rateLimitStore';

const logger = createLogger('rate-limit-middleware');

interface RateLimitContext {
  apiKeyId?: string;
}

export interface RateLimitMiddlewareOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (request: NextRequest, context?: RateLimitContext) => string;
  handler?: (request: NextRequest, retryAfter: number, limit?: number) => NextResponse;
  preset?: 'strict' | 'moderate' | 'lenient' | 'api';
}

export type { RateLimitContext };

const PRESET_CONFIGS: Record<string, { windowMs: number; maxRequests: number }> = {
  strict: { windowMs: 60000, maxRequests: 20 },
  moderate: { windowMs: 60000, maxRequests: 60 },
  lenient: { windowMs: 60000, maxRequests: 200 },
  api: { windowMs: 60000, maxRequests: 100 },
};

type RateLimitMiddlewareResult =
  | { success: true; remaining: number; resetTime: number; limit: number }
  | { success: false; response: NextResponse };

export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions = {},
  context?: RateLimitContext
) {
  const presetConfig = options.preset ? PRESET_CONFIGS[options.preset] : null;
  const {
    windowMs = presetConfig?.windowMs ?? 60000,
    maxRequests = presetConfig?.maxRequests ?? 100,
    keyGenerator = defaultKeyGenerator,
    handler = defaultRateLimitHandler,
  } = options;

  return async (request: NextRequest): Promise<RateLimitMiddlewareResult> => {
    const key = keyGenerator(request, context);

    const result = await rateLimitStore.increment(key, windowMs);

    if (result.count > maxRequests) {
      const now = Date.now();
      const retryAfter = Math.ceil((result.resetTime - now) / 1000);
      logger.warn('Rate limit exceeded', { key, count: result.count, maxRequests });
      return { success: false, response: handler(request, retryAfter, maxRequests) };
    }

    return {
      success: true,
      remaining: Math.max(0, maxRequests - result.count),
      resetTime: result.resetTime,
      limit: maxRequests,
    };
  };
}

export function extractClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const forwarded = request.headers.get('x-forwarded-for');

  if (vercelIp) {
    // Take the first (leftmost) entry: that is the original client IP. Using
    // the last entry would rate-limit by the last proxy hop, which is
    // spoofable and shared across many clients.
    return vercelIp.split(',')[0]?.trim() || 'unknown';
  }
  if (realIp) {
    return realIp.trim();
  }
  if (forwarded) {
    // Take the first (leftmost) entry: that is the original client IP.
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return 'unknown';
}

function defaultKeyGenerator(request: NextRequest, _context?: RateLimitContext): string {
  let ip = extractClientIp(request);

  if (ip === 'unknown') {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      let h1 = 0xdeadbeef;
      let h2 = 0x41c6ce57;
      for (let i = 0; i < authHeader.length; i++) {
        const ch = authHeader.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
      h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
      h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
      ip = `token:${hash.toString(36)}`;
    } else {
      // No IP and no auth token — use a shared anonymous bucket.  Using a
      // per-request random key (the old behaviour) completely bypassed rate
      // limiting since every request got its own counter.  A shared bucket
      // is the only effective option for completely anonymous traffic.
      ip = 'anon:shared';
    }
    logger.warn('Rate limit key generated for unknown IP', {
      keySource: authHeader ? 'auth-token-hash' : 'shared-anon',
      path: request.nextUrl.pathname,
    });
  }

  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

export function rateLimitKeyGenerator(request: NextRequest, context?: RateLimitContext): string {
  if (context?.apiKeyId) {
    return `apikey:${context.apiKeyId}:${request.nextUrl.pathname}`;
  }
  const ip = extractClientIp(request);
  return `${ip}:${request.nextUrl.pathname}`;
}

function defaultRateLimitHandler(
  _request: NextRequest,
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
