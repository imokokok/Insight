/**
 * @fileoverview Composite risk metrics summary API
 * Returns HHI, diversification, volatility, correlation, freshness,
 * manipulation resistance and shared-dependency risk scores for a symbol.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getRiskSummary, type RiskSummaryResponse } from '@/lib/api/services/riskSummaryService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { UnsupportedSymbolError } from '@/lib/errors';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { type OracleProvider } from '@/types/oracle';

const MAX_PROVIDERS = 10;

/**
 * Public-tier limits for anonymous callers. The endpoint is deliberately open
 * so external agents and integrators can discover the risk surface without an
 * account; deeper reads (long history, many providers) keep the authenticated
 * path so the free tier cannot become a free data-warehouse.
 */
const PUBLIC_TIER_MAX_PERIOD_HOURS = 168;
const PUBLIC_TIER_MAX_PROVIDERS = 4;

/** Presence of a credential header opts the caller into the full query space.
 *  Validation of the credential itself is the auth middleware's job; this gate
 *  only separates anonymous discovery from metered depth. */
function hasApiCredential(request: NextRequest): boolean {
  return Boolean(request.headers.get('x-api-key') ?? request.headers.get('authorization'));
}

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
  async (request: NextRequest, context) => {
    const { symbol, providers, period } = context.validated!.query!;

    // Public tier: anonymous callers get the default 7-day window and a
    // compact provider set; deeper reads require a credential.
    if (
      !hasApiCredential(request) &&
      (period > PUBLIC_TIER_MAX_PERIOD_HOURS || providers.length > PUBLIC_TIER_MAX_PROVIDERS)
    ) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'UNAUTHORIZED',
          'Authentication required for deep risk summary queries',
          {
            details: {
              publicTierLimits: {
                periodHours: PUBLIC_TIER_MAX_PERIOD_HOURS,
                providers: PUBLIC_TIER_MAX_PROVIDERS,
              },
              upgradeHint:
                'Provide an API key (x-api-key header) for periods up to 8760h and up to 10 providers.',
              requested: { periodHours: period, providers: providers.length },
            },
          }
        ),
        { status: 401 }
      );
    }

    try {
      const result: RiskSummaryResponse = await getRiskSummary(
        symbol,
        providers as OracleProvider[],
        period
      );

      // Machine-readable funnel: a risk summary is context, not a verdict.
      // Point agents at the paying surface (pre-trade verdict) and the
      // re-verification surface (signed attestation schema) without implying
      // that this response authorizes anything.
      const dataWithNextActions = {
        ...result,
        nextActions: {
          preTradeVerdict: {
            method: 'GET',
            template:
              '/api/v1/safety/pre-trade?symbol={symbol}&chain={chain}&side={side}&notionalUsd={notionalUsd}',
            prefilled: { symbol: encodeURIComponent(symbol) },
            description:
              'Signed pre-trade verdict for one trade on this input. BLOCK verdicts are complete checks and are charged (x402).',
          },
          attestationSchema: {
            method: 'GET',
            href: '/api/v1/safety/attestation/sample',
            description:
              'Signed attestation schema; third parties can re-verify a verdict offline.',
          },
        },
      };

      const response = NextResponse.json(
        ApiResponseBuilder.success(dataWithNextActions, {
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
    middlewares: {
      logging: true,
      auth: { required: false },
      rateLimit: { preset: 'moderate' },
      cors: true,
    },
    validation: { query: RiskSummaryQuerySchema },
  }
);
