import { type NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';

const OracleWatchQuerySchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC'),
  chain: SafeChainSchema.optional().describe('Optional blockchain, e.g. ethereum, arbitrum, base'),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request, context) => {
    const query = context.validated!.query as z.infer<typeof OracleWatchQuerySchema>;

    // getOracleWatchSignal degrades unsupported symbols / zero coverage into a
    // DANGER verdict internally, so any throw here is genuinely unexpected —
    // let the createApiHandler error middleware translate it to a 500.
    const result = await getOracleWatchSignal(query.symbol, query.chain);

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
    validation: { query: OracleWatchQuerySchema },
  }
);
