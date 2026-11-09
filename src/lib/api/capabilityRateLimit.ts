import { type NextRequest, NextResponse } from 'next/server';

import { extractClientIp } from '@/lib/api/middleware/rateLimitMiddleware';
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { ApiResponseBuilder } from '@/lib/api/response';
import { nowInSeconds } from '@/lib/utils/time';

const CAPABILITY_WINDOW_MS = 60_000;
const CAPABILITY_MAX_REQUESTS = 20;

function capabilityClientKey(request: NextRequest): string {
  // Vercel supplies this TLS fingerprint. Accept only the compact digest form
  // so an arbitrary header cannot turn the rate-limit store into a key sink.
  const ja4 = request.headers.get('x-vercel-ja4-digest')?.trim();
  const fingerprint = ja4 && /^[A-Za-z0-9_-]{8,128}$/.test(ja4) ? `ja4:${ja4}` : null;
  return fingerprint ?? `ip:${extractClientIp(request)}`;
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
