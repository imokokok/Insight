import { NextResponse, type NextRequest } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { assessExecutionPreflight } from '@/lib/preflight/executionPreflight';

import { PreTradeQuerySchema } from '../pre-trade/querySchema';

import type { z } from 'zod';

/** The preflight can make live RPC/oracle reads; retain the established paid-gate budget. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

type PreflightQuery = z.infer<typeof PreTradeQuerySchema>;

function toPreflightInput(query: PreflightQuery) {
  return {
    asset: query.asset,
    chainId: query.chainId,
    action: query.action,
    tradeAmountUsd: query.tradeAmountUsd,
    targetProviders: query.targetProviders,
    protocolId: query.protocolId,
    schemaVersion: query.schemaVersion,
    destinationAsset: query.destinationAsset,
    tokenAddress: query.tokenAddress,
    debugTokenSecurity: query.debugTokenSec === '1',
    ...(query.decisionInputCheck === '1'
      ? {
          decisionInput: {
            decisionPriceUsd: query.decisionPriceUsd!,
            quotePriceUsd: query.quotePriceUsd!,
            quoteObservedAt: query.quoteObservedAt!,
            maxReferenceDeviationBps: query.maxReferenceDeviationBps!,
            maxSlippageBps: query.maxSlippageBps!,
            maxQuoteAgeSeconds: query.maxQuoteAgeSeconds!,
            ...(query.quoteProvenance ? { quoteProvenance: query.quoteProvenance } : {}),
            ...(query.requireQuoteProvenance === true ? { requireQuoteProvenance: true } : {}),
            ...(query.reviewedUniswapV3AmountIn
              ? {
                  reviewedUniswapV3: {
                    amountIn: query.reviewedUniswapV3AmountIn,
                    maxQuoteDeviationBps: query.reviewedUniswapV3MaxQuoteDeviationBps!,
                    maxTwapDeviationBps: query.reviewedUniswapV3MaxTwapDeviationBps!,
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}

async function executePreflight(
  query: PreflightQuery,
  requestId: string,
  apiKeyId?: string
): Promise<NextResponse> {
  const result = await assessExecutionPreflight(toPreflightInput(query), { apiKeyId, requestId });
  return new Response(
    JSON.stringify(
      ApiResponseBuilder.success(result, {
        requestId,
        meta: { verdict: result.verdict, recommendation: result.recommendation },
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
}

const legacyGet = createApiHandler(
  async (_request, context) =>
    executePreflight(
      context.validated!.query as PreflightQuery,
      context.requestId,
      context.auth?.apiKey?.keyId
    ),
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: PreTradeQuerySchema },
  }
);

/**
 * API-key consumers use the standard v1 path. Keyless agents use the same C3
 * x402 lifecycle as pre-trade; settlement occurs only after the preflight has
 * completed and returned its evidence.
 */
export const GET = (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const cfg = getX402Config();
  if (cfg.enabled && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(request, cfg, async (requestId) => {
      const parsed = PreTradeQuerySchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams.entries())
      );
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Invalid execution preflight query parameters',
            {
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }
          ),
          { status: 400 }
        );
      }
      return executePreflight(parsed.data, requestId);
    });
  }

  return legacyGet(request, routeContext);
};
