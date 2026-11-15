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
  assessTokenizedStockGuard,
  TokenizedStockGuardInputSchema,
} from '@/lib/stocks/tokenizedStockGuard';
import { createTokenizedStockGuardDecision } from '@/lib/stocks/tokenizedStockGuardAttestation';

/** The guard performs one live issuer-directory read (cached up to 60 s). */
export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

// Query parameters arrive as strings; coerce the numeric ones here and hand
// the strict domain schema a fully-typed object.
const QuerySchema = z
  .object({
    asset: TokenizedStockGuardInputSchema.shape.asset,
    action: TokenizedStockGuardInputSchema.shape.action,
    tradeAmountUsd: z.coerce.number().finite().positive(),
    decisionPriceUsd: z.coerce.number().finite().positive().optional(),
    maxDeviationBps: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .transform((input) => TokenizedStockGuardInputSchema.parse(input));

type GuardQuery = z.output<typeof QuerySchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const guard = await assessTokenizedStockGuard(input);
  const decision = await createTokenizedStockGuardDecision(guard);
  return NextResponse.json(
    ApiResponseBuilder.success(decision, {
      requestId,
      meta: { verdict: guard.verdict, attested: decision.attestation !== null },
    }),
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
 * use the registered x402 resource. Tokenized stocks are Base-native assets,
 * so the x402 quote binds to the Base mainnet rail; the assessment itself is
 * read-only issuer-reference policy and carries no on-chain execution
 * authority.
 */
export const GET = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.base,
  source: 'query',
  schema: QuerySchema,
  inputLabel: 'Tokenized Stock Guard query parameters',
  execute: executeGuard,
  fallback: legacyGet,
});
