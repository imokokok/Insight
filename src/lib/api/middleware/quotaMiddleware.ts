import { type NextRequest, NextResponse } from 'next/server';

import { applyCreditBillingHeaders } from '@/lib/billing/billingHeaders';
import { makeMeteringKey, precheckCredits } from '@/lib/billing/creditWallet';
import {
  BATCH_UNIT_CREDITS,
  CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS,
  getRestBillableItems,
  REST_BATCH_METERED_PATHS,
} from '@/lib/billing/metering';
import { PLANS, normalizePlan } from '@/lib/billing/plans';
import { getEndpointCreditCost } from '@/lib/billing/productPricing';
import { createLogger } from '@/lib/utils/logger';

import { ApiResponseBuilder } from '../response';

const logger = createLogger('quota-middleware');

export interface QuotaMiddlewareOptions {
  /** When false, skip quota enforcement entirely (default: true). */
  enabled?: boolean;
}

interface QuotaContext {
  requestId?: string;
  apiKeyId?: string;
  userId?: string;
  plan?: string;
  /** Deterministic ledger key for this logical request (see requestIdempotency). */
  idempotencyMeteringKey?: string;
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
  /** Unit (per-item) price, for batch endpoints where cost = unit × items. */
  creditUnitCost?: number;
  /** Number of billable items in this request (1 outside batch endpoints). */
  billableItems?: number;
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
 * Every API-key request is priced by getEndpointCreditCost(path) — a per-call
 * metering class, or the full product price for a product-purchase endpoint —
 * and must clear a credit-wallet precheck before the handler runs; the
 * authoritative charge is consumed via consumeCredits only after a 2xx
 * response, and its result is written into the synchronous X-Credit-* receipt.
 *
 * There is no recurring free tier and no plan-based feature gating: "can this
 * call proceed?" is answered solely by the wallet balance covering the credit
 * cost. The only free credits are the one-time 400-credit signup grant (a
 * wallet top-up from POST /api/billing/signup-grant; it never resets). The
 * only bypass is Enterprise (unlimited), which skips metering.
 *
 * Runs in sequence with rateLimitMiddleware — a request must pass rate limit
 * AND credit precheck to succeed.
 */
export function createQuotaMiddleware(
  options: QuotaMiddlewareOptions = {},
  context?: QuotaContext
) {
  const { enabled = true } = options;

  /** Batch endpoints bill per requested item; everything else is one item. */
  const resolveBillableItems = async (request: NextRequest): Promise<number> => {
    const path = request.nextUrl.pathname;
    if (!REST_BATCH_METERED_PATHS.has(path) || request.method !== 'POST') return 1;
    try {
      return getRestBillableItems(path, await request.clone().json());
    } catch {
      // Let the handler produce its 400; a malformed body is never billed.
      return 1;
    }
  };

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

    // ----- Credit-metered cost (per-call class or one-call product price) --
    // Batch endpoints are priced per item at the C1 rate (2 credits); the
    // handler later settles only the items that actually succeeded.
    const unitCost = REST_BATCH_METERED_PATHS.has(request.nextUrl.pathname)
      ? BATCH_UNIT_CREDITS
      : getEndpointCreditCost(request.nextUrl.pathname);
    const billableItems = await resolveBillableItems(request);
    const cost = unitCost * billableItems;
    const precheck = await precheckCredits(context.apiKeyId, cost);

    if (!precheck.ok) {
      const reason = precheck.reason ?? 'INSUFFICIENT_CREDITS';
      logger.warn('Credit precheck rejected request', {
        apiKeyId: context.apiKeyId,
        plan,
        path: request.nextUrl.pathname,
        cost,
        billableItems,
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

      response.headers.set('X-Credit-Denied', reason);
      response.headers.set('Retry-After', String(CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS));
      applyCreditBillingHeaders(response.headers, {
        costCredits: cost,
        balance: precheck.balance ?? 0,
        balanceAfter: precheck.balance ?? 0,
        status: 'not_charged',
      });

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
        creditUnitCost: unitCost,
        billableItems,
        pendingCharge: {
          apiKeyId: context.apiKeyId,
          meteringKey:
            context.idempotencyMeteringKey ??
            (context.requestId
              ? `rest:${context.apiKeyId}:${context.requestId}`
              : makeMeteringKey(`rest:${context.apiKeyId}`)),
          cost,
        },
      },
    };
  };
}
