/**
 * GET /api/cron/billing
 *
 * Daily billing cron job (runs at 00:30 UTC via GitHub Actions, see
 * .github/workflows/billing-cron.yml).
 *
 * Responsibilities:
 *   1. Every day: downgrade API keys whose 7-day Pro trial has expired back
 *      to free (trial_ends_at < now() AND plan = 'pro').
 *   2. Every day: downgrade API keys for users whose NOWPayments subscription
 *      has expired (current_period_end < now() AND status = 'active') — but
 *      only if the user has no remaining active, unexpired subscription.
 *   3. Every day: cancel subscription rows stuck in 'incomplete' status for
 *      more than 24 hours (abandoned checkouts / lost IPNs).
 *   4. On the 1st of each month: reset monthly_quota_used to 0 for all
 *      non-enterprise keys and advance quota_reset_at by one month.
 *
 * Auth: CRON_SECRET Bearer token (see verifyCronSecret).
 * This route does NOT use createApiHandler — it's a simple cron trigger,
 * not a user-facing API.
 */

import { NextResponse } from 'next/server';

import {
  cleanupIncompleteSubscriptions,
  downgradeExpiredSubscriptions,
  downgradeExpiredTrials,
  resetMonthlyQuota,
} from '@/lib/api/apiKey';
import { verifyCronSecret } from '@/lib/api/cronAuth';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CronBilling');

/** Structured result returned by `runBilling` for both the HTTP route and the GH Actions script. */
export interface BillingResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Core billing pipeline, extracted from the GET handler so the same logic
 * runs from the Vercel route AND the GitHub Actions `scripts/billing.ts`
 * job. The GH Actions job escapes Vercel's 60s timeout — billing touches
 * every API key row and previously got truncated mid-run on Vercel during
 * cold-start DB connection latency.
 *
 * @returns `{ status, body }` — the HTTP route wraps this in NextResponse;
 *          the script reads `status` to decide its exit code.
 */
export async function runBilling(): Promise<BillingResult> {
  const now = new Date();
  const isMonthStart = now.getUTCDate() === 1;

  const results: {
    trialsDowngraded: number;
    subscriptionsDowngraded: number;
    subscriptionsCleanedUp: number;
    quotaReset?: number;
  } = { trialsDowngraded: 0, subscriptionsDowngraded: 0, subscriptionsCleanedUp: 0 };

  try {
    // 1. Daily: downgrade expired trial keys
    logger.info('Billing cron: starting downgradeExpiredTrials');
    const trialResult = await downgradeExpiredTrials();
    results.trialsDowngraded = trialResult.downgraded;
    logger.info('Billing cron: downgradeExpiredTrials complete', {
      trialsDowngraded: results.trialsDowngraded,
    });

    // 2. Daily: downgrade expired NOWPayments subscriptions
    logger.info('Billing cron: starting downgradeExpiredSubscriptions');
    const subResult = await downgradeExpiredSubscriptions();
    results.subscriptionsDowngraded = subResult.downgraded;
    logger.info('Billing cron: downgradeExpiredSubscriptions complete', {
      subscriptionsDowngraded: results.subscriptionsDowngraded,
    });

    // 3. Daily: cleanup zombie incomplete subscription rows (>24h old)
    logger.info('Billing cron: starting cleanupIncompleteSubscriptions');
    const cleanupResult = await cleanupIncompleteSubscriptions();
    results.subscriptionsCleanedUp = cleanupResult.cleanedUp;
    logger.info('Billing cron: cleanupIncompleteSubscriptions complete', {
      subscriptionsCleanedUp: results.subscriptionsCleanedUp,
    });

    // 4. Monthly (1st of month): reset quota counters
    if (isMonthStart) {
      logger.info('Billing cron: starting resetMonthlyQuota');
      const quotaResult = await resetMonthlyQuota();
      results.quotaReset = quotaResult.reset;
      logger.info('Billing cron: resetMonthlyQuota complete', {
        quotaReset: results.quotaReset,
      });
    }

    logger.info('Billing cron complete', {
      ...results,
      isMonthStart,
      utcDate: now.toISOString(),
    });

    return {
      status: 200,
      body: {
        success: true,
        data: results,
        message: `Billing cron complete: ${results.trialsDowngraded} trials, ${results.subscriptionsDowngraded} expired subs, ${results.subscriptionsCleanedUp} zombies cleaned${
          results.quotaReset !== undefined ? `, ${results.quotaReset} keys quota reset` : ''
        }`,
      },
    };
  } catch (error) {
    logger.error('Billing cron failed', error instanceof Error ? error : new Error(String(error)));
    return { status: 500, body: { success: false, error: 'Billing cron failed' } };
  }
}

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const { status, body } = await runBilling();
  return NextResponse.json(body, { status });
}
