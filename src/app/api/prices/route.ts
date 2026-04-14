import { type NextRequest, NextResponse } from 'next/server';

import { apiRateLimit, withRateLimitHeaders } from '@/lib/api/middleware/rateLimitMiddleware';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-prices');

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  AVAX: 'AVAXUSDT',
  BNB: 'BNBUSDT',
  MATIC: 'MATICUSDT',
  ARB: 'ARBUSDT',
  OP: 'OPUSDT',
  UNI: 'UNIUSDT',
  AAVE: 'AAVEUSDT',
  LINK: 'LINKUSDT',
  USDC: 'USDCUSDT',
  DAI: 'DAIUSDT',
};

const FIXED_PRICES: Record<string, number> = {
  USDT: 1.0,
};

interface CacheEntry {
  prices: Record<string, number>;
  timestamp: number;
}

const CACHE_DURATION = 60000;
const REQUEST_TIMEOUT = 10000;

const cache: {
  data: CacheEntry | null;
  lock: Promise<void> | null;
} = {
  data: null,
  lock: null,
};

async function fetchBinancePrices(): Promise<Record<string, number>> {
  const symbols = Object.values(BINANCE_SYMBOLS);

  const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Binance API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const prices: Record<string, number> = { ...FIXED_PRICES };
    const symbolToAsset = Object.fromEntries(
      Object.entries(BINANCE_SYMBOLS).map(([asset, symbol]) => [symbol, asset])
    );

    data.forEach((item: { symbol: string; price: string }) => {
      const asset = symbolToAsset[item.symbol];
      if (asset) {
        prices[asset] = parseFloat(item.price);
      }
    });

    return prices;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Binance API request timeout');
    }
    throw error;
  }
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

    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
