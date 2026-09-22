import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { listOracleFeeds } from '@/lib/oracles/services/feedListingService';
import {
  SafeBooleanQuerySchema,
  SafeProviderSchema,
  SafeSymbolSchema,
} from '@/lib/security/validation';

const FeedsQuerySchema = z.object({
  provider: SafeProviderSchema.optional(),
  symbol: SafeSymbolSchema.optional(),
  category: z.enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst']).optional(),
  chain_id: z.coerce.number().int().optional(),
  is_active: SafeBooleanQuerySchema.optional().default(true),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, category, chain_id, is_active, limit, offset } =
      context.validated!.query!;

    const { feeds, total } = await listOracleFeeds({
      provider,
      symbol,
      category,
      chainId: chain_id,
      isActive: is_active,
      limit,
      offset,
    });

    return createCachedJsonResponse(
      ApiResponseBuilder.success({ feeds, meta: { total } }, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
    validation: { query: FeedsQuerySchema },
  }
);
