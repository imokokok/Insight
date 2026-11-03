import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getPancakeSwapV3BaseMarketSnapshot } from '@/lib/dex/pancakeSwapV3';

export const OPTIONS = createOptionsHandler();

/**
 * Block-pinned Base market evidence from the reviewed PancakeSwap V3
 * USDC/USDT 0.01% pool. Factory, QuoterV2, and Pool runtime identities are
 * re-verified at the quoted block; it is not an oracle-consensus input.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      const snapshot = await getPancakeSwapV3BaseMarketSnapshot();
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.',
              'activeLiquidityRaw is V3 in-range liquidity; it is not token reserve TVL.',
              'This endpoint reports one code-reviewed USDC/USDT pool, not every PancakeSwap or Base route.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'PANCAKESWAP_V3_MARKET_UNAVAILABLE',
          'Fresh PancakeSwap V3 market evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
