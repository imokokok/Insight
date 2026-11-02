import { NextResponse } from 'next/server';

import { verifyIngestSchedulerSecret } from '@/lib/api/cronAuth';
import { runSnapshotIngest } from '@/lib/reports/snapshotIngest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// External Cloudflare Cron invokes this function. The collector normally
// takes 60–90 seconds, so keep a bounded headroom below the platform limit.
export const maxDuration = 180;

function parseScheduledFor(value: string | null): string | undefined {
  if (value === null || value === '') return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error('Invalid scheduled_for timestamp');
  }
  return new Date(timestamp).toISOString();
}

export async function GET(request: Request): Promise<NextResponse> {
  const authResponse = verifyIngestSchedulerSecret(request);
  if (authResponse) return authResponse;

  try {
    const scheduledFor = parseScheduledFor(new URL(request.url).searchParams.get('scheduled_for'));
    const result = await runSnapshotIngest(scheduledFor, 'cloudflare_cron');
    const response = NextResponse.json({
      success: true,
      ...result,
      slotAt: new Date(result.slotMs).toISOString(),
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Turso ingest failed',
        retryable: true,
      },
      { status: 503 }
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
