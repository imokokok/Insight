import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { getDIAAssetConfig } from '../constants/diaConstants';
import { CACHE_TTL, DIA_API_BASE_URL, fetchWithTimeout } from '../diaUtils';

import type { OracleCacheEntry } from '../base';
import type { DIAAssetQuotation } from '../diaTypes';

const logger = createLogger('DIAPriceService');

const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 60000;
const REQUEST_TIMEOUT = 15000;

export class DIAPriceService {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private cache: Map<string, OracleCacheEntry<unknown>>) {
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    if (!this.cleanupTimer) {
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
    const entry = this.cache.get(key) as OracleCacheEntry<T> | undefined;
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

    const upperSymbol = symbol.toUpperCase();

    try {
      logger.info('Fetching price from DIA official API', { symbol, chain });

      const assetConfig = getDIAAssetConfig(upperSymbol);

      if (!assetConfig) {
        logger.warn('Symbol not supported by DIA oracle', { symbol });
        return null;
      }

      const url = `${DIA_API_BASE_URL}/assetQuotation/${assetConfig.blockchain}/${assetConfig.address}`;

      const quotation = await fetchWithTimeout<DIAAssetQuotation | null>(url, {
        timeout: REQUEST_TIMEOUT,
        signal,
      });

      if (!quotation || !quotation.Price) {
        logger.warn('DIA API returned no data for symbol', { symbol });
        return null;
      }

      const change24h = quotation.Price - quotation.PriceYesterday;
      const change24hPercent =
        quotation.PriceYesterday > 0 ? (change24h / quotation.PriceYesterday) * 100 : 0;

      const result: PriceData = {
        provider: OracleProvider.DIA,
        symbol: upperSymbol,
        price: quotation.Price,
        timestamp: new Date(quotation.Time).getTime(),
        decimals: 8,
        confidence: 0.95,
        change24h,
        change24hPercent,
        chain,
        source: 'dia-api',
      };

      this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      logger.info('Successfully fetched price from DIA API', {
        symbol,
        price: result.price,
        source: 'dia-api',
      });
      return result;
    } catch (error) {
      logger.error(
        'Failed to get price from DIA API',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain }
      );
      return null;
    }
  }

  async getHistoricalPrices(
    _symbol: string,
    _chain?: Blockchain,
    _periodHours: number = 24
  ): Promise<PriceData[]> {
    return [];
  }
}

const diaPriceCache = new Map<string, OracleCacheEntry<unknown>>();
export const diaPriceService = new DIAPriceService(diaPriceCache);
