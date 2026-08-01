/**
 * @fileoverview Composite risk metrics summary API
 * Returns HHI, diversification, volatility, correlation, freshness,
 * manipulation resistance and shared-dependency risk scores for a symbol.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, V1_STANDARD_MIDDLEWARES } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getRiskSummary, type RiskSummaryResponse } from '@/lib/api/services/riskSummaryService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { UnsupportedSymbolError } from '@/lib/errors';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { type OracleProvider } from '@/types/oracle';

const MAX_PROVIDERS = 10;

const ProvidersListSchema = z
  .string()
  .transform((val) =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  .pipe(
    z
      .array(SafeProviderSchema)
      .min(2, 'At least 2 providers are required')
      .max(MAX_PROVIDERS, `Maximum ${MAX_PROVIDERS} providers allowed`)
  );

const PeriodSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
  .refine(
    (val) => !isNaN(val) && val >= 1 && val <= 8760,
    'Period must be between 1 and 8760 hours (1 year)'
  );

const RiskSummaryQuerySchema = z.object({
  symbol: SafeSymbolSchema,
  providers: ProvidersListSchema,
  period: PeriodSchema.optional().default(168),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { symbol, providers, period } = context.validated!.query!;

    try {
      const result: RiskSummaryResponse = await getRiskSummary(
        symbol,
        providers as OracleProvider[],
        period
      );

      const response = NextResponse.json(
        ApiResponseBuilder.success(result, {
          requestId: context.requestId,
        })
      );

      response.headers.set('Cache-Control', CACHE_PRESETS.semiStatic);

      return response;
    } catch (error) {
      if (error instanceof UnsupportedSymbolError) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'SYMBOL_NOT_SUPPORTED',
            `No active Oracle feeds found for ${symbol}.`,
            {
              retryable: false,
              details: {
                symbol,
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
            `At least 2 providers with successful prices are required to compute risk metrics for ${symbol}.`,
            {
              retryable: false,
              details: {
                symbol,
                requestedProviders: providers,
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
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: RiskSummaryQuerySchema },
  }
);
