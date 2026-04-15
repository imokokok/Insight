import { createLogger } from '@/lib/utils/logger';

import {
  SUPRA_DORA_REST_URL,
  SUPRA_KLINE_REST_URL,
  SUPRA_CACHE_TTL,
  SUPRA_PAIR_INDEX_MAP,
  SUPRA_INDEX_TO_SYMBOL,
} from '../constants/supraConstants';

import type { OracleCacheEntry } from '../base';
import type SupraOracleClient from 'supra-oracle-sdk';

const logger = createLogger('SupraDataService');

const REQUEST_TIMEOUT = 15000;

export interface SupraOraclePriceFeed {
  pairIndex: string;
  price: string;
  decimals: string;
  timestamp: string;
}

export interface SupraLatestPriceData {
  price: number;
  pairIndex: number;
  decimals: number;
  timestamp: number;
  symbol: string;
}

export interface SupraOHLCDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class SupraApiError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SupraApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class SupraDataService {
  private cache: Map<string, OracleCacheEntry<unknown>> = new Map();
  private static instance: SupraDataService | null = null;
  private oracleClient: SupraOracleClient | null = null;

  private constructor() {
    logger.info('SupraDataService initialized', { doraUrl: SUPRA_DORA_REST_URL });
  }

  static getInstance(): SupraDataService {
    if (!SupraDataService.instance) {
      SupraDataService.instance = new SupraDataService();
    }
    return SupraDataService.instance;
  }

  private async getOracleClient(): Promise<SupraOracleClient> {
    if (!this.oracleClient) {
      const SupraOracleClient = (await import('supra-oracle-sdk')).default;
      this.oracleClient = new SupraOracleClient({
        restAddress: SUPRA_DORA_REST_URL,
        chainType: 'evm',
      });
    }
    return this.oracleClient;
  }

  getPairIndex(symbol: string): number | null {
    return SUPRA_PAIR_INDEX_MAP[symbol.toUpperCase()] ?? null;
  }

  getSymbolFromIndex(index: number): string | null {
    return SUPRA_INDEX_TO_SYMBOL[index] ?? null;
  }

  async fetchLatestPrices(
    pairIndexes: number[],
    signal?: AbortSignal
  ): Promise<SupraLatestPriceData[]> {
    const cacheKey = `dora:latest:${pairIndexes.sort().join(',')}`;
    const cached = this.getFromCache<SupraLatestPriceData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const client = await this.getOracleClient();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

      const racePromise = client.getOracleData(pairIndexes);
      const abortPromise = new Promise<never>((_, reject) => {
        combinedSignal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new SupraApiError('Request aborted or timed out', 'TIMEOUT_ERROR'));
        });
      });

      const oracleData: SupraOraclePriceFeed[] = await Promise.race([racePromise, abortPromise]);
      clearTimeout(timeoutId);

      if (!oracleData || !Array.isArray(oracleData) || oracleData.length === 0) {
        throw new SupraApiError('No price data returned from Supra DORA', 'NO_DATA');
      }

      const results: SupraLatestPriceData[] = oracleData
        .map((feed) => {
          const pairIndex = parseInt(feed.pairIndex, 10);
          const symbol = SUPRA_INDEX_TO_SYMBOL[pairIndex] || `UNKNOWN_${pairIndex}`;
          const decimals = parseInt(feed.decimals, 10);
          const rawPrice = BigInt(feed.price);
          const price = Number(rawPrice) / Math.pow(10, decimals);

          return {
            price,
            pairIndex,
            decimals,
            timestamp: parseInt(feed.timestamp, 10),
            symbol,
          };
        })
        .filter((item) => !isNaN(item.price) && item.price > 0);

      if (results.length === 0) {
        throw new SupraApiError('All price data invalid from Supra DORA', 'INVALID_DATA');
      }

      this.setCache(cacheKey, results, SUPRA_CACHE_TTL.PRICE);
      return results;
    } catch (error) {
      if (error instanceof SupraApiError) {
        throw error;
      }
      throw new SupraApiError(
        `Failed to fetch prices from DORA: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_ERROR',
        undefined,
        { pairIndexes }
      );
    }
  }

  async fetchLatestPrice(symbol: string, signal?: AbortSignal): Promise<SupraLatestPriceData> {
    const pairIndex = this.getPairIndex(symbol);
    if (pairIndex === null) {
      throw new SupraApiError(
        `Symbol '${symbol}' not found in Supra pair index map`,
        'SYMBOL_NOT_FOUND'
      );
    }

    const results = await this.fetchLatestPrices([pairIndex], signal);
    const result = results.find((r) => r.pairIndex === pairIndex);

    if (!result) {
      throw new SupraApiError(`No price data for ${symbol} (index ${pairIndex})`, 'NO_DATA');
    }

    return result;
  }

  async fetchHistoricalPrices(
    tradingPair: string,
    startDate: number,
    endDate: number,
    interval: number,
    signal?: AbortSignal
  ): Promise<SupraOHLCDataPoint[]> {
    const cacheKey = `history:${tradingPair}:${startDate}:${endDate}:${interval}`;
    const cached = this.getFromCache<SupraOHLCDataPoint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${SUPRA_KLINE_REST_URL}/history?trading_pair=${tradingPair}&startDate=${startDate}&endDate=${endDate}&interval=${interval}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-api-key': process.env.SUPRA_API_KEY || '',
        },
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`Supra Kline API returned HTTP ${response.status}, returning empty history`);
        return [];
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        return [];
      }

      const result: SupraOHLCDataPoint[] = data.data.map((point: SupraOHLCDataPoint) => ({
        timestamp: point.timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      }));

      this.setCache(cacheKey, result, SUPRA_CACHE_TTL.HISTORY);
      return result;
    } catch (error) {
      logger.warn(
        `Supra Kline API error: ${error instanceof Error ? error.message : 'Unknown'}, returning empty history`
      );
      return [];
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
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

export function getSupraDataService(): SupraDataService {
  return SupraDataService.getInstance();
}

export function resetSupraDataService(): void {
  const instance = SupraDataService.getInstance();
  instance.clearCache();
}
