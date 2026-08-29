import { type NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getOracleWatchHistory } from '@/lib/api/services/oracleWatchTrendService';
import type { OracleWatchInterval } from '@/lib/api/services/oracleWatchTrendService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { maxTrendDays, normalizePlan } from '@/lib/billing/plans';
import { HISTORY_UNIVERSE_NOTE, isInHistoryUniverse } from '@/lib/reports/oracleWatchUniverse';
import { SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';

export const OracleWatchHistoryQuerySchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC'),
  chain: SafeChainSchema.optional().describe('Optional blockchain, e.g. ethereum, arbitrum, base'),
  days: z.coerce.number().int().min(1).max(365).default(30),
  interval: z
    .enum(['30min', 'hourly', 'daily'])
    .optional()
    .describe('Aggregation grain: 30min (raw), hourly, or daily'),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request, context) => {
    const query = context.validated!.query as z.infer<typeof OracleWatchHistoryQuerySchema>;

    // Tier the history window by plan for API-key requests: Free 7d, Pro 30d,
    // Protocol/Enterprise 90d. Session (UI) requests are left unclamped.
    let days = query.days;
    const apiKeyPlan = context.auth?.apiKey?.plan;
    if (apiKeyPlan) {
      const maxDays = maxTrendDays(normalizePlan(apiKeyPlan));
      if (days > maxDays) days = maxDays;
    }

    const result = await getOracleWatchHistory({
      symbol: query.symbol,
      chain: query.chain,
      days,
      interval: query.interval as OracleWatchInterval | undefined,
    });

    const response: NextResponse = new Response(
      JSON.stringify(
        ApiResponseBuilder.success(result, {
          requestId: context.requestId,
          meta: {
            symbol: result.symbol,
            chain: result.chain,
            days: result.days,
            grain: result.grain,
            currentVerdict: result.summary.currentVerdict,
            /**
             * An empty `series` is ambiguous: it can mean "quiet" or "we never
             * collect this pair". Say which, so a caller cannot mistake a
             * coverage gap for a clean bill of health.
             */
            historyGuaranteed: isInHistoryUniverse(result.symbol, result.chain),
            historyNote:
              result.series.length === 0
                ? isInHistoryUniverse(result.symbol, result.chain)
                  ? 'Empty series for a pair inside the committed universe — the collector has not written it yet or is failing. Treat as UNKNOWN, not healthy.'
                  : `No history for this pair. ${HISTORY_UNIVERSE_NOTE}`
                : HISTORY_UNIVERSE_NOTE,
          },
        })
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': CACHE_PRESETS.noStore,
        },
      }
    ) as NextResponse;

    return response;
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: OracleWatchHistoryQuerySchema },
  }
);
