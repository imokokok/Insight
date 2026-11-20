import { type NextRequest, NextResponse } from 'next/server';

import { extractClientIp } from '@/lib/api/middleware/rateLimitMiddleware';
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { ApiResponseBuilder } from '@/lib/api/response';
import { nowInSeconds } from '@/lib/utils/time';

const CAPABILITY_WINDOW_MS = 60_000;
const CAPABILITY_MAX_REQUESTS = 20;

function capabilityClientKey(request: NextRequest): string {
  // Use the client IP supplied by the trusted ingress adapter. Caller-provided
  // fingerprint headers are not accepted as rate-limit identities.
  return `ip:${extractClientIp(request)}`;
}

/** Apply a cheap outer limit before a capability token causes a database lookup. */
export async function enforceCapabilityRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const path = request.nextUrl?.pathname ?? safePathname(request.url);
  const result = await rateLimitStore.increment(
    `capability:${capabilityClientKey(request)}:${path}`,
    CAPABILITY_WINDOW_MS
  );
  if (result.count <= CAPABILITY_MAX_REQUESTS) return null;

  const retryAfter = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1_000));
  const response = NextResponse.json(
    ApiResponseBuilder.error('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later', {
      retryable: true,
      details: { retryAfter },
    }),
    { status: 429 }
  );
  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Limit', String(CAPABILITY_MAX_REQUESTS));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(nowInSeconds() + retryAfter));
  return response;
}

function safePathname(url: string | undefined): string {
  try {
    return url ? new URL(url).pathname : 'unknown-route';
  } catch {
    return 'unknown-route';
  }
}
