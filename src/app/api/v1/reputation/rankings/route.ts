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
import { reputationService } from '@/lib/oracles/services/reputationService';
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

    // Tier the historical trend window by plan for API-key requests: Free 7d,
    // Pro 30d, Protocol/Enterprise 90d. Session (UI) requests are left
    // unclamped — the UI governs its own display and bypasses API-plan gating.
    const apiKeyPlan = context.auth?.apiKey?.plan;
    if (apiKeyPlan) {
      const maxDays = maxTrendDays(normalizePlan(apiKeyPlan));
      if (days > maxDays) days = maxDays;
    }

    // Get current reputations (already sorted by score)
    const currentReputations = await reputationService.getReputations();

    if (currentReputations.length === 0) {
      await reputationService.seedInitialReputations();
    }

    // Build current ranking
    const currentRanking = currentReputations
      .sort((a, b) => b.overall_score - a.overall_score)
      .map((rep, index) => ({
        rank: index + 1,
        provider: rep.provider,
        overallScore: rep.overall_score,
        accuracyScore: rep.accuracy_score,
        uptimePercentage: rep.uptime_percentage,
        reliabilityScore: rep.reliability_score,
        freshnessScore: rep.freshness_score,
        avgLatencyMs: rep.avg_latency_ms,
        avgDeviationPct: rep.avg_deviation_pct,
      }));

    // Get historical trend for each provider to compute rank changes
    const rankChanges = await Promise.all(
      currentRanking.map(async (entry) => {
        let previousRank: number | null = null;
        let change: number | null = null;

        try {
          const trend = await reputationService.getReputationTrend(
            entry.provider as Parameters<typeof reputationService.getReputationTrend>[0],
            days
          );

          if (trend.length >= 2) {
            // Find the earliest snapshot's rank
            const earliestSnapshot = trend[trend.length - 1];
            if (earliestSnapshot) {
              // Compare earliest score against all providers' earliest scores
              const allEarliestScores = await Promise.all(
                currentReputations.map(async (rep) => {
                  const t = await reputationService.getReputationTrend(
                    rep.provider as Parameters<typeof reputationService.getReputationTrend>[0],
                    days
                  );
                  return {
                    provider: rep.provider,
                    score: t.length > 0 ? t[t.length - 1].success_rate * 100 : rep.overall_score,
                  };
                })
              );

              allEarliestScores.sort((a, b) => b.score - a.score);
              previousRank = allEarliestScores.findIndex((e) => e.provider === entry.provider) + 1;

              if (previousRank > 0) {
                change = previousRank - entry.rank; // positive = improved, negative = declined
              }
            }
          }
        } catch {
          // Skip trend calculation errors
        }

        return {
          ...entry,
          previousRank,
          rankChange: change,
          trend:
            change !== null ? (change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged') : 'no_data',
        };
      })
    );

    // Score distribution
    const scores = currentRanking.map((r) => r.overallScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    const payload = {
      period: `${days}d`,
      generatedAt: new Date().toISOString(),
      totalProviders: currentRanking.length,
      scoreDistribution: {
        average: roundTo(avgScore, 1),
        max: roundTo(maxScore, 1),
        min: roundTo(minScore, 1),
      },
      rankings: rankChanges,
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
