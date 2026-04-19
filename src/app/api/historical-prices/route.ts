import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-historical-prices');

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const CACHE_DURATION = 60000;

const cache: {
  data: CacheEntry | null;
  lock: Promise<void> | null;
} = {
  data: null,
  lock: null,
};

function getCacheKey(symbol: string, period: number): string {
  return `${symbol.toUpperCase()}_${period}`;
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC';
    const period = parseInt(searchParams.get('period') || '24', 10);

    if (!symbol) {
      return ApiResponseBuilder.badRequest('Symbol is required');
    }

    if (isNaN(period) || period <= 0 || period > 168) {
      return ApiResponseBuilder.badRequest('Period must be between 1 and 168 hours');
    }

    const cacheKey = getCacheKey(symbol, period);
    const now = Date.now();

    if (cache.data && cache.data.timestamp && now - cache.data.timestamp < CACHE_DURATION) {
      const cachedData = cache.data.data as Record<string, unknown>;
      if (cachedData && cachedData.cacheKey === cacheKey) {
        logger.info(`Returning cached historical prices for ${symbol} (${period}h)`);
        return NextResponse.json({
          data: cachedData.prices,
          symbol: symbol.toUpperCase(),
          period,
          cached: true,
          timestamp: cache.data.timestamp,
        });
      }
    }

    if (cache.lock) {
      await cache.lock;
      const nowAfterLock = Date.now();
      if (cache.data && nowAfterLock - cache.data.timestamp < CACHE_DURATION) {
        const cachedData = cache.data.data as Record<string, unknown>;
        if (cachedData && cachedData.cacheKey === cacheKey) {
          return NextResponse.json({
            data: cachedData.prices,
            symbol: symbol.toUpperCase(),
            period,
            cached: true,
            timestamp: cache.data.timestamp,
          });
        }
      }
    }

    let resolveLock: () => void;
    cache.lock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    try {
      logger.info(`Fetching historical prices for ${symbol} (${period}h)`);

      const prices = await binanceMarketService.getHistoricalPricesByHours(symbol, period);

      if (!prices || prices.length === 0) {
        logger.warn(`No historical prices found for ${symbol} (${period}h)`);
        return ApiResponseBuilder.notFound(`No historical prices found for ${symbol}`);
      }

      cache.data = {
        data: {
          cacheKey,
          prices,
        },
        timestamp: now,
      };

      logger.info(`Successfully fetched ${prices.length} historical prices for ${symbol}`);

      return NextResponse.json({
        data: prices,
        symbol: symbol.toUpperCase(),
        period,
        cached: false,
        timestamp: now,
        count: prices.length,
      });
    } catch (error) {
      logger.error(
        `Failed to fetch historical prices for ${symbol}:`,
        error instanceof Error ? error : new Error(String(error))
      );

      if (cache.data) {
        const cachedData = cache.data.data as Record<string, unknown>;
        if (cachedData && cachedData.cacheKey === cacheKey) {
          return NextResponse.json({
            data: cachedData.prices,
            symbol: symbol.toUpperCase(),
            period,
            cached: true,
            stale: true,
            timestamp: cache.data.timestamp,
          });
        }
      }

      return ApiResponseBuilder.serverError(
        `Failed to fetch historical prices: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      resolveLock!();
      cache.lock = null;
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'api' },
    },
  }
);
