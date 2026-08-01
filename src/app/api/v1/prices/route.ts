import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { handleGetPrice } from '@/lib/api/oracleHandlers';
import { SafeProviderSchema, SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

const V1PriceQuerySchema = z.object({
  provider: SafeProviderSchema,
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  forceRefresh: z.coerce.boolean().optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, chain, forceRefresh } = context.validated!.query!;

    return handleGetPrice(
      {
        provider: provider as OracleProvider,
        symbol,
        chain: chain as Blockchain | undefined,
        forceRefresh,
      },
      context.requestId
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
    validation: { query: V1PriceQuerySchema },
  }
);
