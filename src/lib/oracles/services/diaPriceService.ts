import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { CACHE_TTL } from '../diaUtils';

import type { CacheEntry } from '../base';

const logger = createLogger('DIAPriceService');

const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 60000;

export class DIAPriceService {
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private cache: Map<string, CacheEntry<unknown>>) {
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    if (typeof window === 'undefined' && !this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => this.cleanupCache(), CLEANUP_INTERVAL);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (this.cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const toDelete = entries.slice(0, this.cache.size - MAX_CACHE_SIZE);
      for (const [key] of toDelete) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup completed, removed ${cleaned} entries`);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  async getAssetPrice(
    symbol: string,
    chain?: Blockchain,
    signal?: AbortSignal
  ): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}:${chain || 'default'}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      logger.debug('Returning cached price', { symbol, chain });
      return cached;
    }

    if (signal?.aborted) {
      logger.debug('Request aborted before fetch', { symbol });
      return null;
    }

    try {
      logger.info('Delegating to Binance API for price', { symbol, chain });

      const marketData = await binanceMarketService.getTokenMarketData(symbol);

      if (!marketData) {
        logger.warn('Binance API returned no data for symbol', { symbol, chain });
        return null;
      }

      const result: PriceData = {
        provider: OracleProvider.DIA,
        symbol: symbol.toUpperCase(),
        price: marketData.currentPrice,
        timestamp: new Date(marketData.lastUpdated).getTime(),
        decimals: 8,
        confidence: 0.95,
        change24h: marketData.priceChange24h,
        change24hPercent: marketData.priceChangePercentage24h,
        chain,
        source: 'binance-api',
      };

      this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      return result;
    } catch (error) {
      logger.error(
        'Failed to get asset price from Binance API',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain }
      );
      return null;
    }
  }

  async getForexRate(symbol: string): Promise<PriceData | null> {
    logger.warn('Forex rate fetching is not supported via Binance API', { symbol });
    return null;
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    periodHours: number = 24
  ): Promise<PriceData[]> {
    const cacheKey = `historical:${symbol}:${chain || 'default'}:${periodHours}`;
    const cached = this.getFromCache<PriceData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      logger.info('Delegating to Binance API for historical prices', {
        symbol,
        chain,
        periodHours,
      });

      const historicalPrices = await binanceMarketService.getHistoricalPricesByHours(
        symbol,
        periodHours
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        logger.warn('No historical data available from Binance API', {
          symbol,
          chain,
          periodHours,
        });
        return [];
      }

      const latestPrice = historicalPrices[historicalPrices.length - 1].price;

      const prices: PriceData[] = historicalPrices.map((point) => {
        const change24h = latestPrice - point.price;
        const change24hPercent = point.price > 0 ? (change24h / point.price) * 100 : 0;

        return {
          provider: OracleProvider.DIA,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          chain,
          source: 'binance-api',
        };
      });

      this.setCache(cacheKey, prices, CACHE_TTL.HISTORICAL);
      return prices;
    } catch (error) {
      logger.error(
        'Failed to fetch historical prices from Binance API',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain, periodHours }
      );
      return [];
    }
  }
}
