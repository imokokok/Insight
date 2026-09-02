/**
 * @fileoverview Cross-chain price spread matrix API
 * Returns pairwise price spreads across chains for a given provider and symbol.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  V1_PROTOCOL_TIER_MIDDLEWARES,
} from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import {
  getCrossChainSpreads,
  type CrossChainSpreadResponse,
} from '@/lib/api/services/crossChainSpreadService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { UnsupportedSymbolError } from '@/lib/errors';
import { SafeChainSchema, SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

const CrossChainSpreadQuerySchema = z.object({
  provider: SafeProviderSchema,
  symbol: SafeSymbolSchema,
  baseChain: SafeChainSchema.optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, baseChain } = context.validated!.query!;

    try {
      const result: CrossChainSpreadResponse = await getCrossChainSpreads(
        provider as OracleProvider,
        symbol,
        baseChain as Blockchain | undefined
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
            `No active Oracle feeds found for ${symbol} from ${provider}.`,
            {
              retryable: false,
              details: {
                symbol,
                provider,
                supportedSymbolsEndpoint: '/api/v1/symbols',
              },
            }
          ),
          { status: 404 }
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      if (message === 'INSUFFICIENT_DATA') {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'INSUFFICIENT_DATA',
            `At least 2 chains with successful prices are required to compute cross-chain spreads for ${symbol} from ${provider}.`,
            {
              retryable: false,
              details: {
                symbol,
                provider,
                baseChain,
              },
            }
          ),
          { status: 422 }
        );
      }

      throw error;
    }
  },
  {
    // C2 deep-analysis endpoint (credit-metered)
    middlewares: V1_PROTOCOL_TIER_MIDDLEWARES,
    validation: { query: CrossChainSpreadQuerySchema },
  }
);
