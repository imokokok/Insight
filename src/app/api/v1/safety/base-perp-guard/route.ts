import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

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
  assessBasePerpGuard,
  BasePerpGuardExactInputSchema,
  BasePerpGuardInputSchema,
} from '@/lib/perps/basePerpGuard';
import { createBasePerpGuardDecision } from '@/lib/perps/basePerpGuardAttestation';
import { fetchBasePerpLiquidityEvidence } from '@/lib/perps/basePerpLiquidityEvidence';

/** The guard performs two oracle assessments plus one cached spot-market read. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

const QuerySchema = z
  .object({
    protocolId: z.literal('synthetix-perps-v3-base'),
    action: z.enum(['open_long', 'open_short']),
    assetSymbol: z.string(),
    marginAssetSymbol: z.literal('USDC'),
    sizeUsd: z.coerce.number(),
    marginValueUsd: z.coerce.number(),
  })
  .transform((input) => BasePerpGuardInputSchema.parse(input));

type GuardQuery = z.output<typeof QuerySchema>;

const DecisionBodySchema = BasePerpGuardExactInputSchema;

type DecisionBody = z.infer<typeof DecisionBodySchema>;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessBasePerpGuard(input, {
    fetchLiquidityEvidence: fetchBasePerpLiquidityEvidence,
  });
  return NextResponse.json(
    ApiResponseBuilder.success(result, { requestId, meta: { verdict: result.verdict } }),
    {
      headers: { 'Cache-Control': CACHE_PRESETS.noStore },
    }
  );
}

async function executeDecision(input: DecisionBody, requestId: string): Promise<NextResponse> {
  const guard = await assessBasePerpGuard(input.guard, {
    fetchLiquidityEvidence: fetchBasePerpLiquidityEvidence,
  });
  const decision = await createBasePerpGuardDecision(guard, input.transaction);
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
 * use the registered x402 resource, verify before the assessment, and settle
 * only after this read-only guard produces a complete result.
 */
export const GET = (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = x402ConfigForPaymentScope(getX402Config(), X402_PAYMENT_SCOPE.base);
  if (config && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(request, config, async (requestId) => {
      const parsed = QuerySchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams.entries())
      );
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid Base Perp Guard query parameters', {
            requestId,
            details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
          }),
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
 * Exact-call mode. The signed decision commits to the full PerpsMarketProxy
 * commitOrder calldata, sender, nonce and zero transaction value. It still is
 * not an authorization and must be bound to a user authorization (for example
 * via PriorSeal).
 */
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = x402ConfigForPaymentScope(getX402Config(), X402_PAYMENT_SCOPE.base);
  if (config && (isPaidRequest(request) || !hasAuthCredentials(request))) {
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
          ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid Base Perp Guard exact-call body', {
            requestId,
            details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
          }),
          { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
        );
      }
      return executeDecision(parsed.data, requestId);
    });
  }
  return legacyPost(request, routeContext);
};
