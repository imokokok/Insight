import { type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { loadSymbolsFromDatabase } from '@/lib/symbols/symbolsService';

export const OPTIONS = createOptionsHandler();

/**
 * Public v1 symbol list endpoint.
 *
 * Returns the standardized {success, data, meta} envelope. The data payload
 * matches the internal /api/symbols endpoint for consistency.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context: ApiHandlerContext) => {
    const data = await loadSymbolsFromDatabase();
    // Symbol list is DB-driven and can change when the GitHub Action sync
    // activates/deactivates feeds. Keep CDN cache aligned with the 5-minute
    // server-side symbol cache so API consumers don't see stale feeds.
    return createCachedJsonResponse(
      ApiResponseBuilder.success(data, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
    skipInternalAuthAndRateLimit: false,
  }
);
