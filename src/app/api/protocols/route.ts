import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getAllProtocolsWithDynamicData } from '@/lib/protocols/dynamicData';

export const OPTIONS = createOptionsHandler();

/**
 * Internal protocol list endpoint.
 *
 * Used by the safety-check UI to populate the lending-protocol selector.
 * Protected by the HttpOnly internal-token cookie so external API consumers
 * cannot bypass authentication, and rate-limiting/quota enforcement is skipped
 * for same-site page requests to avoid impacting normal project usage.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const protocols = await getAllProtocolsWithDynamicData();
    const lendingProtocols = protocols.filter((p) => p.protocolType === 'lending');

    return NextResponse.json(
      {
        success: true,
        data: lendingProtocols,
        meta: {
          timestamp: Date.now(),
          requestId: context.requestId,
        },
      },
      {
        headers: {
          'Cache-Control': CACHE_PRESETS.semiStatic,
        },
      }
    );
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
