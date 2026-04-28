import { createLogger } from '@/lib/utils/logger';

import {
  DIA_API_BASE_URL,
  CACHE_TTL,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  fetchWithTimeout,
} from '../diaUtils';

import type { CacheEntry } from '../base';
import type { DIASupply, DIAExchange } from '../diaTypes';

const logger = createLogger('DIANetworkService');

const REQUEST_TIMEOUT = 10000;

export class DIANetworkService {
  constructor(private cache: Map<string, CacheEntry<unknown>>) {}

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
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  async getSupply(symbol: string): Promise<DIASupply | null> {
    const cacheKey = `supply:${symbol}`;
    const cached = this.getFromCache<DIASupply>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/supply/${symbol.toUpperCase()}`;
          return fetchWithTimeout<DIASupply | null>(url, { timeout: REQUEST_TIMEOUT });
        },
        DEFAULT_RETRY_CONFIG,
        'getSupply'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.SUPPLY);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get supply data',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

  async getExchanges(): Promise<DIAExchange[]> {
    const cacheKey = 'exchanges';
    const cached = this.getFromCache<DIAExchange[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/exchanges`;
          return fetchWithTimeout<DIAExchange[]>(url, { timeout: REQUEST_TIMEOUT });
        },
        DEFAULT_RETRY_CONFIG,
        'getExchanges'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.DIGITAL_ASSETS);
      }

      return result || [];
    } catch (error) {
      logger.error(
        'Failed to get exchanges',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }
}
