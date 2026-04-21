import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';

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
  lockTimestamp: number | null;
} = {
  data: null,
  lock: null,
  lockTimestamp: null,
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

export const GET = createApiHandler(
  async (_request: NextRequest) => {
    const now = Date.now();

    if (cache.data && now - cache.data.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        prices: cache.data.prices,
        cached: true,
        timestamp: cache.data.timestamp,
      });
    }

    if (cache.lock) {
      await cache.lock;
      if (cache.data && Date.now() - cache.data.timestamp < CACHE_DURATION) {
        return NextResponse.json({
          prices: cache.data.prices,
          cached: true,
          timestamp: cache.data.timestamp,
        });
      }
    }

    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    cache.lock = lockPromise;
    cache.lockTimestamp = now;

    try {
      const prices = await fetchBinancePrices();

      cache.data = {
        prices,
        timestamp: Date.now(),
      };

      return NextResponse.json({
        prices,
        cached: false,
        timestamp: cache.data.timestamp,
      });
    } catch (error) {
      if (cache.data) {
        return NextResponse.json({
          prices: cache.data.prices,
          cached: true,
          stale: true,
          timestamp: cache.data.timestamp,
        });
      }
      throw error;
    } finally {
      resolveLock!();
      if (cache.lock === lockPromise) {
        cache.lock = null;
        cache.lockTimestamp = null;
      }
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'api' },
    },
    onError: async () => {
      if (cache.data) {
        return NextResponse.json({
          prices: cache.data.prices,
          cached: true,
          stale: true,
          timestamp: cache.data.timestamp,
        });
      }
      return ApiResponseBuilder.serverError('Failed to fetch prices');
    },
  }
);
