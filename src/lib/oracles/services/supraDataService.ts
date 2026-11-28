import { isJsonRecord } from '@/lib/api/client/responseValidation';
import { createLogger } from '@/lib/utils/logger';

import { OracleCache, createSingleton } from '../base';
import {
  SUPRA_DORA_REST_URL,
  SUPRA_CACHE_TTL,
  SUPRA_INDEX_TO_SYMBOL,
  getSupraPairIndexAsync,
} from '../constants/supraConstants';
import { resolveFeed } from '../utils/dynamicFeedResolver';
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

function parseDoraInteger(value: unknown, field: string): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new SupraApiError(`Invalid Supra DORA ${field}`, 'INVALID_DATA');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new SupraApiError(`Supra DORA ${field} exceeds safe integer range`, 'INVALID_DATA');
  }
  return parsed;
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

  constructor() {
    logger.info('SupraDataService initialized', { doraUrl: SUPRA_DORA_REST_URL });
  }

  private async getCancelableOracleClient(
    signal: AbortSignal | undefined
  ): Promise<SupraOracleClient> {
    const SupraOracleClient = (await import('supra-oracle-sdk')).default;
    const client = new SupraOracleClient({
      restAddress: SUPRA_DORA_REST_URL,
      chainType: 'evm',
    });

    // The SDK's getOracleData calls `this.getProof`, so replace only its
    // transport for this request while retaining the SDK's proof decoder.
    const clientWithProof = client as SupraOracleClient & {
      getProof: (pairIndexes: number[]) => Promise<string>;
    };
    clientWithProof.getProof = async (indexes) => {
      const payload = await this.fetchDoraJson(
        `${SUPRA_DORA_REST_URL}/get_proof`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair_indexes: indexes, chain_type: 'evm' }),
        },
        signal
      );
      if (!isJsonRecord(payload) || typeof payload.proof_bytes !== 'string') {
        throw new SupraApiError('Supra DORA returned an invalid proof response', 'INVALID_DATA');
      }
      return payload.proof_bytes;
    };
    return client;
  }

  private async fetchDoraJson(
    url: string,
    options: RequestInit,
    signal?: AbortSignal
  ): Promise<unknown> {
    if (signal?.aborted) throw new SupraApiError('Request was aborted', 'ABORT_ERROR');
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT);
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) {
        throw new SupraApiError(
          `Supra DORA returned HTTP ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }
      return await response.json();
    } catch (error) {
      if (timedOut) {
        throw new SupraApiError(
          `Supra DORA request timed out after ${REQUEST_TIMEOUT}ms`,
          'TIMEOUT_ERROR'
        );
      }
      if (signal?.aborted) throw new SupraApiError('Request was aborted', 'ABORT_ERROR');
      throw error;
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    }
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

          const client = await this.getCancelableOracleClient(signal);
          const oracleData: SupraOraclePriceFeed[] = await client.getOracleData(pairIndexes);

          if (!oracleData || !Array.isArray(oracleData) || oracleData.length === 0) {
            throw new SupraApiError('No price data returned from Supra DORA', 'NO_DATA');
          }
          return oracleData;
        },
        'supra:fetchLatestPrices',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );

      const results: SupraLatestPriceData[] = result
        .map((feed) => {
          if (!isJsonRecord(feed)) {
            throw new SupraApiError('Supra DORA returned an invalid price row', 'INVALID_DATA');
          }
          const pairIndex = parseDoraInteger(feed.pairIndex, 'pair index');
          const symbol = SUPRA_INDEX_TO_SYMBOL[pairIndex] || `UNKNOWN_${pairIndex}`;
          const decimals = parseDoraInteger(feed.decimals, 'decimals');
          if (decimals > 36) {
            throw new SupraApiError('Supra DORA decimals exceed supported scale', 'INVALID_DATA');
          }
          const timestamp = parseDoraInteger(feed.timestamp, 'timestamp');
          if (timestamp <= 0) {
            throw new SupraApiError('Supra DORA returned an invalid timestamp', 'INVALID_DATA');
          }
          if (typeof feed.price !== 'string' || !/^\d+$/.test(feed.price)) {
            throw new SupraApiError('Supra DORA returned an invalid price integer', 'INVALID_DATA');
          }
          const rawPrice = BigInt(feed.price);
          const price = bigIntToPrice(rawPrice, decimals);

          return {
            price,
            pairIndex,
            decimals,
            timestamp,
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
    const pairIndex = await getSupraPairIndexAsync(symbol);
    if (pairIndex === null) {
      throw new SupraApiError(
        `Symbol '${symbol}' not found in Supra pair index map`,
        'SYMBOL_NOT_FOUND'
      );
    }

    return this.fetchLatestPriceByIndex(pairIndex, symbol, signal);
  }

  async fetchLatestPriceByIndex(
    pairIndex: number,
    symbol: string,
    signal?: AbortSignal
  ): Promise<SupraLatestPriceData> {
    const results = await this.fetchLatestPrices([pairIndex], signal);
    const result = results.find((r) => r.pairIndex === pairIndex);

    if (!result) {
      throw new SupraApiError(`No price data for ${symbol} (index ${pairIndex})`, 'NO_DATA');
    }

    return { ...result, symbol };
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
    const apiKey = process.env.SUPRA_DORA_HISTORY_API_KEY?.trim();
    if (!apiKey) {
      logger.warn('Supra historical prices require a configured history API key');
      return [];
    }

    if (signal?.aborted) {
      throw new SupraApiError('Request aborted before fetch', 'ABORT_ERROR');
    }

    const symbol = tradingPair.split(/[_/]/, 1)[0]?.toUpperCase();
    if (!symbol || !/^[A-Z0-9.]{1,20}$/.test(symbol)) {
      throw new SupraApiError(`Invalid Supra trading pair '${tradingPair}'`, 'INVALID_PAIR');
    }

    const feed = await resolveFeed('supra', symbol, 0);
    const officialPair = feed?.source === 'supra-directory' ? feed.name?.trim() : null;
    if (!officialPair || !/^[A-Z0-9.]+_(?:USD|USDT|USDC)$/i.test(officialPair)) {
      logger.warn('Supra historical prices require an active official feed-directory pair', {
        symbol,
      });
      return [];
    }

    if (
      !Number.isSafeInteger(startDate) ||
      !Number.isSafeInteger(endDate) ||
      endDate <= startDate ||
      endDate - startDate > 31 * 24 * 60 * 60 * 1000 ||
      !Number.isSafeInteger(interval) ||
      interval <= 0
    ) {
      throw new SupraApiError('Invalid Supra history time range or interval', 'INVALID_RANGE');
    }

    const cacheKey = `dora:history:${officialPair.toLowerCase()}:${startDate}:${endDate}:${interval}`;
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
          const url = new URL('https://prod-kline-rest.supra.com/history');
          url.searchParams.set('trading_pair', officialPair.toLowerCase());
          url.searchParams.set('startDate', String(startDate));
          url.searchParams.set('endDate', String(endDate));
          url.searchParams.set('interval', String(interval));
          const payload = await this.fetchDoraJson(
            url.toString(),
            { headers: { 'x-api-key': apiKey } },
            signal
          );
          const rawRows =
            isJsonRecord(payload) && Array.isArray(payload.data) ? payload.data : null;
          if (!rawRows || rawRows.length === 0) {
            throw new SupraApiError('No historical data returned from Supra', 'NO_DATA');
          }
          const rows = rawRows.map((value) => {
            if (!isJsonRecord(value)) {
              throw new SupraApiError('Invalid Supra history row', 'INVALID_DATA');
            }
            const timestamp = Number(value.timestamp);
            const open = Number(value.open);
            const high = Number(value.high);
            const low = Number(value.low);
            const close = Number(value.close);
            const volume = value.volume === undefined ? undefined : Number(value.volume);
            if (
              !Number.isSafeInteger(timestamp) ||
              timestamp <= 0 ||
              ![open, high, low, close].every((price) => Number.isFinite(price) && price > 0) ||
              (volume !== undefined && (!Number.isFinite(volume) || volume < 0))
            ) {
              throw new SupraApiError('Invalid Supra history row values', 'INVALID_DATA');
            }
            return { timestamp, open, high, low, close, volume };
          });
          return rows;
        },
        'supra:fetchHistoricalPrices',
        ORACLE_RETRY_PRESETS.standard,
        signal
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
        { tradingPair, startDate, endDate, interval }
      );
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  destroy(): void {
    this.cache.destroy();
    logger.info('SupraDataService destroyed');
  }
}

export const getSupraDataService = createSingleton(() => new SupraDataService());
