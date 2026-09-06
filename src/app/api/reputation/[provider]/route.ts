import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { OracleProvider } from '@/types/oracle';

const daysSchema = z.coerce.number().int().min(1).max(365).default(30);

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const providerParam = context.validated?.params?.provider;
    const provider = providerParam ? decodeURIComponent(providerParam) : '';

    const searchParams = request.nextUrl.searchParams;
    const trend = searchParams.get('trend');
    const days = searchParams.get('days');

    if (!provider || !Object.values(OracleProvider).includes(provider as OracleProvider)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PROVIDER',
            message: `Invalid oracle provider: ${provider}`,
          },
        },
        { status: 400 }
      );
    }

    const oracleProvider = provider as OracleProvider;

    let reputation = await reputationService.getReputation(oracleProvider);

    if (!reputation) {
      await reputationService.seedInitialReputations();
      reputation = await reputationService.getReputation(oracleProvider);
    }

    if (!reputation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `No reputation data for ${provider}. Data will be generated on the next calculation run.`,
          },
        },
        { status: 404 }
      );
    }

    if (trend === 'true') {
      const trendDaysResult = daysSchema.safeParse(days ?? undefined);
      if (!trendDaysResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_DAYS',
              message: 'Invalid days parameter: must be an integer between 1 and 365',
            },
          },
          { status: 400 }
        );
      }
      const trendData = await reputationService.getReputationTrend(
        oracleProvider,
        trendDaysResult.data
      );

      return NextResponse.json({
        success: true,
        data: {
          ...reputation,
          trend: trendData,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: reputation,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
  }
);
