import { NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import {
  discoverPolymarketMarkets,
  PolymarketDiscoveryInputSchema,
} from '@/lib/prediction/polymarketV2/market';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;
export const OPTIONS = createOptionsHandler();

/** Read-only discovery of active Polymarket markets. */
async function execute(
  input: ReturnType<typeof PolymarketDiscoveryInputSchema.parse>,
  requestId: string
) {
  try {
    const data = await discoverPolymarketMarkets(input);
    return NextResponse.json(ApiResponseBuilder.success(data, { requestId }), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'upstream_error';
    return NextResponse.json(ApiResponseBuilder.error('UPSTREAM_ERROR', message, { requestId }), {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const GET = createApiHandler(
  async (_request, context) =>
    execute(
      context.validated!.query as ReturnType<typeof PolymarketDiscoveryInputSchema.parse>,
      context.requestId
    ),
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: PolymarketDiscoveryInputSchema },
  }
);
