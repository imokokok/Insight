import { HermesClient } from '@pythnetwork/hermes-client';

import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';

import { HERMES_API_URL, HERMES_FALLBACK_URLS } from '../constants/pythConstants';

import { fetchLatestPriceDirect, fetchHistoricalPricesDirect } from './directFetch';
import { fetchLatestPrice, fetchHistoricalPrices } from './priceFetching';
import { PythCache } from './pythCache';

const logger = createLogger('PythDataService');

const HERMES_TIMEOUT_MS = 15000;

class PythDataService {
  private hermesClient: HermesClient;
  private cache: PythCache;
  private currentEndpoint: string;
  private sdkFailed: boolean = false;
  private sdkFailedTime: number = 0;
  private readonly SDK_RECOVERY_INTERVAL = 60000;

  constructor(hermesEndpoint: string = HERMES_API_URL) {
    this.currentEndpoint = hermesEndpoint;
    this.hermesClient = new HermesClient(hermesEndpoint, {
      timeout: HERMES_TIMEOUT_MS,
      httpRetries: 0,
    });
    this.cache = new PythCache();
    logger.info('PythDataService initialized', { endpoint: hermesEndpoint });
  }

  async getLatestPrice(symbol: string, signal?: AbortSignal): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.sdkFailed) {
      if (Date.now() - this.sdkFailedTime > this.SDK_RECOVERY_INTERVAL) {
        logger.info('Attempting SDK recovery after timeout', {
          elapsed: Date.now() - this.sdkFailedTime,
        });
        this.sdkFailed = false;
        this.sdkFailedTime = 0;
      } else {
        return this.directFetchLatest(symbol, cacheKey);
      }
    }

    try {
      const result = await this.withFallback(() =>
        fetchLatestPrice(this.hermesClient, this.cache, symbol, signal)
      );
      if (result) return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.warn('HermesClient SDK failed, switching to direct fetch', { error: errMsg });
      this.sdkFailed = true;
      this.sdkFailedTime = Date.now();
    }

    return this.directFetchLatest(symbol, cacheKey);
  }

  async getHistoricalPrices(
    symbol: string,
    hours: number = 24,
    intervalMinutes: number = 60
  ): Promise<PriceData[]> {
    const cacheKey = `historical:${symbol}:${hours}:${intervalMinutes}`;
    const cached = this.cache.get<PriceData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.sdkFailed) {
      if (Date.now() - this.sdkFailedTime > this.SDK_RECOVERY_INTERVAL) {
        logger.info('Attempting SDK recovery after timeout', {
          elapsed: Date.now() - this.sdkFailedTime,
        });
        this.sdkFailed = false;
        this.sdkFailedTime = 0;
      } else {
        return this.directFetchHistorical(symbol, hours, intervalMinutes, cacheKey);
      }
    }

    try {
      const result = await this.withFallback(() =>
        fetchHistoricalPrices(this.hermesClient, this.cache, symbol, hours, intervalMinutes)
      );
      if (result.length > 0) return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.warn('HermesClient SDK failed, switching to direct fetch', { error: errMsg });
      this.sdkFailed = true;
      this.sdkFailedTime = Date.now();
    }

    return this.directFetchHistorical(symbol, hours, intervalMinutes, cacheKey);
  }

  clearCache(): void {
    this.cache.clear();
    this.sdkFailed = false;
    this.sdkFailedTime = 0;
    logger.info('Cache cleared, SDK failure flag reset');
  }

  private async directFetchLatest(symbol: string, cacheKey: string): Promise<PriceData | null> {
    try {
      const result = await fetchLatestPriceDirect(symbol);
      if (result) {
        this.cache.set(cacheKey, result, 5000);
      }
      return result;
    } catch (error) {
      logger.error(
        'Direct fetch also failed',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

  private async directFetchHistorical(
    symbol: string,
    hours: number,
    intervalMinutes: number,
    cacheKey: string
  ): Promise<PriceData[]> {
    try {
      const result = await fetchHistoricalPricesDirect(symbol, hours, intervalMinutes);
      if (result.length > 0) {
        this.cache.set(cacheKey, result, 5000);
      }
      return result;
    } catch (error) {
      logger.error(
        'Direct fetch also failed',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, hours }
      );
      return [];
    }
  }

  private async withFallback<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (primaryError) {
      const errMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);

      if (
        errMsg.includes('503') ||
        errMsg.includes('502') ||
        errMsg.includes('Service Temporarily Unavailable') ||
        errMsg.includes('Bad Gateway') ||
        errMsg.includes('ECONNREFUSED') ||
        errMsg.includes('ETIMEDOUT') ||
        errMsg.includes('timeout') ||
        errMsg.includes('fetch failed')
      ) {
        logger.warn('Primary Hermes endpoint failed, trying fallbacks', {
          endpoint: this.currentEndpoint,
          error: errMsg,
        });

        for (const fallbackUrl of HERMES_FALLBACK_URLS) {
          if (fallbackUrl === this.currentEndpoint) continue;
          try {
            logger.info('Trying fallback Hermes endpoint', { endpoint: fallbackUrl });
            const fallbackClient = new HermesClient(fallbackUrl, {
              timeout: HERMES_TIMEOUT_MS,
              httpRetries: 0,
            });
            this.hermesClient = fallbackClient;
            this.currentEndpoint = fallbackUrl;
            this.cache.clear();
            const result = await operation();
            logger.info('Fallback endpoint succeeded', { endpoint: fallbackUrl });
            return result;
          } catch (fallbackError) {
            logger.warn('Fallback endpoint also failed', {
              endpoint: fallbackUrl,
              error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            });
          }
        }
      }

      throw primaryError;
    }
  }
}

let pythDataServiceInstance: PythDataService | null = null;

export function getPythDataService(): PythDataService {
  if (!pythDataServiceInstance) {
    pythDataServiceInstance = new PythDataService();
  }
  return pythDataServiceInstance;
}
