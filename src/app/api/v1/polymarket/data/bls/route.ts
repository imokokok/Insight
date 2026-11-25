import { NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import {
  fetchPolymarketBlsSeriesEvidence,
  PolymarketBlsEvidenceInputSchema,
} from '@/lib/prediction/polymarketV2/bls';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;
export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request, context) => {
    try {
      const evidence = await fetchPolymarketBlsSeriesEvidence(
        context.validated!.query as ReturnType<typeof PolymarketBlsEvidenceInputSchema.parse>
      );
      return NextResponse.json(
        ApiResponseBuilder.success(evidence, { requestId: context.requestId }),
        {
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'BLS upstream error';
      return NextResponse.json(
        ApiResponseBuilder.error('UPSTREAM_ERROR', message, { requestId: context.requestId }),
        {
          status: 502,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }
  },
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { query: PolymarketBlsEvidenceInputSchema } }
);
