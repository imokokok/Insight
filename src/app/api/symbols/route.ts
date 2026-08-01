import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { loadSymbolsFromDatabase } from '@/lib/symbols/symbolsService';

export const OPTIONS = createOptionsHandler();

/**
 * Internal symbol list endpoint.
 *
 * Returns the raw data shape directly (no {success,data,meta} wrapper) for
 * backwards compatibility with the existing Next.js UI. New external callers
 * should use /api/v1/symbols which follows the standardized API envelope.
 */
export const GET = createApiHandler(
  async (_request: NextRequest) => {
    const data = await loadSymbolsFromDatabase();
    const response = NextResponse.json(data);
    // Symbol list is DB-driven and can change when the GitHub Action sync
    // activates/deactivates feeds. Keep CDN cache aligned with the 5-minute
    // server-side symbol cache so UI/API consumers don't see stale feeds.
    response.headers.set('Cache-Control', CACHE_PRESETS.semiStatic);
    return response;
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
    skipInternalAuthAndRateLimit: true,
  }
);
