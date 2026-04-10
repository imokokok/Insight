import { NextResponse } from 'next/server';

import {
  coinGeckoMarketService,
  binanceMarketService,
  type TokenMarketData,
} from '@/lib/services/marketData';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketDataAPI');

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const CACHE_DURATION = 60000;
const cache: Map<string, CacheEntry> = new Map();

const MAX_SYMBOL_LENGTH = 20;
const MAX_SYMBOLS_BATCH = 50;
const VALID_TYPES = ['market', 'historical', 'ohlc'] as const;
const MAX_DAYS = 365;

function validateSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  if (symbol.length > MAX_SYMBOL_LENGTH) return false;
  if (!/^[A-Za-z0-9\-]+$/.test(symbol)) return false;
  return true;
}

function sanitizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().slice(0, MAX_SYMBOL_LENGTH);
}

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data as T;
  }
  return null;
}

function setCachedData(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolRaw = searchParams.get('symbol');
    const typeRaw = searchParams.get('type') || 'market';
    const daysRaw = searchParams.get('days') || '30';
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!symbolRaw) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    if (!validateSymbol(symbolRaw)) {
      return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 });
    }

    const symbol = sanitizeSymbol(symbolRaw);

    if (!VALID_TYPES.includes(typeRaw as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    const type = typeRaw as (typeof VALID_TYPES)[number];

    const daysNum = parseInt(daysRaw, 10);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > MAX_DAYS) {
      return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 });
    }

    const cacheKey = `${type}-${symbol}-${daysNum}`;

    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
          timestamp: Date.now(),
        });
      }
    }

    let data: unknown;
    let source: string;

    switch (type) {
      case 'market': {
        const marketData = await coinGeckoMarketService.getTokenMarketData(symbol);
        if (marketData && marketData.marketCap !== null && marketData.marketCap > 0) {
          data = marketData;
          source = 'coingecko';
        } else {
          data = await binanceMarketService.getTokenMarketData(symbol);
          source = 'binance';
        }
        break;
      }

      case 'historical': {
        const historicalData = await coinGeckoMarketService.getHistoricalPrices(symbol, daysNum);
        if (historicalData && historicalData.length > 0) {
          data = historicalData;
          source = 'coingecko';
        } else {
          data = await binanceMarketService.getHistoricalPrices(symbol, daysNum);
          source = 'binance';
        }
        break;
      }

      case 'ohlc': {
        const ohlcData = await coinGeckoMarketService.getOHLCData(symbol, daysNum);
        if (ohlcData && ohlcData.length > 0) {
          data = ohlcData;
          source = 'coingecko';
        } else {
          data = await binanceMarketService.getOHLCData(symbol, daysNum);
          source = 'binance';
        }
        break;
      }
    }

    if (!data) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    setCachedData(cacheKey, data);

    return NextResponse.json({
      success: true,
      data,
      source,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error(
      'Market data API error:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { symbols, type = 'market' } = body as Record<string, unknown>;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400 });
    }

    if (symbols.length > MAX_SYMBOLS_BATCH) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SYMBOLS_BATCH} symbols allowed` },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    const validSymbols: string[] = [];
    for (const s of symbols) {
      if (typeof s === 'string' && validateSymbol(s)) {
        validSymbols.push(sanitizeSymbol(s));
      }
    }

    if (validSymbols.length === 0) {
      return NextResponse.json({ error: 'No valid symbols provided' }, { status: 400 });
    }

    const results: Array<{
      symbol: string;
      data: unknown;
      source: string;
      error?: string;
    }> = [];

    if (type === 'market') {
      try {
        const batchData = await coinGeckoMarketService.getMultipleTokensMarketData(validSymbols);
        const foundSymbols = new Set(batchData.map((d: TokenMarketData) => d.symbol.toUpperCase()));

        for (const data of batchData) {
          results.push({
            symbol: data.symbol,
            data,
            source: 'coingecko',
          });
        }

        const missingSymbols = validSymbols.filter((s) => !foundSymbols.has(s));
        for (const symbol of missingSymbols) {
          try {
            const data = await binanceMarketService.getTokenMarketData(symbol);
            results.push({
              symbol,
              data,
              source: data ? 'binance' : 'none',
            });
          } catch {
            results.push({
              symbol,
              data: null,
              source: 'error',
              error: 'Failed to fetch data',
            });
          }
        }
      } catch {
        for (const symbol of validSymbols) {
          try {
            const data = await binanceMarketService.getTokenMarketData(symbol);
            results.push({
              symbol,
              data,
              source: data ? 'binance' : 'none',
            });
          } catch {
            results.push({
              symbol,
              data: null,
              source: 'error',
              error: 'Failed to fetch data',
            });
          }
        }
      }
    } else {
      for (const symbol of validSymbols) {
        try {
          let data: unknown;
          let source: string;

          if (type === 'historical') {
            const historicalData = await coinGeckoMarketService.getHistoricalPrices(symbol);
            if (historicalData && historicalData.length > 0) {
              data = historicalData;
              source = 'coingecko';
            } else {
              data = await binanceMarketService.getHistoricalPrices(symbol);
              source = 'binance';
            }
          } else if (type === 'ohlc') {
            const ohlcData = await coinGeckoMarketService.getOHLCData(symbol);
            if (ohlcData && ohlcData.length > 0) {
              data = ohlcData;
              source = 'coingecko';
            } else {
              data = await binanceMarketService.getOHLCData(symbol);
              source = 'binance';
            }
          } else {
            throw new Error('Unknown type');
          }

          results.push({
            symbol,
            data,
            source,
          });
        } catch {
          results.push({
            symbol,
            data: null,
            source: 'error',
            error: 'Failed to fetch data',
          });
        }
      }
    }

    const successCount = results.filter((r) => r.data !== null).length;

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: validSymbols.length,
        success: successCount,
        failed: validSymbols.length - successCount,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error(
      'Batch market data API error:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Failed to fetch batch market data' }, { status: 500 });
  }
}
