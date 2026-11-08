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
import {
  readTursoPriceRecordsFallbackOnMiss,
  readTursoPriceRecordsMode,
} from '@/lib/turso/price/client';
import { loadTursoPriceRecords } from '@/lib/turso/price/recordsQuery';
import { get7dAgoUtc, getTodayUtc, addDay } from '@/lib/utils/date';
import { roundTo } from '@/lib/utils/format';

const SignalsQuerySchema = z.object({
  provider: SafeProviderSchema.optional(),
  symbol: SafeSymbolSchema.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(200),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, from, to, limit, offset } = context.validated!.query!;
    const fromOrDefault = from ?? get7dAgoUtc();
    const toOrDefault = to ?? getTodayUtc();

    const supabase = createServiceRoleClient();

    type SignalRecord = {
      provider: string;
      symbol: string;
      timestamp: string;
      price: number;
      confidence: number | null;
      failure_mode: string | null;
      signal_vector: Record<string, number> | null;
      metadata: Record<string, unknown> | null;
    };

    const loadRecords = async (): Promise<SignalRecord[]> => {
      if (readTursoPriceRecordsMode() === 'turso') {
        const records = await loadTursoPriceRecords({
          provider,
          symbol,
          startTime: Date.parse(fromOrDefault),
          endTime: Date.parse(addDay(toOrDefault)) - 1,
          limit,
          offset,
        });
        if (records !== null && (records.length > 0 || !readTursoPriceRecordsFallbackOnMiss())) {
          return records.map((record) => ({
            provider: record.provider,
            symbol: record.symbol,
            timestamp: record.timestamp,
            price: record.price,
            confidence: record.confidence ?? null,
            failure_mode: record.failure_mode ?? null,
            signal_vector: (record.signal_vector ?? null) as Record<string, number> | null,
            metadata: null,
          }));
        }
        if (records === null && !readTursoPriceRecordsFallbackOnMiss()) {
          throw new Error('Turso price_records unavailable');
        }
      }
      let query = supabase
        .from('price_records')
        .select(
          'provider, symbol, timestamp, price, confidence, failure_mode, signal_vector, metadata'
        )
        .gte('timestamp', fromOrDefault)
        .lt('timestamp', addDay(toOrDefault))
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
      if (provider) query = query.eq('provider', provider);
      if (symbol) query = query.eq('symbol', symbol);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SignalRecord[];
    };

    let records: SignalRecord[];
    try {
      records = await loadRecords();
    } catch {
      return ApiResponseBuilder.serverError(
        'Failed to fetch signal vector data',
        context.requestId
      );
    }

    // Filter to only records that have signal_vector data
    const withSignals = records.filter((r) => r.signal_vector !== null);

    const signals = withSignals.map((r) => ({
      provider: r.provider,
      symbol: r.symbol,
      timestamp: r.timestamp,
      price: r.price,
      confidence: r.confidence,
      failureMode: r.failure_mode,
      signalVector: r.signal_vector,
      metadata: r.metadata,
    }));

    // Aggregate averages for the returned set
    const vectorSums: Record<string, { sum: number; count: number }> = {};
    for (const s of signals) {
      if (s.signalVector) {
        for (const [dim, val] of Object.entries(s.signalVector)) {
          if (!vectorSums[dim]) vectorSums[dim] = { sum: 0, count: 0 };
          vectorSums[dim].sum += val;
          vectorSums[dim].count++;
        }
      }
    }

    const averages: Record<string, number> = {};
    for (const [dim, agg] of Object.entries(vectorSums)) {
      averages[dim] = agg.count > 0 ? roundTo(agg.sum / agg.count, 4) : 0;
    }

    const payload = {
      from: fromOrDefault,
      to: toOrDefault,
      count: signals.length,
      dimensionAverages: averages,
      signals,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: SignalsQuerySchema },
  }
);
