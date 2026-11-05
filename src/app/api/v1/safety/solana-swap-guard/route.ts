import { NextResponse } from 'next/server';

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
  SolanaSwapGuardExactInputSchema,
  type SolanaSwapGuardExactInput,
  type SolanaSwapGuardResult,
} from '@/lib/dex/solanaSwapGuard';
import { createSolanaSwapGuardDecision } from '@/lib/dex/solanaSwapGuardAttestation';
import { executionAdapterRegistry } from '@/lib/execution/adapters';

/** Oracle reads and a live Solana protocol simulation can each take several seconds. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

async function executeDecision(
  input: SolanaSwapGuardExactInput,
  requestId: string
): Promise<NextResponse> {
  const prepared = await executionAdapterRegistry.preflight<
    SolanaSwapGuardExactInput,
    SolanaSwapGuardResult
  >('insight.solana.direct-swap-guard.v1', input);
  const guard = prepared.native;
  const decision = createSolanaSwapGuardDecision(guard, input.transaction);
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
    executeDecision(context.validated!.body as SolanaSwapGuardExactInput, context.requestId),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: SolanaSwapGuardExactInputSchema } }
);

/**
 * A paid request returns an assessment for exactly one unsigned Solana
 * transaction.  The response never signs, broadcasts, or grants execution
 * authority; an ALLOW must still be user-authorized through PriorSeal.
 */
export const POST = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.solana,
  source: 'body',
  schema: SolanaSwapGuardExactInputSchema,
  inputLabel: 'Solana Swap Guard exact-transaction body',
  bodyParseError: 'Expected a JSON exact Solana swap decision body',
  execute: executeDecision,
  fallback: legacyPost,
});
