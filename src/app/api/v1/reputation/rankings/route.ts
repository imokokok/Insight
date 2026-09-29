import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { maxTrendDays, normalizePlan } from '@/lib/billing/plans';
import { getReputationRankings } from '@/lib/oracles/services/reputationRankings';
import { roundTo } from '@/lib/utils/format';

const RankingsQuerySchema = z.object({
  days: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 90, 'days must be between 1 and 90')
    .optional()
    .default(7),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    let days = context.validated!.query!.days;

    // All credit-backed API keys receive the same 90-day history window; the
    // helper remains centralized so the public contract has one source of truth.
    // Session (UI) requests are already bounded by the request schema.
    const apiKeyPlan = context.auth?.apiKey?.plan;
    if (apiKeyPlan) {
      const maxDays = maxTrendDays(normalizePlan(apiKeyPlan));
      if (days > maxDays) days = maxDays;
    }

    const rankings = await getReputationRankings(days);

    // Score distribution
    const scores = rankings.map((r) => r.overallScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    const payload = {
      period: `${days}d`,
      generatedAt: new Date().toISOString(),
      totalProviders: rankings.length,
      scoreDistribution: {
        average: roundTo(avgScore, 1),
        max: roundTo(maxScore, 1),
        min: roundTo(minScore, 1),
      },
      rankings,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
    validation: { query: RankingsQuerySchema },
  }
);
