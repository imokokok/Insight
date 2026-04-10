import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-prices');

const SUPPORTED_ASSETS = [
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
];

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

// USDT 的价格固定为 1.0
const FIXED_PRICES: Record<string, number> = {
  USDT: 1.0,
};

interface CacheEntry {
  prices: Record<string, number>;
  timestamp: number;
}

const CACHE_DURATION = 60000;

let cache: CacheEntry | null = null;

async function fetchBinancePrices(): Promise<Record<string, number>> {
  const symbols = Object.values(BINANCE_SYMBOLS);

  const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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

export async function GET() {
  try {
    const now = Date.now();

    if (cache && now - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        prices: cache.prices,
        cached: true,
        timestamp: cache.timestamp,
      });
    }

    const prices = await fetchBinancePrices();

    cache = {
      prices,
      timestamp: now,
    };

    return NextResponse.json({
      prices,
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    logger.error(
      'Failed to fetch prices',
      error instanceof Error ? error : new Error(String(error))
    );

    if (cache) {
      return NextResponse.json({
        prices: cache.prices,
        cached: true,
        stale: true,
        timestamp: cache.timestamp,
      });
    }

    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
