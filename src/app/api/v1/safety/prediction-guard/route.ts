import { NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { X402_PAYMENT_SCOPE } from '@/lib/api/x402/capabilityPayment';
import { createPaidRouteMethod } from '@/lib/api/x402/paidRoute';
import {
  assessPolymarketGuard,
  PolymarketGuardInputSchema,
} from '@/lib/prediction/polymarketGuard';

/** The guard performs one live Gamma metadata read. */
export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

const QuerySchema = z
  .object({
    protocolId: z.literal('polymarket-prediction-mainnet'),
    action: z.enum(['buy_up', 'buy_down']),
    marketSlug: z.string().min(1).max(200),
  })
  .transform((input) => PolymarketGuardInputSchema.parse(input));

type GuardQuery = z.output<typeof QuerySchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessPolymarketGuard(input);
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
 * use the registered x402 resource. Prediction-market assessment is
 * chain-neutral (no on-chain execution authority), so it quotes the
 * merchant-configured payment rail rather than a chain-bound realm.
 */
export const GET = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.configured,
  source: 'query',
  schema: QuerySchema,
  inputLabel: 'Prediction Guard query parameters',
  execute: executeGuard,
  fallback: legacyGet,
});
