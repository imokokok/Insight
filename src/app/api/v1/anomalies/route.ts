import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { aggregateAnomalies } from '@/lib/reports/anomalyAggregation';

const AnomaliesQuerySchema = z.object({
  days: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 30, 'days must be between 1 and 30')
    .optional()
    .default(7),
});

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const days = context.validated!.query!.days;
    const aggregation = await aggregateAnomalies({ days });

    if (aggregation.reports.length === 0) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', 'No reports available for the requested period', {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    const topEvents = aggregation.allEvents
      .sort((a, b) => Math.abs(Number(b.deviationPct)) - Math.abs(Number(a.deviationPct)))
      .slice(0, 50);

    const topImpacts = aggregation.allImpacts
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[String(a.severity)] ?? 999) - (SEVERITY_ORDER[String(b.severity)] ?? 999)
      )
      .slice(0, 20);

    const data = {
      periodDays: aggregation.periodDays,
      dateRange: aggregation.dateRange,
      totalEvents: aggregation.totalEvents,
      bySeverity: aggregation.bySeverity,
      byProvider: aggregation.byProvider,
      byAsset: aggregation.byAsset,
      topEvents,
      topRiskImpacts: topImpacts,
      reports: aggregation.reports,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(data, { requestId: context.requestId }),
      { preset: 'shortLived' }
    );
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: AnomaliesQuerySchema },
  }
);
