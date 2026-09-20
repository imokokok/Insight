import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';

/**
 * POST /api/cron/daily-report/revalidate
 *
 * GitHub Actions publishes reports directly to Supabase, outside the Next.js
 * process. Explicitly expire the archive's persistent Data Cache after that
 * write so the next visitor cannot be served the previous day's report.
 */
export async function POST(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  // expire: 0 makes the next read block for fresh data instead of serving the
  // stale value while a background revalidation runs.
  revalidateTag('daily-reports', { expire: 0 });
  revalidatePath('/reports');

  const response = NextResponse.json({ success: true, revalidated: ['daily-reports'] });
  response.headers.set('Cache-Control', 'no-store, must-revalidate');
  return response;
}
