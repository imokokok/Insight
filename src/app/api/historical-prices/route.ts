import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-historical-prices');

/**
 * Historical prices API - DEPRECATED
 * This endpoint is no longer used by the price-query page.
 * It now returns empty data to maintain backward compatibility
 * with other parts of the application (e.g., cross-chain feature).
 */
export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC';
    const period = parseInt(searchParams.get('period') || '24', 10);

    logger.info(`Historical prices API called for ${symbol} (${period}h) - returning empty data`);

    // Return empty data - price-query now uses deviation analysis instead
    return NextResponse.json({
      data: [],
      symbol: symbol.toUpperCase(),
      period,
      cached: false,
      timestamp: Date.now(),
      count: 0,
      message:
        'Historical prices data is no longer available. Price-query page now uses deviation analysis.',
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'api' },
    },
  }
);
