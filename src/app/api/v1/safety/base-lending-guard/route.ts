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
  assessBaseLendingGuard,
  BaseLendingGuardExactInputSchema,
  BaseLendingGuardInputSchema,
} from '@/lib/lending/baseLendingGuard';
import { createBaseLendingGuardDecision } from '@/lib/lending/baseLendingGuardAttestation';

/** The guard performs two oracle assessments plus bounded on-chain reads. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

const QuerySchema = z
  .object({
    protocolId: z.enum(['aave-v3-base', 'morpho-blue-base', 'compound-v3-base', 'moonwell-base']),
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.string(),
    loanSymbol: z.string(),
    collateralValueUsd: z.coerce.number(),
    debtValueUsd: z.coerce.number(),
    marketId: z.string().optional(),
  })
  .transform((input) => BaseLendingGuardInputSchema.parse(input));

type GuardQuery = z.output<typeof QuerySchema>;

const DecisionBodySchema = BaseLendingGuardExactInputSchema;

type DecisionBody = z.infer<typeof DecisionBodySchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessBaseLendingGuard(input);
  return NextResponse.json(
    ApiResponseBuilder.success(result, { requestId, meta: { verdict: result.verdict } }),
    {
      headers: { 'Cache-Control': CACHE_PRESETS.noStore },
    }
  );
}

async function executeDecision(input: DecisionBody, requestId: string): Promise<NextResponse> {
  const guard = await assessBaseLendingGuard(input.guard);
  const decision = await createBaseLendingGuardDecision(guard, input.transaction);
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

/**
 * API-key callers retain the standard v1 middleware path. Keyless requests
 * use the registered x402 resource, verify before the decision, and settle
 * only after this read-only guard produces a complete result.
 */
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
            'Invalid Base Lending Guard query parameters',
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
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: DecisionBodySchema } }
);

/**
 * Exact-call mode. The signed decision commits to the full direct calldata,
 * sender, nonce and zero transaction value. It still is not an authorization
 * and must be bound to a user authorization (for example via PriorSeal).
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
          ApiResponseBuilder.error('VALIDATION_ERROR', 'Expected a JSON exact-call decision body', {
            requestId,
          }),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      const parsed = DecisionBodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'VALIDATION_ERROR',
            'Invalid Base Lending Guard exact-call body',
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
