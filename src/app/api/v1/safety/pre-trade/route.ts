import { type NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { CACHE_PRESETS } from '@/lib/api/utils';

import { PreTradeQuerySchema } from './querySchema';

import type { z } from 'zod';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request, context) => {
    const query = context.validated!.query as z.infer<typeof PreTradeQuerySchema>;

    // preTradeSafetyCheck swallows UnsupportedSymbolError internally and returns
    // a BLOCK verdict, so any throw here is genuinely unexpected — let the
    // createApiHandler error middleware translate it to a 500.
    const result = await preTradeSafetyCheck(
      {
        asset: query.asset,
        chainId: query.chainId,
        action: query.action,
        tradeAmountUsd: query.tradeAmountUsd,
        targetProviders: query.targetProviders,
        protocolId: query.protocolId,
        schemaVersion: query.schemaVersion,
        destinationAsset: query.destinationAsset,
      },
      { apiKeyId: context.auth?.apiKey?.keyId }
    );

    const response: NextResponse = new Response(
      JSON.stringify(
        ApiResponseBuilder.success(result, {
          requestId: context.requestId,
          meta: { verdict: result.verdict },
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
    validation: { query: PreTradeQuerySchema },
  }
);
