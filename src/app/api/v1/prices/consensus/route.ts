import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import { type ConsensusMethod } from '@/lib/analytics/consensusPrice';
import { createApiHandler, createOptionsHandler, V1_STANDARD_MIDDLEWARES } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import {
  getConsensusPrice,
  type ConsensusPriceResponse,
} from '@/lib/api/services/consensusPriceService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { UnsupportedSymbolError } from '@/lib/errors';
import { SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';

const ConsensusQuerySchema = z.object({
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  method: z
    .enum(['median', 'trimmed_mean', 'weighted_median', 'iqr_filtered'])
    .optional()
    .default('weighted_median'),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { symbol, chain, method } = context.validated!.query!;

    try {
      const result: ConsensusPriceResponse = await getConsensusPrice(
        symbol,
        chain,
        method as ConsensusMethod
      );

      const response = NextResponse.json(
        ApiResponseBuilder.success(result, {
          requestId: context.requestId,
        })
      );

      response.headers.set('Cache-Control', CACHE_PRESETS.realtime);

      return response;
    } catch (error) {
      if (error instanceof UnsupportedSymbolError) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'SYMBOL_NOT_SUPPORTED',
            `No active Oracle feeds found for ${symbol}${chain ? ` on ${chain}` : ''}.`,
            {
              retryable: false,
              details: {
                symbol,
                chain,
                supportedSymbolsEndpoint: '/api/v1/symbols',
              },
            }
          ),
          { status: 404 }
        );
      }

      throw error;
    }
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: ConsensusQuerySchema },
  }
);
