/**
 * GET /api/cron/billing
 *
 * Daily billing cron job (runs at 00:30 UTC via GitHub Actions, see
 * .github/workflows/billing-cron.yml).
 *
 * Responsibilities:
 *   1. Every day: downgrade API keys for users whose NOWPayments subscription
 *      has expired (current_period_end < now() AND status = 'active') — but
 *      only if the user has no remaining active, unexpired subscription.
 *   2. Every day: cancel subscription rows stuck in 'incomplete' status for
 *      more than 24 hours (abandoned checkouts / lost IPNs).
 *   3. Every day: credit each active subscriber's monthly credit allowance to
 *      their credit wallet (idempotent per user+month — new subscribers are
 *      also immediately granted their first-cycle allowance at the webhook).
 *
 * Auth: CRON_SECRET Bearer token (see verifyCronSecret).
 * This route does NOT use createApiHandler — it's a simple cron trigger,
 * not a user-facing API.
 */

import { NextResponse } from 'next/server';

import { cleanupIncompleteSubscriptions, downgradeExpiredSubscriptions } from '@/lib/api/apiKey';
import { verifyCronSecret } from '@/lib/api/cronAuth';
import { addMonthlyCredits } from '@/lib/billing/creditWallet';
import { createLogger, normalizeError } from '@/lib/utils/logger';

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

  const results: {
    subscriptionsDowngraded: number;
    subscriptionsCleanedUp: number;
    creditsGranted?: number;
  } = { subscriptionsDowngraded: 0, subscriptionsCleanedUp: 0 };

  try {
    // 1. Daily: downgrade expired NOWPayments subscriptions
    logger.info('Billing cron: starting downgradeExpiredSubscriptions');
    const subResult = await downgradeExpiredSubscriptions();
    results.subscriptionsDowngraded = subResult.downgraded;
    logger.info('Billing cron: downgradeExpiredSubscriptions complete', {
      subscriptionsDowngraded: results.subscriptionsDowngraded,
    });

    // 2. Daily: cleanup zombie incomplete subscription rows (>24h old)
    logger.info('Billing cron: starting cleanupIncompleteSubscriptions');
    const cleanupResult = await cleanupIncompleteSubscriptions();
    results.subscriptionsCleanedUp = cleanupResult.cleanedUp;
    logger.info('Billing cron: cleanupIncompleteSubscriptions complete', {
      subscriptionsCleanedUp: results.subscriptionsCleanedUp,
    });

    // 3. Daily: credit active subscribers' monthly credit allowance. Idempotent
    //    per (user, month), so running daily is safe — this also catches
    //    subscribers whose allowance was missed at activation.
    logger.info('Billing cron: starting addMonthlyCredits');
    const creditCount = await addMonthlyCredits();
    results.creditsGranted = creditCount ?? 0;
    logger.info('Billing cron: addMonthlyCredits complete', {
      creditsGranted: results.creditsGranted,
    });

    logger.info('Billing cron complete', {
      ...results,
      utcDate: now.toISOString(),
    });

    return {
      status: 200,
      body: {
        success: true,
        data: results,
        message: `Billing cron complete: ${results.subscriptionsDowngraded} expired subs downgraded, ${results.subscriptionsCleanedUp} zombies cleaned, ${results.creditsGranted} wallets credited`,
      },
    };
  } catch (error) {
    logger.error('Billing cron failed', normalizeError(error));
    return { status: 500, body: { success: false, error: 'Billing cron failed' } };
  }
}

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const { status, body } = await runBilling();
  return NextResponse.json(body, { status });
}
