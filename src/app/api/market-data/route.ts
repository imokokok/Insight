import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';
import {
  coinGeckoMarketService,
  binanceMarketService,
  type TokenMarketData,
} from '@/lib/services/marketData';

const logger = createLogger('MarketDataAPI');

// 缓存配置
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const CACHE_DURATION = 60000; // 1分钟缓存
const cache: Map<string, CacheEntry> = new Map();

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    logger.info(`Cache hit for key: ${key}`);
    return entry.data as T;
  }
  return null;
}

function setCachedData(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * 获取单个代币的市场数据
 * 优先 CoinGecko，失败时降级到 Binance
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || 'market'; // market, historical, ohlc
    const days = parseInt(searchParams.get('days') || '30', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const cacheKey = `${type}-${symbol}-${days}`;

    // 检查缓存
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
        // 优先 CoinGecko，失败时降级到 Binance
        logger.info(`Fetching market data for ${symbol} (priority: CoinGecko)`);
        const marketData = await coinGeckoMarketService.getTokenMarketData(symbol);
        if (marketData && marketData.marketCap > 0) {
          data = marketData;
          source = 'coingecko';
        } else {
          data = await binanceMarketService.getTokenMarketData(symbol);
          source = 'binance';
        }
        break;
      }

      case 'historical': {
        logger.info(`Fetching historical prices for ${symbol}, days: ${days}`);
        const historicalData = await coinGeckoMarketService.getHistoricalPrices(symbol, days);
        if (historicalData && historicalData.length > 0) {
          data = historicalData;
          source = 'coingecko';
        } else {
          data = await binanceMarketService.getHistoricalPrices(symbol, days);
          source = 'binance';
        }
        break;
      }

      case 'ohlc': {
        logger.info(`Fetching OHLC data for ${symbol}, days: ${days}`);
        const ohlcData = await coinGeckoMarketService.getOHLCData(symbol, days);
        if (ohlcData && ohlcData.length > 0) {
          data = ohlcData;
          source = 'coingecko';
        } else {
          data = await binanceMarketService.getOHLCData(symbol, days);
          source = 'binance';
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: `No data found for symbol: ${symbol}` },
        { status: 404 }
      );
    }

    // 缓存数据
    setCachedData(cacheKey, data);

    return NextResponse.json({
      success: true,
      data,
      source,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Market data API error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      {
        error: 'Failed to fetch market data',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 批量获取多个代币的市场数据
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbols, type = 'market' } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required and must not be empty' },
        { status: 400 }
      );
    }

    // 限制批量请求数量
    if (symbols.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 symbols allowed per batch request' },
        { status: 400 }
      );
    }

    logger.info(`Batch fetching ${type} data for ${symbols.length} symbols`);

    const results: Array<{
      symbol: string;
      data: unknown;
      source: string;
      error?: string;
    }> = [];

    // 对于批量市场数据，优先使用 CoinGecko 的批量端点
    if (type === 'market') {
      try {
        // 先尝试 CoinGecko 批量接口
        const batchData = await coinGeckoMarketService.getMultipleTokensMarketData(symbols);
        const foundSymbols = new Set(batchData.map((d: TokenMarketData) => d.symbol.toUpperCase()));

        // 处理成功获取的数据
        for (const data of batchData) {
          results.push({
            symbol: data.symbol,
            data,
            source: 'coingecko',
          });
        }

        // 对于 CoinGecko 未返回的数据，使用 Binance 补充
        const missingSymbols = symbols.filter((s) => !foundSymbols.has(s.toUpperCase()));
        for (const symbol of missingSymbols) {
          try {
            const data = await binanceMarketService.getTokenMarketData(symbol);
            results.push({
              symbol,
              data,
              source: data ? 'binance' : 'none',
            });
          } catch (error) {
            results.push({
              symbol,
              data: null,
              source: 'error',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } catch (error) {
        // CoinGecko 批量接口失败，逐个使用 Binance
        logger.warn('CoinGecko batch failed, falling back to individual Binance requests');
        for (const symbol of symbols) {
          try {
            const data = await binanceMarketService.getTokenMarketData(symbol);
            results.push({
              symbol,
              data,
              source: data ? 'binance' : 'none',
            });
          } catch (err) {
            results.push({
              symbol,
              data: null,
              source: 'error',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    } else {
      // 其他类型逐个获取
      for (const symbol of symbols) {
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
            throw new Error(`Unknown type: ${type}`);
          }

          results.push({
            symbol,
            data,
            source,
          });
        } catch (error) {
          results.push({
            symbol,
            data: null,
            source: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const successCount = results.filter((r) => r.data !== null).length;

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: symbols.length,
        success: successCount,
        failed: symbols.length - successCount,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error(
      'Batch market data API error:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        error: 'Failed to fetch batch market data',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
