import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getSolanaJupiterRouteSnapshot } from '@/lib/dex/solanaJupiterRoute';

export const OPTIONS = createOptionsHandler();

/**
 * Fresh Jupiter SOL/USDC route evidence bound to a Solana-mainnet RPC witness.
 * It quotes, but does not execute or simulate, an end-user transaction.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      const snapshot = await getSolanaJupiterRouteSnapshot();
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'Jupiter route evidence is an aggregator quote, not a block-pinned read of one Solana pool.',
              'A quote is not a transaction simulation or a guarantee that a later signed swap will land.',
              'Use Insight’s signed Solana simulation receipt to bind an exact prepared transaction before authorization.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'DEX_ROUTE_UNAVAILABLE',
          'Fresh Solana route evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
