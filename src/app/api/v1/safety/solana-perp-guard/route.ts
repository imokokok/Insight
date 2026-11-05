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
import { executionAdapterRegistry } from '@/lib/execution/adapters';
import {
  assessSolanaPerpGuard,
  SolanaPerpGuardExactInputSchema,
  SolanaPerpGuardInputSchema,
} from '@/lib/perps/solanaPerpGuard';
import type { SolanaPerpGuardExactResult } from '@/lib/perps/solanaPerpGuard';
import { createSolanaPerpGuardDecision } from '@/lib/perps/solanaPerpGuardAttestation';

/** The guard performs two oracle assessments plus live on-chain Drift reads. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

const QuerySchema = z
  .object({
    protocolId: z.literal('drift-v2-mainnet'),
    action: z.enum(['open_long', 'open_short']),
    assetSymbol: z.string(),
    marginAssetSymbol: z.literal('USDC'),
    sizeUsd: z.coerce.number(),
    marginValueUsd: z.coerce.number(),
  })
  .transform((input) => SolanaPerpGuardInputSchema.parse(input));

type GuardQuery = z.output<typeof QuerySchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessSolanaPerpGuard(input);
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

async function executeDecision(
  input: z.infer<typeof SolanaPerpGuardExactInputSchema>,
  requestId: string
): Promise<NextResponse> {
  const prepared = await executionAdapterRegistry.preflight<
    z.infer<typeof SolanaPerpGuardExactInputSchema>,
    SolanaPerpGuardExactResult
  >('insight.solana.direct-perp-guard.v1', input);
  const guard = prepared.native;
  const decision = createSolanaPerpGuardDecision(guard, input.transaction);
  return NextResponse.json(
    ApiResponseBuilder.success(decision, {
      requestId,
      meta: {
        verdict: guard.verdict,
        attested: decision.attestation !== null,
        execution: 'not_performed',
      },
    }),
    { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
}

const legacyPost = createApiHandler(
  async (_request, context) =>
    executeDecision(
      context.validated!.body as z.infer<typeof SolanaPerpGuardExactInputSchema>,
      context.requestId
    ),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: SolanaPerpGuardExactInputSchema } }
);

/**
 * A paid request returns an assessment for exactly one unsigned Solana
 * transaction.  The response never signs, broadcasts, or grants execution
 * authority; an ALLOW must still be user-authorized through PriorSeal.
 */
export const POST = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.solana,
  source: 'body',
  schema: SolanaPerpGuardExactInputSchema,
  inputLabel: 'Solana Perp Guard exact-transaction body',
  bodyParseError: 'Expected a JSON exact Solana perp decision body',
  execute: executeDecision,
  fallback: legacyPost,
});

/**
 * API-key callers retain the standard v1 middleware path. Keyless requests
 * use the registered x402 resource, verify before the assessment, and settle
 * only after this read-only guard produces a complete result.
 */
export const GET = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.solana,
  source: 'query',
  schema: QuerySchema,
  inputLabel: 'Solana Perp Guard query parameters',
  execute: executeGuard,
  fallback: legacyGet,
});
