import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import {
  SolanaLendingGuardExactInputSchema,
  assessSolanaLendingGuard,
  type SolanaLendingGuardExactInput,
} from '@/lib/lending/solanaLendingGuard';
import { createSolanaLendingGuardDecision } from '@/lib/lending/solanaLendingGuardAttestation';

/** Oracle reads and a live Solana protocol simulation can each take several seconds. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

async function executeDecision(
  input: SolanaLendingGuardExactInput,
  requestId: string
): Promise<NextResponse> {
  const guard = await assessSolanaLendingGuard(input.guard, input.transaction);
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
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = getX402Config();
  if (config.enabled && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(request, config, async (requestId) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Expected a JSON exact Solana lending decision body',
            { requestId }
          ),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      const parsed = SolanaLendingGuardExactInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Invalid Solana Lending Guard exact-transaction body',
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
