import { type NextRequest } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, V1_STANDARD_MIDDLEWARES } from '@/lib/api/handler';
import { handleGetHistoricalPrices } from '@/lib/api/oracleHandlers';
import { SafeProviderSchema, SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

const SafePeriodSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
  .refine(
    (val) => !isNaN(val) && val >= 1 && val <= 8760,
    'Period must be between 1 and 8760 hours (1 year)'
  );

const V1HistoryQuerySchema = z.object({
  provider: SafeProviderSchema,
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  period: SafePeriodSchema,
  forceRefresh: z.coerce.boolean().optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, chain, period, forceRefresh } = context.validated!.query!;

    return handleGetHistoricalPrices(
      {
        provider: provider as OracleProvider,
        symbol,
        chain: chain as Blockchain | undefined,
        period,
        forceRefresh,
      },
      context.requestId
    );
  },
  {
    // Tier 2 deep-analysis endpoint
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: V1HistoryQuerySchema },
  }
);
