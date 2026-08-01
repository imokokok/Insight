import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { getAdminQueries } from '@/lib/supabase/server';

const FeedsQuerySchema = z.object({
  provider: SafeProviderSchema.optional(),
  symbol: SafeSymbolSchema.optional(),
  category: z.enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst']).optional(),
  chain_id: z.coerce.number().int().optional(),
  is_active: z.coerce.boolean().optional().default(true),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, category, chain_id, is_active, limit, offset } =
      context.validated!.query!;

    const queries = getAdminQueries();
    const allFeeds = await queries.getOracleFeeds('');

    let filtered = allFeeds;

    if (provider) {
      filtered = filtered.filter((f) => f.provider === provider);
    }
    if (symbol) {
      filtered = filtered.filter((f) => f.symbol === symbol);
    }
    if (category) {
      filtered = filtered.filter((f) => f.category === category);
    }
    if (chain_id !== undefined) {
      filtered = filtered.filter((f) => f.chain_id === chain_id);
    }
    if (is_active !== undefined) {
      filtered = filtered.filter((f) => f.is_active === is_active);
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    const feeds = paged.map((f) => ({
      id: f.id,
      provider: f.provider,
      symbol: f.symbol,
      chain_id: f.chain_id,
      address: f.address,
      name: f.name,
      decimals: f.decimals,
      category: f.category,
      is_active: f.is_active,
      consecutive_failures: f.consecutive_failures,
      last_success_at: f.last_success_at,
      last_failure_at: f.last_failure_at,
    }));

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
