import { type NextRequest, NextResponse } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/response';

import { extractClientIp } from './rateLimitMiddleware';

interface BurstEntry {
  count: number;
  resetAt: number;
  lastAccessedAt: number;
}

const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 300;
const MAX_ENTRIES = 10_000;
const entries = new Map<string, BurstEntry>();

function prune(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }

  if (entries.size <= MAX_ENTRIES) return;
  const oldest = [...entries.entries()]
    .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt)
    .slice(0, entries.size - MAX_ENTRIES);
  for (const [key] of oldest) entries.delete(key);
}

/**
 * A cheap, per-instance burst shield that runs before validation and API-key
 * lookup. The authoritative, distributed limiter still runs after auth; this
 * first layer only prevents malformed/invalid-key floods from reaching the DB
 * unchecked on a hot serverless instance.
 */
export function checkPreAuthBurstLimit(
  request: NextRequest,
  maxRequests = DEFAULT_MAX_REQUESTS
): NextResponse | null {
  if (maxRequests < 0) return null;

  const now = Date.now();
  const key = `${extractClientIp(request)}:${request.nextUrl.pathname}`;
  let entry = entries.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS, lastAccessedAt: now };
    entries.set(key, entry);
  }

  entry.count += 1;
  entry.lastAccessedAt = now;
  if (entries.size > MAX_ENTRIES) prune(now);

  if (entry.count <= maxRequests) return null;

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  const response = NextResponse.json(
    ApiResponseBuilder.error('RATE_LIMIT_EXCEEDED', 'Too many requests', {
      retryable: true,
      details: { retryAfter, phase: 'pre-auth' },
    }),
    { status: 429 }
  );
  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Limit', String(maxRequests));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)));
  return response;
}

export function clearPreAuthBurstLimiter(): void {
  entries.clear();
}
