import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { x402ConfigForPaymentScope, X402_PAYMENT_SCOPE } from '@/lib/api/x402/capabilityPayment';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { assessBnbPerpGuard, BnbPerpGuardInputSchema } from '@/lib/perps/bnbPerpGuard';

/** The guard performs two oracle assessments plus live Aster venue reads. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

const QuerySchema = z
  .object({
    protocolId: z.literal('aster-perps-bnb-mainnet'),
    action: z.enum(['open_long', 'open_short']),
    assetSymbol: z.string(),
    marginAssetSymbol: z.literal('USDT'),
    sizeUsd: z.coerce.number(),
    marginValueUsd: z.coerce.number(),
  })
  .transform((input) => BnbPerpGuardInputSchema.parse(input));

type GuardQuery = z.output<typeof QuerySchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessBnbPerpGuard(input);
  return NextResponse.json(
    ApiResponseBuilder.success(result, { requestId, meta: { verdict: result.verdict } }),
    {
      headers: { 'Cache-Control': CACHE_PRESETS.noStore },
    }
  );
}

const legacyGet = createApiHandler(
  async (_request, context) =>
    executeGuard(context.validated!.query as GuardQuery, context.requestId),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { query: QuerySchema } }
);

/**
 * API-key callers retain the standard v1 middleware path. Keyless requests
 * use the registered x402 resource, verify before the assessment, and settle
 * only after this read-only guard produces a complete result.
 */
export const GET = (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = x402ConfigForPaymentScope(getX402Config(), X402_PAYMENT_SCOPE.bnb);
  if (config && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(request, config, async (requestId) => {
      const parsed = QuerySchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams.entries())
      );
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid BNB Perp Guard query parameters', {
            requestId,
            details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
          }),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      return executeGuard(parsed.data, requestId);
    });
  }
  return legacyGet(request, routeContext);
};
