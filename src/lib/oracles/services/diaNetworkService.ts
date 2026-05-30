import { createLogger } from '@/lib/utils/logger';

import {
  DIA_API_BASE_URL,
  CACHE_TTL,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  fetchWithTimeout,
} from '../diaUtils';

import type { OracleCache } from '../base';
import type { DIASupply, DIAExchange } from '../diaTypes';

const logger = createLogger('DIANetworkService');

const REQUEST_TIMEOUT = 10000;

export class DIANetworkService {
  constructor(private cache: OracleCache) {}

  async getSupply(symbol: string): Promise<DIASupply | null> {
    const cacheKey = `supply:${symbol}`;
    const cached = this.cache.get<DIASupply>(cacheKey);
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
        this.cache.set(cacheKey, result, CACHE_TTL.SUPPLY);
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
    const cached = this.cache.get<DIAExchange[]>(cacheKey);
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
        this.cache.set(cacheKey, result, CACHE_TTL.DIGITAL_ASSETS);
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
