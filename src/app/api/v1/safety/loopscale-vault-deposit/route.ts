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
export const POST = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.solana,
  source: 'body',
  schema: LoopscaleVaultDepositInputSchema,
  inputLabel: 'Loopscale vault-deposit body',
  bodyParseError: 'Expected a JSON Loopscale vault-deposit body',
  execute: execute,
  fallback: legacyPost,
});
