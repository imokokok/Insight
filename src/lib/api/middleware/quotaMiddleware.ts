import { type NextRequest, NextResponse } from 'next/server';

import { consumeCredits, makeMeteringKey, precheckCredits } from '@/lib/billing/creditWallet';
import { getCreditCost } from '@/lib/billing/metering';
import { PLANS, normalizePlan } from '@/lib/billing/plans';
import { createLogger } from '@/lib/utils/logger';

import { incrementApiKeyQuota } from '../apiKey';
import { ApiResponseBuilder } from '../response';

const logger = createLogger('quota-middleware');

export interface QuotaMiddlewareOptions {
  /** When false, skip quota enforcement entirely (default: true). */
  enabled?: boolean;
}

interface QuotaContext {
  apiKeyId?: string;
  userId?: string;
  plan?: string;
  monthlyQuotaUsed?: number;
  quotaResetAt?: string;
}

export interface QuotaInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  used: number;
  /** Present for paid (credit-metered) keys: balance left after this call and
   *  the per-call credit cost. Surfaced by the handler as X-Credit-* headers. */
  creditBalance?: number;
  creditCost?: number;
}

type QuotaMiddlewareResult =
  | { success: true; quotaInfo: QuotaInfo }
  | { success: false; response: NextResponse };

/**
 * Quota / credit middleware:
 *
 *   - PAID plans (pro / protocol): per-call CREDIT metering. Each request is
 *     priced by getCreditCost(path). The wallet precheck short-circuits a
 *     request whose balance (or per-key monthly budget) is exhausted, and the
 *     authoritative charge is consumed fire-and-forget via consumeCredits.
 *
 *   - FREE plan: legacy monthly-quota counter (monthly_quota_used). Unchanged.
 *     Tier 2/3 deep endpoints for Free users are gated separately by the
 *     planGuard middleware's daily trial quota.
 *
 * Both run in sequence with rateLimitMiddleware — a request must pass rate
 * limit AND quota/credit to succeed.
 */
export function createQuotaMiddleware(
  options: QuotaMiddlewareOptions = {},
  context?: QuotaContext
) {
  const { enabled = true } = options;

  return async (request: NextRequest): Promise<QuotaMiddlewareResult> => {
    if (!enabled) {
      return {
        success: true,
        quotaInfo: { limit: -1, remaining: -1, resetAt: '', used: 0 },
      };
    }

    // No API key in context → Bearer (user session) request from the app's own
    // UI, which skips API-style quota/credit. Rate limiting still applies.
    if (!context?.apiKeyId) {
      return {
        success: true,
        quotaInfo: { limit: -1, remaining: -1, resetAt: '', used: 0 },
      };
    }

    const plan = normalizePlan(context.plan);
    const planConfig = PLANS[plan];
    const limit = planConfig.monthlyQuota;

    // Enterprise / unlimited plans skip quota enforcement entirely.
    if (limit < 0) {
      return {
        success: true,
        quotaInfo: { limit: -1, remaining: -1, resetAt: '', used: 0 },
      };
    }

    // ----- Paid plans: credit-metered, per-call cost -----------------------
    if (plan !== 'free') {
      const cost = getCreditCost(request.nextUrl.pathname);
      const precheck = await precheckCredits(context.apiKeyId, cost);

      if (!precheck.ok) {
        const reason = precheck.reason ?? 'INSUFFICIENT_CREDITS';
        logger.warn('Credit precheck rejected request', {
          apiKeyId: context.apiKeyId,
          plan,
          path: request.nextUrl.pathname,
          cost,
          reason,
        });

        const upgradeUrl = reason === 'BUDGET_EXCEEDED' ? '/settings?tab=billing' : '/api#pricing';
        const detailText =
          reason === 'BUDGET_EXCEEDED'
            ? `This key's monthly credit budget is exhausted (${precheck.used ?? 0}/${precheck.budget ?? 0} credits).`
            : `You need ${cost} credit${cost === 1 ? '' : 's'} for this endpoint, but your balance is ${precheck.balance ?? 0}.`;

        const response = NextResponse.json(
          ApiResponseBuilder.error('CREDIT_EXHAUSTED', detailText, {
            retryable: false,
            details: {
              reason,
              cost,
              balance: precheck.balance,
              budget: precheck.budget,
              used: precheck.used,
              plan,
              topupUrl: '/api#pricing',
              upgradeUrl,
            },
          }),
          { status: 402 }
        );

        response.headers.set('X-Credit-Cost', String(cost));
        response.headers.set('X-Credit-Balance', String(precheck.balance ?? 0));
        response.headers.set('X-Credit-Denied', reason);

        return { success: false, response };
      }

      // Charge fire-and-forget. The RPC re-checks balance/budget atomically and
      // is idempotent, so a transient overdraw cannot double-charge or spiral.
      const meteringKey = makeMeteringKey(`rest:${context.apiKeyId}`);
      consumeCredits(context.apiKeyId, cost, meteringKey, request.nextUrl.pathname).catch((err) => {
        logger.warn('Async credit consume failed', {
          apiKeyId: context.apiKeyId,
          cost,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return {
        success: true,
        quotaInfo: {
          limit: -1,
          remaining: -1,
          resetAt: '',
          used: 0,
          creditBalance: precheck.balance,
          creditCost: cost,
        },
      };
    }

    // ----- Free plan: legacy monthly quota counter -------------------------
    const used = context.monthlyQuotaUsed ?? 0;
    const resetAt = context.quotaResetAt ?? new Date().toISOString();

    // If quota_reset_at is in the past, the cron hasn't run yet but we
    // shouldn't block the user. Treat as if quota just reset (lenient).
    const effectiveUsed = new Date(resetAt).getTime() < Date.now() ? 0 : used;

    if (effectiveUsed >= limit) {
      logger.warn('Monthly quota exceeded', {
        apiKeyId: context.apiKeyId,
        plan,
        used: effectiveUsed,
        limit,
      });

      const response = NextResponse.json(
        ApiResponseBuilder.error(
          'QUOTA_EXCEEDED',
          `Monthly quota of ${limit.toLocaleString()} requests exceeded for the ${planConfig.name} plan.`,
          {
            retryable: false,
            details: {
              plan,
              used: effectiveUsed,
              limit,
              resetAt,
              upgradeUrl: '/api#pricing',
            },
          }
        ),
        { status: 402 }
      );

      response.headers.set('X-Quota-Limit', String(limit));
      response.headers.set('X-Quota-Remaining', '0');
      response.headers.set('X-Quota-Reset', String(Math.floor(new Date(resetAt).getTime() / 1000)));

      return { success: false, response };
    }

    // Increment the quota counter asynchronously. Fire-and-forget so the
    // request isn't blocked on a DB write. A missed increment only means the
    // user gets marginally more quota than they paid for — acceptable.
    incrementApiKeyQuota(context.apiKeyId).catch((err) => {
      logger.warn('Async quota increment failed', {
        apiKeyId: context.apiKeyId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return {
      success: true,
      quotaInfo: {
        limit,
        remaining: Math.max(0, limit - effectiveUsed - 1),
        resetAt,
        used: effectiveUsed,
      },
    };
  };
}
