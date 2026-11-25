import { NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { attestPolymarketSourceEvidence } from '@/lib/prediction/polymarketEvidenceAttestation';
import {
  collectPolymarketMarketEvidence,
  PolymarketEvidenceError,
  PolymarketEvidenceInputSchema,
} from '@/lib/prediction/polymarketV2/sourceEvidence';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;
export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler(
  async (_request, context) => {
    try {
      const evidence = await collectPolymarketMarketEvidence(
        context.validated!.body as ReturnType<typeof PolymarketEvidenceInputSchema.parse>
      );
      const attestation = await attestPolymarketSourceEvidence(evidence);
      if (!attestation) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'ATTESTATION_UNAVAILABLE',
            'Source-evidence signing is not configured',
            { requestId: context.requestId }
          ),
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      return NextResponse.json(
        ApiResponseBuilder.success(
          { evidence, attestation },
          {
            requestId: context.requestId,
            meta: { scope: 'source_evidence' },
          }
        ),
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (error) {
      const status = error instanceof PolymarketEvidenceError ? error.status : 502;
      const code = error instanceof PolymarketEvidenceError ? error.code : 'UPSTREAM_ERROR';
      const message =
        error instanceof Error ? error.message : 'Polymarket evidence collection failed';
      return NextResponse.json(
        ApiResponseBuilder.error(code, message, { requestId: context.requestId }),
        { status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: PolymarketEvidenceInputSchema },
  }
);
