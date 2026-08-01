import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getDaysAgoUtc, getTodayUtc, addDay } from '@/lib/utils/date';

const ExportQuerySchema = z.object({
  symbol: SafeSymbolSchema.optional(),
  provider: SafeProviderSchema.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  limit: z.coerce.number().int().min(1).max(50000).optional().default(1000),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { symbol, provider, from, to, limit, offset } = context.validated!.query!;
    const fromOrDefault = from ?? getDaysAgoUtc(1);
    const toOrDefault = to ?? getTodayUtc();

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('price_records')
      .select('provider, symbol, chain, price, timestamp, confidence, source, verification')
      .gte('timestamp', fromOrDefault)
      .lt('timestamp', addDay(toOrDefault))
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;

    if (error) {
      return ApiResponseBuilder.serverError('Failed to fetch price records', context.requestId);
    }

    const response = NextResponse.json(
      ApiResponseBuilder.success(
        {
          exportedAt: new Date().toISOString(),
          filters: {
            symbol: symbol ?? null,
            provider: provider ?? null,
            from: fromOrDefault,
            to: toOrDefault,
          },
          count: data?.length ?? 0,
          records: data ?? [],
        },
        { requestId: context.requestId }
      )
    );

    response.headers.set('Cache-Control', CACHE_PRESETS.noStore);

    return response;
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: ExportQuerySchema },
  }
);
