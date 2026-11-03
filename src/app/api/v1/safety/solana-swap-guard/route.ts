import { type NextRequest, NextResponse } from 'next/server';

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
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = x402ConfigForPaymentScope(getX402Config(), X402_PAYMENT_SCOPE.solana);
  if (config && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(request, config, async (requestId) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Expected a JSON exact Solana swap decision body',
            { requestId }
          ),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      const parsed = SolanaSwapGuardExactInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Invalid Solana Swap Guard exact-transaction body',
            {
              requestId,
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }
          ),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      return executeDecision(parsed.data, requestId);
    });
  }
  return legacyPost(request, routeContext);
};
