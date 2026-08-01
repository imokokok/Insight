import { type NextRequest, NextResponse } from 'next/server';

import { PLANS, isTrialActive, normalizePlan, planSatisfies, type Plan } from '@/lib/billing/plans';
import { createLogger } from '@/lib/utils/logger';

import { getDailyEndpointUsage } from '../apiKey';
import { ApiResponseBuilder } from '../response';

const logger = createLogger('plan-guard-middleware');

export interface PlanGuardOptions {
  /**
   * Minimum plan required to access this endpoint.
   *
   * - 'pro' (default): Tier 2 deep-analysis endpoints. Free users get a
   *   limited daily trial quota (dailyTrialQuota); paid plans
   *   (pro/protocol/enterprise) and active Pro trials get unlimited access.
   *
   * - 'protocol': Tier 3 protocol-level intelligence endpoints. Hard-gated:
   *   only Protocol/Enterprise plans may access. Pro users (including those
   *   in an active Pro trial) and Free users are blocked with an upgrade
   *   CTA — these are premium endpoints with no trial.
   *
   * Enforcement model: this middleware enforces access control whenever it
   * is MOUNTED on a route. Mounting IS protection — there is no separate
   * endpoint allowlist checked at runtime. Each protected route explicitly
   * opts in via `planGuard: true` (Tier 2) or
   * `planGuard: { minPlan: 'protocol' }` (Tier 3) in its middleware config.
   * See the Data Access Tier Matrix on the /api page for the documented
   * tier membership.
   */
  minPlan?: Plan;
  /**
   * Number of calls/day Free users get to a Tier 2 endpoint as a trial.
   * Default: pulled from PLANS.free.dailyTrialQuota (5). Ignored for
   * `minPlan: 'protocol'` (Tier 3 has no free trial).
   */
  dailyTrialQuota?: number;
}

interface PlanGuardContext {
  apiKeyId?: string;
  userId?: string;
  plan?: string;
  trialEndsAt?: string | null;
}

export interface PlanGuardInfo {
  trialRemaining: number;
  plan: Plan;
  /** True when the guard actually enforced access (route is protected). */
  isHighestValueEndpoint: boolean;
}

type PlanGuardResult =
  | { success: true; info: PlanGuardInfo }
  | { success: false; response: NextResponse };

/**
 * Plan-based endpoint access control.
 *
 * Two tiers of protection:
 *
 * - Tier 2 (minPlan 'pro', default): the deep-analysis value layer. Paid
 *   plans (pro/protocol/enterprise) and active Pro trials get unlimited
 *   access. Free users without a trial get a limited daily trial quota; once
 *   exhausted, returns 402 with an upgrade CTA.
 *
 * - Tier 3 (minPlan 'protocol'): protocol-level intelligence. Only
 *   Protocol/Enterprise plans pass. Pro (even during an active Pro trial)
 *   and Free are hard-blocked with a 402 upgrade CTA. No trial is offered.
 *
 * Requests that carry no API key (Bearer session requests from the app's own
 * UI) skip the guard entirely — the app UI is not gated by API plan rules.
 */
export function createPlanGuardMiddleware(
  options: PlanGuardOptions = {},
  context?: PlanGuardContext
) {
  const { minPlan = 'pro', dailyTrialQuota } = options;

  return async (request: NextRequest): Promise<PlanGuardResult> => {
    // No API key in context → Bearer session request from app UI. These skip
    // plan guard (the app's own UI shouldn't be gated by API plan rules).
    if (!context?.apiKeyId) {
      return {
        success: true,
        info: { trialRemaining: -1, plan: 'free', isHighestValueEndpoint: false },
      };
    }

    const plan = normalizePlan(context.plan);

    // ----- Tier 3: protocol-only hard gate -------------------------------
    if (minPlan === 'protocol') {
      if (planSatisfies(plan, 'protocol')) {
        return {
          success: true,
          info: { trialRemaining: -1, plan, isHighestValueEndpoint: true },
        };
      }
      // Pro (incl. active Pro trial) and Free are blocked. These endpoints
      // are premium protocol-level intelligence with no trial.
      logger.warn('Protocol plan required', {
        apiKeyId: context.apiKeyId,
        plan,
        path: request.nextUrl.pathname,
      });
      const response = NextResponse.json(
        ApiResponseBuilder.error(
          'PROTOCOL_PLAN_REQUIRED',
          `This endpoint is part of protocol-level intelligence, available on the ${PLANS.protocol.name} plan and above.`,
          {
            retryable: false,
            details: {
              minPlan: 'protocol',
              currentPlan: plan,
              upgradeUrl: '/pricing',
            },
          }
        ),
        { status: 402 }
      );
      response.headers.set('X-Plan', plan);
      response.headers.set('X-Plan-Required', 'protocol');
      return { success: false, response };
    }

    // ----- Tier 2: pro-level deep analysis -------------------------------
    // Paid plans (pro/protocol/enterprise) satisfy the 'pro' requirement.
    if (planSatisfies(plan, 'pro')) {
      return {
        success: true,
        info: { trialRemaining: -1, plan, isHighestValueEndpoint: true },
      };
    }

    // Free plan but trial is active → treat as pro for the trial window.
    if (isTrialActive(context.trialEndsAt)) {
      return {
        success: true,
        info: { trialRemaining: -1, plan: 'pro', isHighestValueEndpoint: true },
      };
    }

    // Free plan, no active trial → enforce daily trial quota.
    const pathname = request.nextUrl.pathname;
    const normalizedPath = pathname.startsWith('/api') ? pathname : `/api${pathname}`;
    const quota = dailyTrialQuota ?? PLANS.free.dailyTrialQuota;
    const usedToday = context.userId
      ? await getDailyEndpointUsage(context.userId, normalizedPath)
      : 0;

    if (usedToday >= quota) {
      logger.warn('Daily trial quota exhausted', {
        apiKeyId: context.apiKeyId,
        endpoint: normalizedPath,
        usedToday,
        quota,
      });

      const response = NextResponse.json(
        ApiResponseBuilder.error(
          'PLAN_UPGRADE_REQUIRED',
          `You've used all ${quota} daily trial calls to this endpoint. Upgrade to ${PLANS.pro.name} for unlimited access.`,
          {
            retryable: false,
            details: {
              endpoint: normalizedPath,
              usedToday,
              dailyQuota: quota,
              minPlan,
              upgradeUrl: '/pricing',
            },
          }
        ),
        { status: 402 }
      );

      response.headers.set('X-Plan', plan);
      response.headers.set('X-Plan-Trial-Remaining', '0');
      response.headers.set('X-Plan-Trial-Limit', String(quota));

      return { success: false, response };
    }

    const remaining = Math.max(0, quota - usedToday - 1);
    return {
      success: true,
      info: {
        trialRemaining: remaining,
        plan,
        isHighestValueEndpoint: true,
      },
    };
  };
}
