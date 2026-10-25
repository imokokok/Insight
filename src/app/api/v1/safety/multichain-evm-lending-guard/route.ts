import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

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
  MultichainEvmLendingGuardExactInputSchema,
  MultichainEvmLendingGuardInputSchema,
  assessMultichainEvmLendingGuard,
} from '@/lib/lending/multichainEvmLendingGuard';
import { createMultichainEvmLendingGuardDecision } from '@/lib/lending/multichainEvmLendingGuardAttestation';

/** Two oracle checks plus bounded live protocol reads. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

const QuerySchema = z
  .object({
    chainId: z.coerce.number(),
    protocolId: z.string(),
    action: z.string(),
    collateralSymbol: z.string(),
    loanSymbol: z.string(),
    collateralValueUsd: z.coerce.number(),
    debtValueUsd: z.coerce.number(),
  })
  .transform((input) => MultichainEvmLendingGuardInputSchema.parse(input));
type GuardQuery = z.output<typeof QuerySchema>;
type DecisionBody = z.infer<typeof MultichainEvmLendingGuardExactInputSchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessMultichainEvmLendingGuard(input);
  return NextResponse.json(
    ApiResponseBuilder.success(result, { requestId, meta: { verdict: result.verdict } }),
    {
      headers: { 'Cache-Control': CACHE_PRESETS.noStore },
    }
  );
}
async function executeDecision(input: DecisionBody, requestId: string): Promise<NextResponse> {
  const guard = await assessMultichainEvmLendingGuard(input.guard);
  const decision = await createMultichainEvmLendingGuardDecision(guard, input.transaction);
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
export const GET = (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = getX402Config();
  if (config.enabled && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(request, config, async (requestId) => {
      const parsed = QuerySchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams.entries())
      );
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Invalid multichain EVM Lending Guard query parameters',
            {
              requestId,
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }
          ),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      return executeGuard(parsed.data, requestId);
    });
  }
  return legacyGet(request, routeContext);
};
const legacyPost = createApiHandler(
  async (_request, context) =>
    executeDecision(context.validated!.body as DecisionBody, context.requestId),
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: MultichainEvmLendingGuardExactInputSchema },
  }
);
/** Bind a read-only assessment to one unsigned direct EVM call; never execution authority. */
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
          ApiResponseBuilder.error('VALIDATION_ERROR', 'Expected a JSON exact-call decision body', {
            requestId,
          }),
          {
            status: 400,
            headers: { 'Cache-Control': CACHE_PRESETS.noStore },
          }
        );
      }
      const parsed = MultichainEvmLendingGuardExactInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Invalid multichain EVM Lending Guard exact-call body',
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
