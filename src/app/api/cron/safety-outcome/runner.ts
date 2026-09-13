import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { backfillOutcomes } from '@/lib/api/services/safetyOutcomeService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CronSafetyOutcome');

/** Structured result returned by `runSafetyOutcomeBackfill` for both the HTTP route and the GH Actions script. */
export interface SafetyOutcomeResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Backfills outcome labels for pre-trade safety checks whose evaluation window
 * has elapsed. Each run labels a bounded batch of the oldest unlabeled checks
 * against hourly_price_snapshots, turning flywheel rows into labeled training
 * examples.
 *
 * Extracted from the GET handler so the same logic runs from both the Vercel
 * route AND the GitHub Actions `scripts/safety-outcome.ts` job. The GH Actions
 * job escapes Vercel's 60s serverless timeout — the backfill joins against
 * hourly_price_snapshots and can exceed the ceiling during cold-start DB
 * connection latency.
 *
 * @returns `{ status, body }` — the HTTP route wraps this in NextResponse;
 *          the script reads `status` to decide its exit code.
 */
export async function runSafetyOutcomeBackfill(): Promise<SafetyOutcomeResult> {
  try {
    const requestStart = Date.now();
    const summary = await backfillOutcomes();
    logger.info('Safety outcome backfill completed', {
      ...summary,
      durationMs: Date.now() - requestStart,
    });
    return { status: 200, body: { success: true, summary } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Safety outcome backfill failed',
      error instanceof Error ? error : new Error(message)
    );
    return { status: 500, body: { success: false, error: message } };
  }
}

/**
 * GET /api/cron/safety-outcome
 *
 * Backfills outcome labels for pre-trade safety checks whose evaluation window
 * has elapsed. Triggered every 2h by GitHub Actions (safety-outcome-cron.yml).
 *
 * Auth: CRON_SECRET Bearer token (see verifyCronSecret).
 * This route does NOT use createApiHandler — it's a simple cron trigger,
 * not a user-facing API.
 */
export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const { status, body } = await runSafetyOutcomeBackfill();
  return NextResponse.json(body, { status });
}
