import { createLogger, normalizeError } from '@/lib/utils/logger';

import { DIA_API_BASE_URL, fetchWithTimeout } from '../diaUtils';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

import type { OracleCache } from '../base';
import type { DIASupply, DIAExchange } from '../diaTypes';

const DIA_CACHE_TTL = {
  SUPPLY: 300000,
  DIGITAL_ASSETS: 300000,
} as const;

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
      const result = await withOracleRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/supply/${symbol.toUpperCase()}`;
          return fetchWithTimeout<DIASupply | null>(url, { timeout: REQUEST_TIMEOUT });
        },
        'getSupply',
        ORACLE_RETRY_PRESETS.standard
      );

      if (result) {
        this.cache.set(cacheKey, result, DIA_CACHE_TTL.SUPPLY);
      }

      return result;
    } catch (error) {
      logger.error('Failed to get supply data', normalizeError(error), { symbol });
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
      const result = await withOracleRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/exchanges`;
          return fetchWithTimeout<DIAExchange[]>(url, { timeout: REQUEST_TIMEOUT });
        },
        'getExchanges',
        ORACLE_RETRY_PRESETS.standard
      );

      if (result) {
        this.cache.set(cacheKey, result, DIA_CACHE_TTL.DIGITAL_ASSETS);
      }

      return result || [];
    } catch (error) {
      logger.error('Failed to get exchanges', normalizeError(error));
      return [];
    }
  }
}
