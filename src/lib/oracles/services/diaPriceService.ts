import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { DIA_ASSET_ADDRESSES } from '../constants/assetAddresses';
import { DIA_CHAIN_MAPPING } from '../constants/chainMapping';
import {
  DIA_API_BASE_URL,
  CACHE_TTL,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  fetchWithTimeout,
} from '../diaUtils';

import type { CacheEntry } from '../base';
import type { DIAAssetQuotation } from '../diaTypes';

const logger = createLogger('DIAPriceService');

const DIA_SYMBOL_MAPPING: Record<string, { blockchain: string; address: string }> = {
  BTC: { blockchain: 'Bitcoin', address: '0x0000000000000000000000000000000000000000' },
  ETH: { blockchain: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
};

const MAX_CACHE_SIZE = 1000;
const REQUEST_TIMEOUT = 10000;
const CLEANUP_INTERVAL = 60000;

export class DIAPriceService {
  private cleanupTimer: NodeJS.Timeout | null = null;
  private requestTimeout: number;

  constructor(
    private cache: Map<string, CacheEntry<unknown>>,
    options?: { maxCacheSize?: number; requestTimeout?: number }
  ) {
    this.requestTimeout = options?.requestTimeout ?? REQUEST_TIMEOUT;
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

  async getAssetPrice(symbol: string, chain?: Blockchain): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}:${chain || 'default'}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      logger.debug('Returning cached price', { symbol, chain });
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const upperSymbol = symbol.toUpperCase();

          let url: string;
          let fallbackUrl: string | null = null;

          if (chain && DIA_ASSET_ADDRESSES[upperSymbol]?.[chain]) {
            const address = DIA_ASSET_ADDRESSES[upperSymbol][chain];
            const blockchainName = DIA_CHAIN_MAPPING[chain];
            url = `${DIA_API_BASE_URL}/assetQuotation/${blockchainName}/${address}`;
            fallbackUrl = `${DIA_API_BASE_URL}/quotation/${upperSymbol}`;
          } else if (DIA_SYMBOL_MAPPING[upperSymbol]) {
            const { blockchain, address } = DIA_SYMBOL_MAPPING[upperSymbol];
            url = `${DIA_API_BASE_URL}/assetQuotation/${blockchain}/${address}`;
            fallbackUrl = `${DIA_API_BASE_URL}/quotation/${upperSymbol}`;
          } else {
            url = `${DIA_API_BASE_URL}/quotation/${upperSymbol}`;
          }

          logger.info('Fetching price from DIA', { symbol: upperSymbol, chain, url });

          try {
            const data = await fetchWithTimeout<DIAAssetQuotation | null>(url, {
              timeout: this.requestTimeout,
            });

            if (!data) {
              if (fallbackUrl) {
                logger.info('Primary DIA URL failed, trying fallback', {
                  symbol: upperSymbol,
                  fallbackUrl,
                });
                const fallbackData = await fetchWithTimeout<DIAAssetQuotation | null>(fallbackUrl, {
                  timeout: this.requestTimeout,
                });
                if (!fallbackData) {
                  logger.warn('Asset not found in DIA (fallback)', { symbol, chain, fallbackUrl });
                  return null;
                }
                logger.info('DIA API data received (fallback)', {
                  symbol: upperSymbol,
                  price: fallbackData.Price,
                });
                return this.parseAssetQuotation(fallbackData, chain);
              }
              logger.warn('Asset not found in DIA', { symbol, chain, url });
              return null;
            }

            logger.info('DIA API data received', { symbol: upperSymbol, price: data.Price });
            return this.parseAssetQuotation(data, chain);
          } catch (fetchError) {
            if (fallbackUrl) {
              try {
                logger.info('Primary DIA URL error, trying fallback', {
                  symbol: upperSymbol,
                  fallbackUrl,
                });
                const fallbackData = await fetchWithTimeout<DIAAssetQuotation | null>(fallbackUrl, {
                  timeout: this.requestTimeout,
                });
                if (fallbackData) {
                  logger.info('DIA API data received (fallback after error)', {
                    symbol: upperSymbol,
                    price: fallbackData.Price,
                  });
                  return this.parseAssetQuotation(fallbackData, chain);
                }
              } catch (fallbackError) {
                logger.error(
                  'DIA fallback fetch error',
                  fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
                  { symbol, chain, fallbackUrl }
                );
              }
            }
            logger.error(
              'DIA fetch error',
              fetchError instanceof Error ? fetchError : new Error(String(fetchError)),
              { symbol, chain, url }
            );
            throw fetchError;
          }
        },
        DEFAULT_RETRY_CONFIG,
        'getAssetPrice'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get asset price',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain }
      );
      return null;
    }
  }

  async getForexRate(symbol: string): Promise<PriceData | null> {
    const cacheKey = `forex:${symbol}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/quotation/${symbol.toUpperCase()}`;
          const data = await fetchWithTimeout<{
            Symbol: string;
            Price: number;
            Time: string;
          } | null>(url, { timeout: this.requestTimeout });

          if (!data) return null;
          return this.parseForexQuotation(data);
        },
        DEFAULT_RETRY_CONFIG,
        'getForexRate'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get forex rate',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
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
      const upperSymbol = symbol.toUpperCase();

      let url: string;

      if (DIA_SYMBOL_MAPPING[upperSymbol]) {
        const { blockchain, address } = DIA_SYMBOL_MAPPING[upperSymbol];
        url = `${DIA_API_BASE_URL}/historical/${blockchain}/${address}?timeRange=${periodHours}h`;
      } else if (chain && DIA_ASSET_ADDRESSES[upperSymbol]?.[chain]) {
        const address = DIA_ASSET_ADDRESSES[upperSymbol][chain];
        const blockchainName = DIA_CHAIN_MAPPING[chain];
        url = `${DIA_API_BASE_URL}/historical/${blockchainName}/${address}?timeRange=${periodHours}h`;
      } else {
        logger.warn('Cannot build historical URL for asset', { symbol, chain });
        return [];
      }

      logger.info('Fetching historical prices from DIA', { symbol: upperSymbol, chain, url });

      try {
        const data = await fetchWithTimeout<Array<{ Price: number; Time: string }> | null>(url, {
          timeout: this.requestTimeout,
        });

        if (Array.isArray(data) && data.length > 0) {
          const prices: PriceData[] = data.map((item) => ({
            provider: OracleProvider.DIA,
            symbol: upperSymbol,
            price: item.Price,
            timestamp: new Date(item.Time).getTime(),
            decimals: 8,
            confidence: 0.98,
            chain,
          }));

          this.setCache(cacheKey, prices, CACHE_TTL.HISTORICAL);
          return prices;
        }

        logger.warn('Historical data not available from DIA API', { symbol, chain });
        return [];
      } catch (fetchError) {
        logger.error(
          'DIA historical fetch error',
          fetchError instanceof Error ? fetchError : new Error(String(fetchError)),
          { symbol, chain, url }
        );
        return [];
      }
    } catch (error) {
      logger.error(
        'Failed to fetch historical prices from DIA API',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain, periodHours }
      );
      return [];
    }
  }

  private parseAssetQuotation(data: DIAAssetQuotation, chain?: Blockchain): PriceData {
    const price = data.Price;
    const priceYesterday = data.PriceYesterday || price;
    const change24h = price - priceYesterday;
    const change24hPercent = priceYesterday > 0 ? (change24h / priceYesterday) * 100 : 0;

    return {
      provider: OracleProvider.DIA,
      symbol: data.Symbol,
      price,
      timestamp: new Date(data.Time).getTime(),
      decimals: 8,
      confidence: 0.98,
      change24h,
      change24hPercent,
      chain,
      source: data.Source,
    };
  }

  private parseForexQuotation(data: { Symbol: string; Price: number; Time: string }): PriceData {
    return {
      provider: OracleProvider.DIA,
      symbol: data.Symbol,
      price: data.Price,
      timestamp: new Date(data.Time).getTime(),
      decimals: 6,
      confidence: 0.99,
      change24h: 0,
      change24hPercent: 0,
    };
  }
}
