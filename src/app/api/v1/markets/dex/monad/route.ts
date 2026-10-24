import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getMonadUniswapV3MarketSnapshot } from '@/lib/dex/monadUniswapV3';
import { getMonadUniswapV3VolumeSummary } from '@/lib/dex/monadUniswapV3Volume';

export const OPTIONS = createOptionsHandler();

/**
 * Block-pinned Monad DEX market evidence. This endpoint is intentionally not
 * part of `/prices/consensus`: it exposes executable-market context for MON
 * rather than treating a single venue as an independent oracle.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      // Keep the short shared live-data cache independent of a single browser
      // disconnect. The RPC client applies its own bounded request timeout.
      const snapshot = await getMonadUniswapV3MarketSnapshot();
      const volume = await getMonadUniswapV3VolumeSummary(snapshot.block.timestamp);
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            volume,
            caveats: [
              'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.',
              'activeLiquidityRaw is Uniswap V3 in-range liquidity; it is not token reserve TVL.',
              'Rolling volume is null while the finalized Swap-event index is warming or unavailable; null never means zero.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'DEX_MARKET_UNAVAILABLE',
          'Fresh Monad DEX market evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
