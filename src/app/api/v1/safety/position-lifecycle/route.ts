import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import {
  parseLimitedJson,
  RequestBodyTooLargeError,
  requestBodyTooLargeResponse,
} from '@/lib/api/requestLimits';
import { beginPositionLifecycle } from '@/lib/api/services/positionLifecycleService';
import { ProductLimitError } from '@/lib/api/services/productLimits';
import { productLimitErrorResponse } from '@/lib/api/services/productLimitsHttp';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getX402Config, usdToAtomicUnits } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { POSITION_LIFECYCLE_PLAN } from '@/lib/billing/positionLifecycle';
import { SafeChainSchema, SafeSymbolSchema } from '@/lib/security/validation';

/** Two inserts plus the x402 verify/settle round trips. */
export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

const BeginBodySchema = z.object({
  symbol: SafeSymbolSchema.describe('Position subject monitored for the whole lifecycle, e.g. ETH'),
  chain: SafeChainSchema.optional().describe(
    'Optional chain scope fixed for the lifecycle, e.g. arbitrum'
  ),
});

type BeginBody = z.infer<typeof BeginBodySchema>;

function lifecycleAmountAtomic(): string {
  return usdToAtomicUnits(POSITION_LIFECYCLE_PLAN.priceUsd);
}

async function executeBegin(
  body: BeginBody,
  paymentMethod: 'x402' | 'credits',
  apiKeyId: string | null,
  requestId: string
): Promise<NextResponse> {
  try {
    const { lifecycle, windowId, lifecycleToken, usage } = await beginPositionLifecycle({
      symbol: body.symbol,
      chain: body.chain ?? null,
      paymentMethod,
      apiKeyId,
    });

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          product: POSITION_LIFECYCLE_PLAN.id,
          lifecycle,
          windowId,
          // Shown exactly once — only the SHA-256 hash is stored server-side.
          // The same token authenticates watch polling on the embedded window.
          lifecycleToken,
          usage,
        },
        { requestId, meta: { product: 'position_lifecycle', lifecycleId: lifecycle.lifecycleId } }
      ),
      { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  } catch (error) {
    // Both inventory caps are checked before either row is written; in the
    // x402 path a non-2xx business response skips settlement.
    if (error instanceof ProductLimitError) return productLimitErrorResponse(error, requestId);
    throw error;
  }
}

const legacyPost = createApiHandler(
  async (_request, context) =>
    executeBegin(
      context.validated!.body as BeginBody,
      'credits',
      context.auth?.apiKey?.keyId ?? null,
      context.requestId
    ),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: BeginBodySchema } }
);

/**
 * Purchase a position lifecycle. Keyless x402 callers settle the bundle price
 * once (a per-route amount override, NOT the per-call price); API-key callers
 * are charged the same value in credits by the quota middleware via the
 * product-priced endpoint registry. In-lifecycle guard, receipt, and watch
 * calls never pass through here.
 */
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = getX402Config();
  if (config.enabled && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(
      request,
      config,
      async (requestId) => {
        let body: unknown;
        try {
          body = await parseLimitedJson(request);
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError) {
            return requestBodyTooLargeResponse(undefined, requestId);
          }
          return NextResponse.json(
            ApiResponseBuilder.error(
              'VALIDATION_ERROR',
              'Expected a JSON position-lifecycle body: { symbol, chain? }',
              { requestId }
            ),
            { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
          );
        }
        const parsed = BeginBodySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid position-lifecycle body', {
              requestId,
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }),
            { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
          );
        }
        return executeBegin(parsed.data, 'x402', null, requestId);
      },
      { amountAtomic: lifecycleAmountAtomic() }
    );
  }
  return legacyPost(request, routeContext);
};
