import { createLogger } from '@/lib/utils/logger';

import { OracleCache, createSingleton } from '../base';
import {
  SUPRA_DORA_REST_URL,
  SUPRA_CACHE_TTL,
  SUPRA_PAIR_INDEX_MAP,
  SUPRA_INDEX_TO_SYMBOL,
} from '../constants/supraConstants';
import { bigIntToPrice } from '../utils/oracleDataUtils';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

import type SupraOracleClient from 'supra-oracle-sdk';

const logger = createLogger('SupraDataService');

const REQUEST_TIMEOUT = 15000;

interface SupraOraclePriceFeed {
  pairIndex: string;
  price: string;
  decimals: string;
  timestamp: string;
}

interface SupraLatestPriceData {
  price: number;
  pairIndex: number;
  decimals: number;
  timestamp: number;
  symbol: string;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  change24hPercent?: number;
}

class SupraApiError extends Error {
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

class SupraDataService {
  private cache = new OracleCache();
  private oracleClient: SupraOracleClient | null = null;

  constructor() {
    logger.info('SupraDataService initialized', { doraUrl: SUPRA_DORA_REST_URL });
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

  async fetchLatestPrices(
    pairIndexes: number[],
    signal?: AbortSignal
  ): Promise<SupraLatestPriceData[]> {
    const cacheKey = `dora:latest:${pairIndexes.sort().join(',')}`;
    const cached = this.cache.get<SupraLatestPriceData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (signal?.aborted) {
      throw new SupraApiError('Request aborted before fetch', 'ABORT_ERROR');
    }

    try {
      const result = await withOracleRetry(
        async () => {
          if (signal?.aborted) {
            throw new SupraApiError('Request was aborted', 'ABORT_ERROR');
          }

          const client = await this.getOracleClient();

          const oracleDataPromise = client.getOracleData(pairIndexes);

          const timeoutPromise = new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
              reject(
                new SupraApiError(
                  `Supra DORA request timed out after ${REQUEST_TIMEOUT}ms`,
                  'TIMEOUT_ERROR'
                )
              );
            }, REQUEST_TIMEOUT);
            timeoutId.unref?.();
          });

          const abortCtx: { cleanup: (() => void) | null } = { cleanup: null };
          const abortPromise = signal
            ? new Promise<never>((_, reject) => {
                const onAbort = () =>
                  reject(new SupraApiError('Request was aborted', 'ABORT_ERROR'));
                signal.addEventListener('abort', onAbort, { once: true });
                abortCtx.cleanup = () => signal.removeEventListener('abort', onAbort);
              })
            : null;

          const racePromises = [oracleDataPromise, timeoutPromise];
          if (abortPromise) racePromises.push(abortPromise);

          try {
            const oracleData: SupraOraclePriceFeed[] = await Promise.race(racePromises);
            abortCtx.cleanup?.();

            if (!oracleData || !Array.isArray(oracleData) || oracleData.length === 0) {
              throw new SupraApiError('No price data returned from Supra DORA', 'NO_DATA');
            }

            return oracleData;
          } catch (error) {
            abortCtx.cleanup?.();
            throw error;
          }
        },
        'supra:fetchLatestPrices',
        ORACLE_RETRY_PRESETS.standard
      );

      const results: SupraLatestPriceData[] = result
        .map((feed) => {
          const pairIndex = parseInt(feed.pairIndex, 10);
          const symbol = SUPRA_INDEX_TO_SYMBOL[pairIndex] || `UNKNOWN_${pairIndex}`;
          const decimals = parseInt(feed.decimals, 10);
          const rawPrice = BigInt(feed.price);
          const price = bigIntToPrice(rawPrice, decimals);

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

      this.cache.set(cacheKey, results, SUPRA_CACHE_TTL.PRICE);
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
  ): Promise<
    { timestamp: number; open: number; high: number; low: number; close: number; volume?: number }[]
  > {
    const client = await this.getOracleClient();

    if (!client.history?.enabled || !client.history?.apiKey) {
      logger.warn('Supra historical prices require a configured history API key');
      return [];
    }

    if (signal?.aborted) {
      throw new SupraApiError('Request aborted before fetch', 'ABORT_ERROR');
    }

    const pairIndex = this.getPairIndex(tradingPair);
    if (pairIndex === null) {
      throw new SupraApiError(
        `Trading pair '${tradingPair}' not found in Supra pair index map`,
        'SYMBOL_NOT_FOUND'
      );
    }

    const cacheKey = `dora:history:${pairIndex}:${startDate}:${endDate}:${interval}`;
    const cached = this.cache.get<
      {
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume?: number;
      }[]
    >(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withOracleRetry(
        async () => {
          if (signal?.aborted) {
            throw new SupraApiError('Request was aborted', 'ABORT_ERROR');
          }

          const data = await client.getHistoricalPrices({
            pairIndex,
            startDate,
            endDate,
            interval,
          });

          if (!data || !Array.isArray(data) || data.length === 0) {
            throw new SupraApiError('No historical data returned from Supra', 'NO_DATA');
          }

          return data as {
            timestamp: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume?: number;
          }[];
        },
        'supra:fetchHistoricalPrices',
        ORACLE_RETRY_PRESETS.standard
      );

      this.cache.set(cacheKey, result, SUPRA_CACHE_TTL.HISTORY);
      return result;
    } catch (error) {
      if (error instanceof SupraApiError) {
        throw error;
      }
      throw new SupraApiError(
        `Failed to fetch historical prices from Supra: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_ERROR',
        undefined,
        { tradingPair, pairIndex, startDate, endDate, interval }
      );
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  destroy(): void {
    this.cache.destroy();
    this.oracleClient = null;
    logger.info('SupraDataService destroyed');
  }
}

export const getSupraDataService = createSingleton(() => new SupraDataService());
