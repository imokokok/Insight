import { type NextRequest } from 'next/server';

/**
 * Cloudflare overwrites CF-Connecting-IP at its edge. On other hosts, request
 * headers are caller-controlled, so use a shared unknown-IP bucket and prefer
 * account/token keys.
 */
export function extractTrustedClientIp(request: Pick<NextRequest, 'headers'>): string {
  if (process.env.INSIGHT_RUNTIME !== 'cloudflare') return 'unknown';
  return request.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}
