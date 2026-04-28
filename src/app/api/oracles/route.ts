import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { handleGetPrice, handleGetHistoricalPrices } from '@/lib/api/oracleHandlers';
import { PriceQueryRequestSchema, HistoricalPriceRequestSchema } from '@/lib/security/validation';
import { validateQuerySchema } from '@/lib/validation';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const periodNum = period ? parseInt(period, 10) : undefined;

    if (period && (isNaN(periodNum!) || periodNum! <= 0 || !Number.isInteger(periodNum!))) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PERIOD', message: 'Period must be a positive integer' },
        },
        { status: 400 }
      );
    }

    const schema = periodNum ? HistoricalPriceRequestSchema : PriceQueryRequestSchema;
    const validation = await validateQuerySchema(schema)(request);

    if (!validation.success) {
      return validation.response!;
    }

    const { provider, symbol, chain } = validation.data!.query!;

    if (periodNum) {
      return handleGetHistoricalPrices({
        provider: provider as OracleProvider,
        symbol: symbol!,
        chain: chain as Blockchain | undefined,
        period: periodNum,
      });
    }

    return handleGetPrice({
      provider: provider as OracleProvider,
      symbol: symbol!,
      chain: chain as Blockchain | undefined,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
    },
  }
);
