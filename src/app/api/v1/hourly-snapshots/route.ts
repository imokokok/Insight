import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { get7dAgoUtc, getTodayUtc, addDay } from '@/lib/utils/date';

const SnapshotQuerySchema = z.object({
  symbol: SafeSymbolSchema.optional(),
  provider: SafeProviderSchema.optional(),
  chainId: z.coerce.number().int().min(0).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional().default(2000),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { symbol, provider, chainId, from, to, limit, offset } = context.validated!.query!;
    const fromOrDefault = from ?? get7dAgoUtc();
    const toOrDefault = to ?? getTodayUtc();

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('hourly_price_snapshots')
      .select(
        'snapshot_hour, provider, symbol, chain_id, price, consensus_price, deviation_pct, latency_ms, data_age_seconds, confidence, is_success'
      )
      .gte('snapshot_hour', fromOrDefault)
      .lt('snapshot_hour', addDay(toOrDefault))
      .order('snapshot_hour', { ascending: false })
      .range(offset, offset + limit - 1);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    if (provider) {
      query = query.eq('provider', provider);
    }
    if (chainId !== undefined) {
      query = query.eq('chain_id', chainId);
    }

    const { data, error } = await query;

    if (error) {
      return ApiResponseBuilder.serverError('Failed to fetch hourly snapshots', context.requestId);
    }

    return createCachedJsonResponse(
      ApiResponseBuilder.success(
        {
          from: fromOrDefault,
          to: toOrDefault,
          count: data?.length ?? 0,
          snapshots: data ?? [],
        },
        { requestId: context.requestId }
      ),
      { preset: 'static' }
    );
  },
  {
    // Tier 2 deep-analysis endpoint
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: SnapshotQuerySchema },
  }
);
