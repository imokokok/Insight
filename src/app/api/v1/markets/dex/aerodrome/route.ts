import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getAerodromeSlipstreamMarketSnapshot } from '@/lib/dex/aerodromeSlipstream';

export const OPTIONS = createOptionsHandler();

/**
 * Block-pinned Base market evidence from the reviewed Aerodrome Slipstream
 * WETH/USDC CL100 pool. It is route context, not an oracle-consensus input.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      const snapshot = await getAerodromeSlipstreamMarketSnapshot();
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.',
              'activeLiquidityRaw is Slipstream in-range liquidity; it is not token reserve TVL.',
              'feePips is the pool fee read at the pinned block and can change with Aerodrome fee configuration.',
              'This endpoint reports one reviewed WETH/USDC CL100 pool, not every Aerodrome or Base route.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'AERODROME_SLIPSTREAM_MARKET_UNAVAILABLE',
          'Fresh Aerodrome Slipstream market evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
