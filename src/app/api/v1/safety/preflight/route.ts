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
import { createRequestDeadline } from '@/lib/utils/requestDeadline';

import { PreTradeQuerySchema } from '../pre-trade/querySchema';

import type { z } from 'zod';

/** The preflight can make live RPC/oracle reads; retain the established paid-gate budget. */
export const maxDuration = 60;
const PREFLIGHT_DEADLINE_MS = 45_000;
export const OPTIONS = createOptionsHandler();

// HEAD has no documented preflight semantics. Reject it before the GET
// payment dispatch so availability probes cannot generate x402 quotes.
export function HEAD(): Response {
  return new Response(null, { status: 405, headers: { Allow: 'GET, OPTIONS' } });
}

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
            ...(query.reviewedAerodromeSlipstreamAmountIn
              ? {
                  reviewedAerodromeSlipstream: {
                    amountIn: query.reviewedAerodromeSlipstreamAmountIn,
                    maxQuoteDeviationBps: query.reviewedAerodromeSlipstreamMaxQuoteDeviationBps!,
                    maxTwapDeviationBps: query.reviewedAerodromeSlipstreamMaxTwapDeviationBps!,
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
  apiKeyId?: string,
  requestSignal?: AbortSignal
): Promise<NextResponse> {
  const deadline = createRequestDeadline(
    requestSignal,
    PREFLIGHT_DEADLINE_MS,
    'Execution preflight deadline exceeded'
  );
  try {
    const result = await assessExecutionPreflight(
      toPreflightInput(query),
      { apiKeyId, requestId },
      { signal: deadline.signal }
    );
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
  } catch (error) {
    if (deadline.didExpire()) {
      return NextResponse.json(
        ApiResponseBuilder.error('REQUEST_TIMEOUT', 'Execution preflight timed out', {
          retryable: true,
          requestId,
        }),
        { status: 503, headers: { 'Cache-Control': CACHE_PRESETS.noStore, 'Retry-After': '5' } }
      );
    }
    throw error;
  } finally {
    deadline.dispose();
  }
}

const legacyGet = createApiHandler(
  async (request, context) =>
    executePreflight(
      context.validated!.query as PreflightQuery,
      context.requestId,
      context.auth?.apiKey?.keyId,
      request.signal
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
      return executePreflight(parsed.data, requestId, undefined, request.signal);
    });
  }

  return legacyGet(request, routeContext);
};
