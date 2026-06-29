import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { ORACLE_CACHE_TTL } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import {
  calculateAllWrappedAssetSnapshots,
  calculateWrappedAssetSnapshot,
} from '@/lib/wrapped-assets/monitor';

const logger = createLogger('api-wrapped-assets');

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    try {
      if (symbol) {
        const snapshot = await calculateWrappedAssetSnapshot(symbol);
        return NextResponse.json({
          success: true,
          data: snapshot,
        });
      }

      const snapshots = await calculateAllWrappedAssetSnapshots();
      const maxAge = ORACLE_CACHE_TTL.PRICE / 1000;

      return createCachedJsonResponse(
        {
          success: true,
          data: snapshots,
        },
        {
          header: `public, s-maxage=${maxAge}, stale-while-revalidate=30`,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(
        'Wrapped asset calculation failed',
        error instanceof Error ? error : new Error(message)
      );
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CALCULATION_ERROR', message },
        },
        { status: 500 }
      );
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
      cors: true,
    },
  }
);
