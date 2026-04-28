import { HermesClient } from '@pythnetwork/hermes-client';

import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';

import {
  PYTH_PRICE_FEED_IDS,
  HERMES_API_URL,
  CACHE_TTL,
  normalizeSymbol,
} from '../constants/pythConstants';

import { fetchLatestPrice, fetchHistoricalPrices } from './priceFetching';
import { PythCache } from './pythCache';

import type { PythPriceRaw } from './types';

const logger = createLogger('PythDataService');

class PythDataService {
  private hermesClient: HermesClient;
  private cache: PythCache;

  constructor(hermesEndpoint: string = HERMES_API_URL) {
    this.hermesClient = new HermesClient(hermesEndpoint);
    this.cache = new PythCache();
    logger.info('PythDataService initialized', { endpoint: hermesEndpoint });
  }

  async getLatestPrice(symbol: string, signal?: AbortSignal): Promise<PriceData | null> {
    return fetchLatestPrice(this.hermesClient, this.cache, symbol, signal);
  }

  async getHistoricalPrices(
    symbol: string,
    hours: number = 24,
    intervalMinutes: number = 60
  ): Promise<PriceData[]> {
    return fetchHistoricalPrices(this.hermesClient, this.cache, symbol, hours, intervalMinutes);
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

let pythDataServiceInstance: PythDataService | null = null;

export function getPythDataService(): PythDataService {
  if (!pythDataServiceInstance) {
    pythDataServiceInstance = new PythDataService();
  }
  return pythDataServiceInstance;
}
