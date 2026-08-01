import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { collectSnapshot, SnapshotCollectionError } from '@/lib/reports/snapshotCollector';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DailyReportSnapshot');

/**
 * Price-snapshot cron (manual fallback).
 *
 * The collection logic lives in `src/lib/reports/snapshotCollector.ts` so the
 * same pipeline runs from this Vercel route AND the GitHub Actions
 * `scripts/collect-snapshot.ts` job (which escapes Vercel's 60s timeout and
 * additionally writes the fine-grained `price_snapshots` table at 15-min
 * cadence). This route is retained as an HTTP fallback (manual trigger via
 * `workflow_dispatch`); scheduled 15-min collection has moved to GH Actions
 * (`snapshot-collect.yml`).
 */
export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  try {
    const result = await collectSnapshot();
    return NextResponse.json({
      success: true,
      snapshotDate: result.snapshotDate,
      inserted: result.insertedHourly,
    });
  } catch (error) {
    if (error instanceof SnapshotCollectionError) {
      // Pipeline failed at a known stage (e.g. hourly upsert). Preserves the
      // previous `{ stage: 'upsert_snapshots' }` response shape.
      return NextResponse.json(
        { success: false, stage: error.stage, error: error.message },
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Daily report snapshot failed',
      error instanceof Error ? error : new Error(message)
    );
    return NextResponse.json({ success: false, stage: 'unknown', error: message }, { status: 500 });
  }
}
