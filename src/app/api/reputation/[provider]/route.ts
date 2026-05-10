import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { OracleProvider } from '@/types/oracle';

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const pathSegments = request.nextUrl.pathname.split('/');
    const providerSegment = pathSegments[pathSegments.length - 1];
    const provider = decodeURIComponent(providerSegment);

    const searchParams = request.nextUrl.searchParams;
    const trend = searchParams.get('trend');
    const days = searchParams.get('days');

    if (!Object.values(OracleProvider).includes(provider as OracleProvider)) {
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
      const trendDays = days ? parseInt(days, 10) : 30;
      const trendData = await reputationService.getReputationTrend(oracleProvider, trendDays);

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
    },
  }
);
