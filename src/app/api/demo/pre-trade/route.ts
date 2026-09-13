import { type NextResponse } from 'next/server';

import { PreTradeQuerySchema } from '@/app/api/v1/safety/pre-trade/querySchema';
import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { CACHE_PRESETS } from '@/lib/api/utils';

import type { z } from 'zod';

/** Session-authenticated website demo. The paid v1 route remains API-key only. */
export const GET = createApiHandler(
  async (_request, context) => {
    const query = context.validated!.query as z.infer<typeof PreTradeQuerySchema>;
    const result = await preTradeSafetyCheck({
      asset: query.asset,
      chainId: query.chainId,
      action: query.action,
      tradeAmountUsd: query.tradeAmountUsd,
      targetProviders: query.targetProviders,
      protocolId: query.protocolId,
      schemaVersion: query.schemaVersion,
      destinationAsset: query.destinationAsset,
    });

    return new Response(
      JSON.stringify(
        ApiResponseBuilder.success(result, {
          requestId: context.requestId,
          meta: { verdict: result.verdict },
        })
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_PRESETS.noStore },
      }
    ) as NextResponse;
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
      rateLimit: { preset: 'moderate' },
    },
    validation: { query: PreTradeQuerySchema },
  }
);
