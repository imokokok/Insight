import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getBaseDexVenueSnapshot } from '@/lib/dex/baseDexVenues';

export const OPTIONS = createOptionsHandler();

/**
 * Pinned deployment identity across Insight's reviewed Base DEX catalog. It is
 * deliberately separate from a price oracle and from per-pool execution.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    try {
      const snapshot = await getBaseDexVenueSnapshot();
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'Deployment identity proves public contract bytecode at one Base block, not liquidity, a fair price, a security audit, or a transaction outcome.',
              'Only venues and pools with separately reviewed profile-specific adapters can prepare unsigned calldata. Hook/plugin/dynamic-fee venues fail closed by default.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'BASE_DEX_VENUE_INTEGRATIONS_UNAVAILABLE',
          'Fresh Base DEX deployment-identity evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
