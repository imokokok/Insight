import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getWrappedAssetSnapshotsCached } from '@/lib/risk/pegSnapshots';
import { PEG_SNAPSHOT_TTL_SECONDS } from '@/lib/risk/snapshotFreshness';
import { createLogger } from '@/lib/utils/logger';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';
import { calculateWrappedAssetSnapshot } from '@/lib/wrapped-assets/monitor';

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
          meta: {
            asOf: new Date(snapshot.lastUpdated).toISOString(),
            cacheTtlSeconds: 0,
          },
        });
      }

      // Read through the shared Data Cache so this endpoint and the
      // `/peg-risk` page render reuse one fan-out per three-minute window. The
      // route keeps an optional-auth middleware, and the handler forces
      // `private, no-store` whenever one is present, so a CDN preset here would
      // be silently overwritten — the Data Cache is the layer that actually
      // carries the reads.
      const cached = await getWrappedAssetSnapshotsCached();

      return createCachedJsonResponse(
        {
          success: true,
          data: cached.snapshots,
          meta: {
            asOf: cached.asOf,
            cacheTtlSeconds: PEG_SNAPSHOT_TTL_SECONDS,
          },
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
