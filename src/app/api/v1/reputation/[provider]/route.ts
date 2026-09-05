import { type NextRequest, NextResponse } from 'next/server';

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
import { validateQuerySchema } from '@/lib/validation';
import { OracleProvider } from '@/types/oracle';

const ReputationQuerySchema = z.object({
  trend: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === 'true' || val === true)
    .optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const VALID_PROVIDERS = Object.values(OracleProvider) as string[];

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const validation = await validateQuerySchema(ReputationQuerySchema)(request);
    if (!validation.success) {
      return validation.response!;
    }

    const rawProvider = context.validated?.params?.provider;
    const provider = decodeURIComponent(rawProvider ?? '');

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', `Invalid oracle provider: ${provider}`, {
          requestId: context.requestId,
        }),
        { status: 400 }
      );
    }

    const reputation = await reputationService.getReputation(provider as OracleProvider);

    if (!reputation) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', `Reputation data not found for ${provider}`, {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    const { trend, days } = validation.data!.query! as { trend?: boolean; days: number };
    const data: Record<string, unknown> = { reputation };

    if (trend) {
      // All credit-backed API keys receive the same 90-day history window.
      // Session (UI) requests are already bounded by the request schema.
      let trendDays = days;
      const apiKeyPlan = context.auth?.apiKey?.plan;
      if (apiKeyPlan) {
        const maxDays = maxTrendDays(normalizePlan(apiKeyPlan));
        if (trendDays > maxDays) trendDays = maxDays;
      }
      data.trend = await reputationService.getReputationTrend(
        provider as OracleProvider,
        trendDays
      );
    }

    return createCachedJsonResponse(
      ApiResponseBuilder.success(data, { requestId: context.requestId }),
      { preset: 'shortLived' }
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
  }
);
