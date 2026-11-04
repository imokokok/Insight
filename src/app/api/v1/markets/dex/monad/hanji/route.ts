import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getHanjiMonadMarketSnapshot } from '@/lib/dex/hanjiMonad';

export const OPTIONS = createOptionsHandler();

/** Bounded Hanji MON/USDC CLOB context, intentionally distinct from an oracle. */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      const snapshot = await getHanjiMonadMarketSnapshot();
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'Hanji CLOB evidence is read-only venue context, not an oracle-consensus vote or venue-independent fair price.',
              'Book-impact estimates use only fresh displayed L2 levels and exclude fees, matching priority, margin, settlement, and changes after observation.',
              'Insight intentionally does not prepare a Hanji transaction until the user margin/deposit lifecycle and order settlement ABI receive a separate review.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'HANJI_MONAD_MARKET_UNAVAILABLE',
          'Fresh Hanji Monad market evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
