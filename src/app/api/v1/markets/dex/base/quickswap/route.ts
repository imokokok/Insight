import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getQuickSwapV2BaseMarketSnapshot } from '@/lib/dex/quickSwapV2';

export const OPTIONS = createOptionsHandler();

/** Single reviewed QuickSwap V2 Base pair; no caller-controlled route inputs. */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      const snapshot = await getQuickSwapV2BaseMarketSnapshot();
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.',
              'V2 reserves and quotes describe one pinned block; they do not simulate a later signed transaction or protect against MEV.',
              'Current executionReadiness is authoritative: an insufficient-reserve result keeps transaction preparation fail-closed.',
              'Only the code-reviewed Base USDC/USDT pair is admitted; arbitrary pools, routes, and reverse direction are rejected.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'QUICKSWAP_V2_MARKET_UNAVAILABLE',
          'Fresh QuickSwap V2 Base market evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
