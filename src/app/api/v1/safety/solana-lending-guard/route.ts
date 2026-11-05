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
import { executionAdapterRegistry } from '@/lib/execution/adapters';
import {
  SolanaLendingGuardExactInputSchema,
  type SolanaLendingGuardExactInput,
  type SolanaLendingGuardResult,
} from '@/lib/lending/solanaLendingGuard';
import { createSolanaLendingGuardDecision } from '@/lib/lending/solanaLendingGuardAttestation';

/** Oracle reads and a live Solana protocol simulation can each take several seconds. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

async function executeDecision(
  input: SolanaLendingGuardExactInput,
  requestId: string
): Promise<NextResponse> {
  const prepared = await executionAdapterRegistry.preflight<
    SolanaLendingGuardExactInput,
    SolanaLendingGuardResult
  >('insight.solana.direct-lending-guard.v1', input);
  const guard = prepared.native;
  const decision = createSolanaLendingGuardDecision(guard, input.transaction);
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
    executeDecision(context.validated!.body as SolanaLendingGuardExactInput, context.requestId),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: SolanaLendingGuardExactInputSchema } }
);

/**
 * A paid request returns an assessment for exactly one unsigned Solana
 * transaction.  The response never signs, broadcasts, or grants execution
 * authority; an ALLOW must still be user-authorized through PriorSeal.
 */
export const POST = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.solana,
  source: 'body',
  schema: SolanaLendingGuardExactInputSchema,
  inputLabel: 'Solana Lending Guard exact-transaction body',
  bodyParseError: 'Expected a JSON exact Solana lending decision body',
  execute: executeDecision,
  fallback: legacyPost,
});
