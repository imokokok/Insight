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
import { attestPolymarketMarketAssessment } from '@/lib/prediction/polymarketGuardAttestation';
import {
  assessPolymarketMarket,
  PolymarketAssessmentInputSchema,
} from '@/lib/prediction/polymarketV2/market';
import {
  assessPredictionGuard,
  PredictionGuardInputSchema,
  type PredictionGuardInput,
} from '@/lib/prediction/predictionGuard';

/** The guard performs one live public venue metadata read. */
export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

const QuerySchema = PredictionGuardInputSchema;

type GuardQuery = PredictionGuardInput;

async function executeGuard(input: GuardQuery, requestId: string): Promise<NextResponse> {
  const result = await assessPredictionGuard(input);
  return NextResponse.json(
    ApiResponseBuilder.success(result, { requestId, meta: { verdict: result.verdict } }),
    {
      headers: { 'Cache-Control': CACHE_PRESETS.noStore },
    }
  );
}

const legacyGet = createApiHandler(
  async (_request, context) =>
    executeGuard(context.validated!.query as GuardQuery, context.requestId),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { query: QuerySchema } }
);

async function executeMarketAssessment(
  input: ReturnType<typeof PolymarketAssessmentInputSchema.parse>,
  requestId: string
): Promise<NextResponse> {
  const assessment = await assessPolymarketMarket(input);
  const attestation = await attestPolymarketMarketAssessment(assessment);
  return NextResponse.json(
    ApiResponseBuilder.success(
      { assessment, attestation },
      {
        requestId,
        meta: {
          verdict: assessment.verdict,
          attested: attestation !== null,
          execution: 'not_performed',
        },
      }
    ),
    { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
}

const legacyPost = createApiHandler(
  async (_request, context) =>
    executeMarketAssessment(
      context.validated!.body as ReturnType<typeof PolymarketAssessmentInputSchema.parse>,
      context.requestId
    ),
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: PolymarketAssessmentInputSchema } }
);

/**
 * API-key callers retain the standard v1 middleware path. Keyless requests
 * use the registered x402 resource. Prediction-market assessment is
 * chain-neutral (no execution authority), so it quotes the merchant-configured
 * payment rail rather than a chain-bound realm.
 */
export const GET = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.configured,
  source: 'query',
  schema: QuerySchema,
  inputLabel: 'Prediction Guard query parameters',
  execute: executeGuard,
  fallback: legacyGet,
});

/** General binary-market assessment shares the configured x402 rail. */
export const POST = createPaidRouteMethod({
  scope: X402_PAYMENT_SCOPE.configured,
  source: 'body',
  schema: PolymarketAssessmentInputSchema,
  inputLabel: 'Polymarket market assessment body',
  bodyParseError: 'Expected a JSON marketId/outcome body',
  execute: executeMarketAssessment,
  fallback: legacyPost,
});
