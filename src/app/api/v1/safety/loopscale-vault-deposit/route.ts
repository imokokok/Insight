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
  LoopscaleVaultDepositInputSchema,
  prepareLoopscaleVaultDeposit,
  type LoopscaleVaultDepositInput,
} from '@/lib/lending/loopscaleVaultDeposit';
import { createSolanaLendingGuardDecision } from '@/lib/lending/solanaLendingGuardAttestation';

/** Building, resolving address tables, and simulation can each take several seconds. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

async function execute(
  input: LoopscaleVaultDepositInput,
  requestId: string
): Promise<NextResponse> {
  const prepared = await prepareLoopscaleVaultDeposit(input);
  const decision = prepared.transaction
    ? createSolanaLendingGuardDecision(prepared.guard, prepared.transaction)
    : null;
  return NextResponse.json(
    ApiResponseBuilder.success(decision ?? prepared.guard, {
      requestId,
      meta: {
        verdict: prepared.guard.verdict,
        attested: decision?.attestation !== null,
        execution: 'not_performed',
      },
    }),
    { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
}

const legacyPost = createApiHandler(
  async (_request, context) =>
    execute(context.validated!.body as LoopscaleVaultDepositInput, context.requestId),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: LoopscaleVaultDepositInputSchema } }
);

/**
 * Insight asks only Loopscale's official API to construct the deposit. An
 * ALLOW is still an unsigned, short-lived message that requires PriorSeal and
 * user authorization before a wallet can submit it.
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
            'Expected a JSON Loopscale vault-deposit body',
            { requestId }
          ),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      const parsed = LoopscaleVaultDepositInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid Loopscale vault-deposit body', {
            requestId,
            details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
          }),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      return execute(parsed.data, requestId);
    });
  }
  return legacyPost(request, routeContext);
};
