import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getStablecoinSnapshotsCached } from '@/lib/risk/pegSnapshots';
import { PEG_SNAPSHOT_TTL_SECONDS } from '@/lib/risk/snapshotFreshness';
import { STABLECOINS } from '@/lib/stablecoins/config';
import type { StablecoinSymbol } from '@/lib/stablecoins/config';
import { calculateStablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-stablecoin-depeg');

const STABLECOIN_SYMBOLS = STABLECOINS.map((c) => c.symbol) as [string, ...string[]];

const StablecoinQuerySchema = z.object({
  symbol: z
    .string()
    .refine(
      (val) => STABLECOIN_SYMBOLS.includes(val),
      `Invalid stablecoin symbol. Supported: ${STABLECOIN_SYMBOLS.join(', ')}`
    )
    .optional(),
});

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get('symbol');

    if (rawSymbol) {
      const validation = StablecoinQuerySchema.safeParse({ symbol: rawSymbol });
      if (!validation.success) {
        const message = validation.error.issues[0]?.message ?? 'Invalid symbol';
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message } },
          { status: 400 }
        );
      }
    }

    const symbol = (rawSymbol ?? null) as StablecoinSymbol | null;

    try {
      if (symbol) {
        const snapshot = await calculateStablecoinDepegSnapshot(symbol);
        return NextResponse.json({
          success: true,
          data: snapshot,
          meta: {
            asOf: new Date(snapshot.lastUpdated).toISOString(),
            cacheTtlSeconds: 0,
          },
        });
      }

      const cached = await getStablecoinSnapshotsCached();

      return createCachedJsonResponse(
        {
          success: true,
          data: cached.snapshots,
          meta: {
            // The handler forces `private, no-store` on this authenticated
            // route, so the CDN layer never applies. The freshness here is the
            // shared Data Cache TTL; `asOf` on a repeated read stays put while
            // the entry is alive.
            asOf: cached.asOf,
            cacheTtlSeconds: PEG_SNAPSHOT_TTL_SECONDS,
          },
        },
        { preset: 'realtime' }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(
        'Stablecoin depeg calculation failed',
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
      // This route exposes deep-analysis data (stablecoin depeg) that
      // /api/v1/stablecoins/depeg serves through the credit-quota middleware.
      // Keep it open for the app's own UI — the internal-cookie path skips
      // auth via skipInternalAuthAndRateLimit below — but require external
      // callers to authenticate with an API key and bill them identically to
      // the v1 endpoint. Without this, anonymous scrapers could fetch for
      // free the same data the v1 API charges for.
      auth: { required: true, allowApiKey: true },
      rateLimit: { preset: 'api' },
      quota: true,
      cors: true,
    },
    skipInternalAuthAndRateLimit: true,
  }
);
