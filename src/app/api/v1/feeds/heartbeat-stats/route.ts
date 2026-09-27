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
import { loadSnapshotUptime } from '@/lib/supabase/snapshotHistory';
import { get7dAgoUtc, getTodayUtc, addDay } from '@/lib/utils/date';
import { roundTo } from '@/lib/utils/format';

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

    let groups;
    try {
      groups = await loadSnapshotUptime(
        supabase,
        fromOrDefault,
        addDay(toOrDefault),
        provider,
        symbol
      );
    } catch {
      return ApiResponseBuilder.serverError('Failed to fetch heartbeat stats', context.requestId);
    }

    const fromTime = new Date(fromOrDefault).getTime();
    const toTime = new Date(addDay(toOrDefault)).getTime();
    const totalHours = Math.max(1, Math.round((toTime - fromTime) / (60 * 60 * 1000)));

    const entries = groups.map((group) => {
      const expectedSnapshots = totalHours; // One snapshot per hour
      const coveragePct = (group.hours / expectedSnapshots) * 100;
      const successRate = group.snapshots > 0 ? (group.successes / group.snapshots) * 100 : 0;
      const avgPerDay = group.snapshots / Math.max(1, totalHours / 24);

      return {
        provider: group.provider,
        symbol: group.symbol,
        totalSnapshots: group.snapshots,
        successfulSnapshots: group.successes,
        successRate: roundTo(successRate, 1),
        hoursWithData: group.hours,
        totalHours,
        coveragePct: roundTo(Math.min(coveragePct, 100), 1),
        avgSnapshotsPerDay: roundTo(avgPerDay, 1),
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
    // C2 deep-analysis endpoint (credit-metered)
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: HeartbeatQuerySchema },
  }
);
