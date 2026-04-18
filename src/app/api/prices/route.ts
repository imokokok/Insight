import { type NextRequest, NextResponse } from 'next/server';

import { apiRateLimit, withRateLimitHeaders } from '@/lib/api/middleware/rateLimitMiddleware';
import { ApiResponseBuilder } from '@/lib/api/response';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-prices');

const PRICE_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'AVAX',
  'BNB',
  'MATIC',
  'ARB',
  'OP',
  'UNI',
  'AAVE',
  'LINK',
  'USDC',
  'DAI',
] as const;

const FIXED_PRICES: Record<string, number> = {
  USDT: 1.0,
};

interface CacheEntry {
  prices: Record<string, number>;
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

async function fetchBinancePrices(): Promise<Record<string, number>> {
  const results = await binanceMarketService.getMultipleTokensMarketData([...PRICE_SYMBOLS]);

  const prices: Record<string, number> = { ...FIXED_PRICES };

  for (const tokenData of results) {
    if (tokenData.currentPrice > 0) {
      prices[tokenData.symbol] = tokenData.currentPrice;
    }
  }

  return prices;
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await apiRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const now = Date.now();

    if (cache.data && now - cache.data.timestamp < CACHE_DURATION) {
      const response = NextResponse.json({
        prices: cache.data.prices,
        cached: true,
        timestamp: cache.data.timestamp,
      });
      return withRateLimitHeaders(
        response,
        100,
        rateLimitResult.remaining,
        rateLimitResult.resetTime
      );
    }

    if (cache.lock) {
      await cache.lock;
      const nowAfterLock = Date.now();
      if (cache.data && nowAfterLock - cache.data.timestamp < CACHE_DURATION) {
        const response = NextResponse.json({
          prices: cache.data.prices,
          cached: true,
          timestamp: cache.data.timestamp,
        });
        return withRateLimitHeaders(
          response,
          100,
          rateLimitResult.remaining,
          rateLimitResult.resetTime
        );
      }
    }

    let resolveLock: () => void;
    cache.lock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    try {
      const prices = await fetchBinancePrices();

      cache.data = {
        prices,
        timestamp: now,
      };

      const response = NextResponse.json({
        prices,
        cached: false,
        timestamp: now,
      });
      return withRateLimitHeaders(
        response,
        100,
        rateLimitResult.remaining,
        rateLimitResult.resetTime
      );
    } finally {
      resolveLock!();
      cache.lock = null;
    }
  } catch (error) {
    logger.error(
      'Failed to fetch prices',
      error instanceof Error ? error : new Error(String(error))
    );

    if (cache.data) {
      const response = NextResponse.json({
        prices: cache.data.prices,
        cached: true,
        stale: true,
        timestamp: cache.data.timestamp,
      });
      return withRateLimitHeaders(
        response,
        100,
        rateLimitResult.remaining,
        rateLimitResult.resetTime
      );
    }

    return ApiResponseBuilder.serverError('Failed to fetch prices');
  }
}
