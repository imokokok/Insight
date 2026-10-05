import { NextResponse, type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';

import { PreTradeQuerySchema } from './querySchema';

import type { z } from 'zod';

export const OPTIONS = createOptionsHandler();

interface PreTradeCheckParams {
  query: z.infer<typeof PreTradeQuerySchema>;
  /** API-key path only; the keyless x402 tier has no key to meter. */
  apiKeyId?: string;
  requestId: string;
}

/** Shared business core for both the API-key path and the x402 paid tier. */
async function executePreTradeCheck(params: PreTradeCheckParams): Promise<NextResponse> {
  const { query, apiKeyId, requestId } = params;

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
    {
      apiKeyId,
      requestId,
      workflowTag: query.workflowTag,
      baselineVerdict: query.baselineVerdict,
      baselineVersion: query.baselineVersion,
    }
  );

  const response: NextResponse = new Response(
    JSON.stringify(
      ApiResponseBuilder.success(result, {
        requestId,
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
}

const legacyGet = createApiHandler(
  async (_request, context) => {
    return executePreTradeCheck({
      query: context.validated!.query as z.infer<typeof PreTradeQuerySchema>,
      apiKeyId: context.auth?.apiKey?.keyId,
      requestId: context.requestId,
    });
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: PreTradeQuerySchema },
  }
);

/**
 * Three-way dispatch on the same URL (see ~/.workbuddy/insight-x402/):
 * - `PAYMENT-SIGNATURE` header → keyless x402 paid tier (verify → check → settle).
 * - Any auth header → legacy API-key handler, unchanged behaviour.
 * - Neither (paid tier armed only) → standard x402 402 quote so anonymous
 *   agents can self-discover the price. When the paid tier is disarmed
 *   (kill switch off or X402_PAY_TO empty) anonymous requests fall through to
 *   the legacy handler and get today's 401.
 */
export const GET = (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const cfg = getX402Config();

  if (cfg.enabled) {
    if (isPaidRequest(request)) {
      return handlePaidPreTradeRequest(request, cfg, async () => {
        const parsed = PreTradeQuerySchema.safeParse(
          Object.fromEntries(request.nextUrl.searchParams.entries())
        );
        if (!parsed.success) {
          return NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid pre-trade query parameters', {
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }),
            { status: 400 }
          );
        }
        return executePreTradeCheck({
          query: parsed.data,
          requestId: `req_${crypto.randomUUID().replace(/-/g, '')}`,
        });
      });
    }

    if (!hasAuthCredentials(request)) {
      return handlePaidPreTradeRequest(request, cfg, () => legacyGet(request, routeContext));
    }
  }

  return legacyGet(request, routeContext);
};
