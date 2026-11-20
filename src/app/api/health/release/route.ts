import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Public build identity used by the production release gate. */
export function GET() {
  return NextResponse.json(
    { releaseSha: process.env.INSIGHT_RELEASE_SHA ?? 'unknown' },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  );
}
