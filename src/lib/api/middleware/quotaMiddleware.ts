import { type NextRequest, NextResponse } from 'next/server';

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
}

type QuotaMiddlewareResult =
  | { success: true; quotaInfo: QuotaInfo }
  | { success: false; response: NextResponse };

/**
 * Monthly quota middleware: enforces the per-month call cap that defines the
 * Flat Tier pricing model (Free 1K, Pro 10K, Protocol 100K, Enterprise ∞).
 *
 * Distinct from rateLimitMiddleware (which enforces per-minute caps). Both
 * run in sequence — a request must pass both the rate limit AND the monthly
 * quota to succeed.
 *
 * The quota counter (monthly_quota_used) is read from the cached
 * ApiKeyValidationResult that authMiddleware already populated, so there is
 * no extra DB hit on the hot path. The increment happens async after the
 * response is sent (fire-and-forget, same pattern as logApiKeyUsage).
 */
export function createQuotaMiddleware(
  options: QuotaMiddlewareOptions = {},
  context?: QuotaContext
) {
  const { enabled = true } = options;

  return async (_request: NextRequest): Promise<QuotaMiddlewareResult> => {
    if (!enabled) {
      return {
        success: true,
        quotaInfo: { limit: -1, remaining: -1, resetAt: '', used: 0 },
      };
    }

    // No API key in context → no quota to enforce. This happens for Bearer
    // (user session) requests originating from the app's own UI, which skip
    // API-style quota. Rate limiting still applies.
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
