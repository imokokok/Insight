import { NextResponse } from 'next/server';

import { timingSafeEqual } from 'crypto';

/**
 * Shared authentication for Vercel Cron routes.
 *
 * Cron routes do NOT use `createApiHandler` — they are internal triggers
 * invoked by the Vercel Cron scheduler, not user- or API-key-facing
 * endpoints. They authenticate via a shared `CRON_SECRET` sent as a
 * Bearer token in the `Authorization` header.
 *
 * Previously each cron route copy-pasted the same 5-line check. A single
 * shared helper guarantees every route applies identical rules and makes
 * future changes (header name, IP allow-list, …) a one-line edit.
 *
 * Comparison is timing-safe (`crypto.timingSafeEqual`) to avoid leaking
 * the secret's length or prefix via response-timing side-channels.
 */

/**
 * Constant-time string comparison.
 *
 * `crypto.timingSafeEqual` throws when the input lengths differ, so we
 * normalise that case: perform a self-comparison (to keep timing roughly
 * constant) and return `false`. The length of the secret is a low-value
 * signal (the `Bearer ` prefix is public anyway), but avoiding the throw
 * keeps behaviour uniform.
 */
function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufB, bufB);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify the cron request's Bearer token against `CRON_SECRET`.
 *
 * @returns `null` when the request is authorised (caller should proceed),
 *          or a `401 NextResponse` to return immediately when not.
 *
 * Fails closed: if `CRON_SECRET` is not configured, every request is
 * rejected. This prevents a cron route from silently becoming public if
 * the env var is accidentally dropped in an environment.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !safeEqualStrings(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
