import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { createLogger } from '@/lib/utils/logger';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';
import {
  calculateAllWrappedAssetSnapshots,
  calculateWrappedAssetSnapshot,
} from '@/lib/wrapped-assets/monitor';

const logger = createLogger('api-wrapped-assets');

const WRAPPED_ASSET_SYMBOLS = WRAPPED_ASSETS.map((a) => a.symbol) as [string, ...string[]];

const WrappedAssetQuerySchema = z.object({
  symbol: z
    .string()
    .refine(
      (val) => WRAPPED_ASSET_SYMBOLS.includes(val),
      `Invalid wrapped asset symbol. Supported: ${WRAPPED_ASSET_SYMBOLS.join(', ')}`
    )
    .optional(),
});

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get('symbol');

    if (rawSymbol) {
      const validation = WrappedAssetQuerySchema.safeParse({ symbol: rawSymbol });
      if (!validation.success) {
        const message = validation.error.issues[0]?.message ?? 'Invalid symbol';
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message } },
          { status: 400 }
        );
      }
    }

    const symbol = rawSymbol;

    try {
      if (symbol) {
        const snapshot = await calculateWrappedAssetSnapshot(symbol);
        return NextResponse.json({
          success: true,
          data: snapshot,
        });
      }

      const snapshots = await calculateAllWrappedAssetSnapshots();

      return createCachedJsonResponse(
        {
          success: true,
          data: snapshots,
        },
        { preset: 'realtime' }
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
    skipInternalAuthAndRateLimit: true,
  }
);
