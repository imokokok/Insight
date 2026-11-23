import { NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import {
  PolymarketGuardInputSchema,
  assessPolymarketGuard,
  type PolymarketGuardInput,
} from '@/lib/prediction/polymarketGuard';
import { attestPolymarketGuardResult } from '@/lib/prediction/polymarketGuardAttestation';

export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

const handler = createApiHandler(
  async (_request, context) => {
    const input = context.validated!.query as PolymarketGuardInput;
    const guard = await assessPolymarketGuard(input);
    const decision = await attestPolymarketGuardResult(guard);
    if (!decision) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'ATTESTATION_UNAVAILABLE',
          'A published Polymarket Guard attester is unavailable.',
          {
            requestId: context.requestId,
          }
        ),
        { status: 503, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
      );
    }
    return NextResponse.json(
      ApiResponseBuilder.success(decision, {
        requestId: context.requestId,
        meta: { verdict: guard.verdict },
      }),
      { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  },
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { query: PolymarketGuardInputSchema } }
);

export const GET = handler;
