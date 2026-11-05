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
  assessMonadLendingGuard,
  MonadLendingGuardExactInputSchema,
  MonadLendingGuardInputSchema,
} from '@/lib/lending/monadLendingGuard';
import { createMonadLendingGuardDecision } from '@/lib/lending/monadLendingGuardAttestation';

/** The guard performs two oracle assessments plus bounded on-chain reads. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

const QuerySchema = z
  .object({
    protocolId: z.enum(['aave-v3-monad', 'morpho-blue-monad']),
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.string(),
    loanSymbol: z.string(),
    collateralValueUsd: z.coerce.number(),
    debtValueUsd: z.coerce.number(),
    marketId: z.string().optional(),
  })
  .transform((input) => MonadLendingGuardInputSchema.parse(input));
type GuardQuery = z.output<typeof QuerySchema>;
type DecisionBody = z.infer<typeof MonadLendingGuardExactInputSchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessMonadLendingGuard(input);
  return NextResponse.json(
    ApiResponseBuilder.success(result, { requestId, meta: { verdict: result.verdict } }),
    {
      headers: { 'Cache-Control': CACHE_PRESETS.noStore },
    }
  );
}
async function executeDecision(input: DecisionBody, requestId: string): Promise<NextResponse> {
  const guard = await assessMonadLendingGuard(input.guard);
  const decision = await createMonadLendingGuardDecision(guard, input.transaction);
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

const legacyGet = createApiHandler(
  async (_request, context) =>
    executeGuard(context.validated!.query as GuardQuery, context.requestId),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { query: QuerySchema } }
);
export const GET = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.monad,
  source: 'query',
  schema: QuerySchema,
  inputLabel: 'Monad Lending Guard query parameters',
  execute: executeGuard,
  fallback: legacyGet,
});

const legacyPost = createApiHandler(
  async (_request, context) =>
    executeDecision(context.validated!.body as DecisionBody, context.requestId),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: MonadLendingGuardExactInputSchema } }
);
/** Bind a read-only assessment to one unsigned direct call; it is never authorization. */
export const POST = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.monad,
  source: 'body',
  schema: MonadLendingGuardExactInputSchema,
  inputLabel: 'Monad Lending Guard exact-call body',
  bodyParseError: 'Expected a JSON exact-call decision body',
  execute: executeDecision,
  fallback: legacyPost,
});
