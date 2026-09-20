import { createLogger } from '@/lib/utils/logger';

import { OracleCache, createSingleton } from '../base';
import {
  SWITCHBOARD_CROSSBAR_URL,
  SWITCHBOARD_CACHE_TTL,
  SWITCHBOARD_DECIMALS,
  getSwitchboardFeedIdAsync,
  normalizeSwitchboardFeedId,
} from '../constants/switchboardConstants';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

const logger = createLogger('SwitchboardDataService');

const REQUEST_TIMEOUT = 15000;

interface SwitchboardSimulationFeed {
  feedHash: string;
  feedName: string;
  results: string[];
  receipts: unknown;
  network: string;
}

interface SwitchboardSimulationResponse {
  feeds: SwitchboardSimulationFeed[];
  totalFeeds: number;
  successfulFeeds: number;
  failedFeeds: number;
}

export interface SwitchboardLatestPriceData {
  price: number;
  feedId: string;
  decimals: number;
  /** Unix milliseconds. */
  timestamp: number;
  numOracles: number;
  symbol: string;
  transport: 'simulation';
  signed: false;
}

class SwitchboardApiError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'SwitchboardApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Reads a free, unsigned Switchboard simulation result from Crossbar.
 *
 * Signed realtime BTC/ETH values are ingested separately by the persistent
 * Surge Plug worker. This HTTP fallback is deliberately labelled unsigned and
 * is never allowed to count toward Insight's oracle quorum.
 */
class SwitchboardDataService {
  private cache = new OracleCache();

  constructor() {
    logger.info('SwitchboardDataService initialized', { crossbarUrl: SWITCHBOARD_CROSSBAR_URL });
  }

  async fetchLatestPrice(
    symbol: string,
    signal?: AbortSignal
  ): Promise<SwitchboardLatestPriceData> {
    const upperSymbol = symbol.toUpperCase();
    const resolvedFeedId = await getSwitchboardFeedIdAsync(upperSymbol);

    if (!resolvedFeedId) {
      throw new SwitchboardApiError(
        `Symbol '${upperSymbol}' has no Switchboard Surge feed`,
        'SYMBOL_NOT_FOUND'
      );
    }

    const feedId = normalizeSwitchboardFeedId(resolvedFeedId);

    const cacheKey = `crossbar:simulate:${feedId}`;
    const cached = this.cache.get<SwitchboardLatestPriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    if (signal?.aborted) {
      throw new SwitchboardApiError('Request aborted before fetch', 'ABORT_ERROR');
    }

    try {
      const result = await withOracleRetry(
        async () => {
          if (signal?.aborted) {
            throw new SwitchboardApiError('Request was aborted', 'ABORT_ERROR');
          }

          const url = `${SWITCHBOARD_CROSSBAR_URL}/v2/simulate/${feedId}`;
          const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT);
          const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

          const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: combinedSignal,
          });

          if (response.status === 429) {
            throw new SwitchboardApiError(
              'Switchboard Crossbar rate limit exceeded (429)',
              'RATE_LIMIT_ERROR',
              429
            );
          }

          if (!response.ok) {
            throw new SwitchboardApiError(
              `Crossbar returned HTTP ${response.status}`,
              'FETCH_ERROR',
              response.status
            );
          }

          const data = (await response.json()) as SwitchboardSimulationResponse;
          const simulated = data.feeds?.[0]?.results?.[0];

          if (!simulated || data.successfulFeeds < 1) {
            throw new SwitchboardApiError(
              `No simulation result for ${upperSymbol} from Crossbar`,
              'NO_DATA'
            );
          }

          const price = Number(simulated);

          if (!isFinite(price) || price <= 0) {
            throw new SwitchboardApiError(
              `Invalid price for ${upperSymbol}: ${simulated}`,
              'INVALID_DATA'
            );
          }

          return {
            price,
            feedId,
            decimals: SWITCHBOARD_DECIMALS,
            // /v2/simulate has no source timestamp. This is an ingestion time,
            // another reason it cannot satisfy signed quorum requirements.
            timestamp: Date.now(),
            numOracles: 0,
            symbol: upperSymbol,
            transport: 'simulation',
            signed: false,
          } satisfies SwitchboardLatestPriceData;
        },
        'switchboard:fetchLatestPrice',
        ORACLE_RETRY_PRESETS.standard
      );

      this.cache.set(cacheKey, result, SWITCHBOARD_CACHE_TTL.PRICE);
      return result;
    } catch (error) {
      if (error instanceof SwitchboardApiError) {
        throw error;
      }
      throw new SwitchboardApiError(
        `Failed to fetch Switchboard price for ${upperSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_ERROR'
      );
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

export const getSwitchboardDataService = createSingleton(() => new SwitchboardDataService());
