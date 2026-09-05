import { type NextRequest, NextResponse } from 'next/server';

import { makeMeteringKey, precheckCredits } from '@/lib/billing/creditWallet';
import { CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS, getCreditCost } from '@/lib/billing/metering';
import { PLANS, normalizePlan } from '@/lib/billing/plans';
import { createLogger } from '@/lib/utils/logger';

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
}

export interface QuotaInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  used: number;
  /** For credit-metered keys: balance left after this call and the per-call
   *  credit cost. Surfaced by the handler as X-Credit-* headers. */
  creditBalance?: number;
  creditCost?: number;
  /** The charge to commit AFTER the handler succeeds. The handler fires
   *  consumeCredits only on a 2xx response, so a request that fails in the
   *  handler is not metered. */
  pendingCharge?: { apiKeyId: string; meteringKey: string; cost: number };
}

type QuotaMiddlewareResult =
  | { success: true; quotaInfo: QuotaInfo }
  | { success: false; response: NextResponse };

/**
 * Quota / credit middleware — the single gate on API access.
 *
 * Every API-key request is priced by getCreditCost(path) and must clear a
 * credit-wallet precheck before the handler runs; the authoritative charge is
 * consumed fire-and-forget via consumeCredits only after a 2xx response.
 *
 * There is no recurring free tier and no plan-based feature gating: "can this
 * call proceed?" is answered solely by the wallet balance covering the credit
 * cost. The only free credits are the one-time 100-credit signup trial grant
 * (a wallet top-up, see POST /api/billing/signup-grant). The only bypass is
 * Enterprise (unlimited), which skips metering.
 *
 * Runs in sequence with rateLimitMiddleware — a request must pass rate limit
 * AND credit precheck to succeed.
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

    // Enterprise / unlimited plans skip quota enforcement entirely.
    if (planConfig.monthlyQuota < 0) {
      return {
        success: true,
        quotaInfo: { limit: -1, remaining: -1, resetAt: '', used: 0 },
      };
    }

    // ----- Credit-metered, per-call cost --------------------------------
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

      const upgradeUrl = reason === 'BUDGET_EXCEEDED' ? '/settings?tab=billing' : '/pricing';
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
            topupUrl: '/pricing',
            upgradeUrl,
          },
        }),
        { status: 402 }
      );

      response.headers.set('X-Credit-Cost', String(cost));
      response.headers.set('X-Credit-Balance', String(precheck.balance ?? 0));
      response.headers.set('X-Credit-Denied', reason);
      response.headers.set('Retry-After', String(CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS));

      return { success: false, response };
    }

    // Do NOT charge here — commit only after the handler succeeds (2xx).
    // Charging up-front would bill handler 4xx/5xx failures. The charge is
    // attached to quotaInfo and fired by the handler; the RPC re-checks
    // balance/budget atomically and is idempotent, so a transient overdraw
    // cannot double-charge or spiral.
    return {
      success: true,
      quotaInfo: {
        limit: -1,
        remaining: -1,
        resetAt: '',
        used: 0,
        creditBalance: precheck.balance,
        creditCost: cost,
        pendingCharge: {
          apiKeyId: context.apiKeyId,
          meteringKey: makeMeteringKey(`rest:${context.apiKeyId}`),
          cost,
        },
      },
    };
  };
}
