import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { beginOracleWatchWindow } from '@/lib/api/services/oracleWatchWindowService';
import { ProductLimitError } from '@/lib/api/services/productLimits';
import { productLimitErrorResponse } from '@/lib/api/services/productLimitsHttp';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getX402Config, usdToAtomicUnits } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { ORACLE_WATCH_WINDOW_PLAN } from '@/lib/billing/oracleWatchWindow';
import { SafeChainSchema, SafeSymbolSchema } from '@/lib/security/validation';

/** One insert plus the x402 verify/settle round trips. */
export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

const BeginBodySchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset to monitor for the whole window, e.g. ETH'),
  chain: SafeChainSchema.optional().describe(
    'Optional chain scope fixed for the window, e.g. arbitrum'
  ),
});

type BeginBody = z.infer<typeof BeginBodySchema>;

function windowAmountAtomic(): string {
  return usdToAtomicUnits(ORACLE_WATCH_WINDOW_PLAN.priceUsd);
}

async function executeBegin(
  body: BeginBody,
  paymentMethod: 'x402' | 'credits',
  apiKeyId: string | null,
  requestId: string
): Promise<NextResponse> {
  try {
    const { window, windowToken } = await beginOracleWatchWindow({
      symbol: body.symbol,
      chain: body.chain ?? null,
      paymentMethod,
      apiKeyId,
    });

    const base = `/api/v1/safety/oracle-watch-window/${window.windowId}`;
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          product: ORACLE_WATCH_WINDOW_PLAN.id,
          window,
          // Shown exactly once — only the SHA-256 hash is stored server-side.
          windowToken,
          usage: {
            poll: { method: 'GET', url: base, authorization: 'Bearer <windowToken>' },
            close: { method: 'POST', url: base, authorization: 'Bearer <windowToken>' },
            pollCap: ORACLE_WATCH_WINDOW_PLAN.pollCap,
            minPollIntervalSeconds: ORACLE_WATCH_WINDOW_PLAN.minPollIntervalSeconds,
          },
        },
        { requestId, meta: { product: 'oracle_watch_window', windowId: window.windowId } }
      ),
      { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  } catch (error) {
    // Raised before any inventory is written. In the x402 path a non-2xx
    // business response skips settlement, so the buyer is not charged.
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
 * Purchase a monitored window. Keyless x402 callers settle the window price
 * once (a per-route amount override, NOT the per-call price); API-key callers
 * are charged the same value in credits by the quota middleware via the
 * product-priced endpoint registry. In-window polls never pass through here.
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
          body = await request.json();
        } catch {
          return NextResponse.json(
            ApiResponseBuilder.error(
              'VALIDATION_ERROR',
              'Expected a JSON monitored-window body: { symbol, chain? }',
              { requestId }
            ),
            { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
          );
        }
        const parsed = BeginBodySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid monitored-window body', {
              requestId,
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }),
            { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
          );
        }
        return executeBegin(parsed.data, 'x402', null, requestId);
      },
      { amountAtomic: windowAmountAtomic() }
    );
  }
  return legacyPost(request, routeContext);
};
