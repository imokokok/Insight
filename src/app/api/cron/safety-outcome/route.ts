import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { backfillOutcomes } from '@/lib/api/services/safetyOutcomeService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CronSafetyOutcome');

/**
 * Backfills outcome labels for pre-trade safety checks whose evaluation window
 * has elapsed. Triggered every 2h by GitHub Actions (safety-outcome-cron.yml).
 *
 * Each run labels a bounded batch of the oldest unlabeled checks against
 * hourly_price_snapshots, turning flywheel rows into labeled training examples.
 */
export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  try {
    const requestStart = Date.now();
    const summary = await backfillOutcomes();
    logger.info('Safety outcome backfill completed', {
      ...summary,
      durationMs: Date.now() - requestStart,
    });
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Safety outcome backfill failed',
      error instanceof Error ? error : new Error(message)
    );
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
