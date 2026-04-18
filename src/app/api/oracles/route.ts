import { type NextRequest } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import {
  handleGetPrice,
  handleGetHistoricalPrices,
  handleBatchPrices,
} from '@/lib/api/oracleHandlers';
import {
  PriceQueryRequestSchema,
  BatchPriceRequestSchema,
  HistoricalPriceRequestSchema,
  type BatchPriceRequestType,
} from '@/lib/security/validation';
import { validateQuerySchema, validateBodySchema } from '@/lib/validation';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const periodNum = period ? parseInt(period, 10) : undefined;

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
