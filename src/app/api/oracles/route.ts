import { type NextRequest } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import {
  handleGetPrice,
  handleGetHistoricalPrices,
  handleBatchPrices,
} from '@/lib/api/oracleHandlers';
import {
  validateQuerySchema,
  validateBodySchema,
  type BatchPriceRequestType,
} from '@/lib/validation';
import {
  PriceQueryRequestSchema,
  BatchPriceRequestSchema,
  HistoricalPriceRequestSchema,
} from '@/lib/validation/schemas';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const validation = await validateQuerySchema(PriceQueryRequestSchema)(request);

    if (!validation.success) {
      return validation.response!;
    }

    const { provider, symbol, chain } = validation.data!.query!;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');

    const periodNum = period ? parseInt(period, 10) : undefined;

    if (periodNum) {
      const historicalValidation = await validateQuerySchema(HistoricalPriceRequestSchema)(request);

      if (!historicalValidation.success) {
        return historicalValidation.response!;
      }

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

export const POST = createApiHandler(
  async (request: NextRequest) => {
    const validation = await validateBodySchema(BatchPriceRequestSchema)(request);

    if (!validation.success) {
      return validation.response!;
    }

    const { requests } = validation.data!.body!;

    return handleBatchPrices(requests as BatchPriceRequestType['requests']);
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
    },
  }
);
