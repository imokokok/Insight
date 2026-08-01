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

const HeartbeatQuerySchema = z.object({
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
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, from, to } = context.validated!.query!;
    const fromOrDefault = from ?? get7dAgoUtc();
    const toOrDefault = to ?? getTodayUtc();

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('hourly_price_snapshots')
      .select('snapshot_hour, provider, symbol, is_success')
      .gte('snapshot_hour', fromOrDefault)
      .lt('snapshot_hour', addDay(toOrDefault));

    if (provider) {
      query = query.eq('provider', provider);
    }
    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query;

    if (error) {
      return ApiResponseBuilder.serverError('Failed to fetch heartbeat stats', context.requestId);
    }

    const rows = (data ?? []) as Array<{
      snapshot_hour: string;
      provider: string;
      symbol: string;
      is_success: boolean;
    }>;

    // Group by provider+symbol
    const groupMap = new Map<
      string,
      {
        provider: string;
        symbol: string;
        snapshots: number;
        successes: number;
        hours: Set<string>;
      }
    >();

    for (const row of rows) {
      const key = `${row.provider}|${row.symbol}`;
      let group = groupMap.get(key);
      if (!group) {
        group = {
          provider: row.provider,
          symbol: row.symbol,
          snapshots: 0,
          successes: 0,
          hours: new Set(),
        };
        groupMap.set(key, group);
      }
      group.snapshots++;
      if (row.is_success) group.successes++;
      group.hours.add(row.snapshot_hour.slice(0, 13)); // Hour-level granularity
    }

    const fromTime = new Date(fromOrDefault).getTime();
    const toTime = new Date(addDay(toOrDefault)).getTime();
    const totalHours = Math.max(1, Math.round((toTime - fromTime) / (60 * 60 * 1000)));

    const entries = Array.from(groupMap.values()).map((group) => {
      const expectedSnapshots = totalHours; // One snapshot per hour
      const coveragePct = (group.hours.size / expectedSnapshots) * 100;
      const successRate = group.snapshots > 0 ? (group.successes / group.snapshots) * 100 : 0;
      const avgPerDay = group.snapshots / Math.max(1, totalHours / 24);

      return {
        provider: group.provider,
        symbol: group.symbol,
        totalSnapshots: group.snapshots,
        successfulSnapshots: group.successes,
        successRate: Number(successRate.toFixed(1)),
        hoursWithData: group.hours.size,
        totalHours,
        coveragePct: Number(Math.min(coveragePct, 100).toFixed(1)),
        avgSnapshotsPerDay: Number(avgPerDay.toFixed(1)),
      };
    });

    const payload = {
      from: fromOrDefault,
      to: toOrDefault,
      totalHours,
      entries,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    // Tier 2 deep-analysis endpoint
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: HeartbeatQuerySchema },
  }
);
