import { type NextRequest } from 'next/server';

/**
 * Vercel overwrites its forwarded-for headers at the edge. On other hosts,
 * request headers are caller-controlled unless a trusted ingress contract is
 * configured, so use a shared unknown-IP bucket and prefer account/token keys.
 */
export function extractTrustedClientIp(request: Pick<NextRequest, 'headers'>): string {
  if (process.env.VERCEL !== '1') return 'unknown';
  const forwarded = request.headers.get('x-vercel-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}
