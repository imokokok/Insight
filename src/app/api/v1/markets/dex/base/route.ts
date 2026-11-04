import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getBaseUniswapV3MarketSnapshot } from '@/lib/dex/baseUniswapV3';

export const OPTIONS = createOptionsHandler();

/**
 * Block-pinned Base market evidence from one reviewed Uniswap V3 WETH/USDC
 * pool. It is route context, not an independent price-oracle participant.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      const snapshot = await getBaseUniswapV3MarketSnapshot();
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.',
              'activeLiquidityRaw is Uniswap V3 in-range liquidity; it is not token reserve TVL.',
              'This endpoint reports one reviewed WETH/USDC pool, not every Base route.',
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
          'Fresh Base DEX market evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
