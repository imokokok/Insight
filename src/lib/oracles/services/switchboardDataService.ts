import { createLogger } from '@/lib/utils/logger';

import { OracleCache, createSingleton } from '../base';
import {
  SWITCHBOARD_CROSSBAR_URL,
  SWITCHBOARD_CACHE_TTL,
  SWITCHBOARD_DECIMALS,
  getSwitchboardFeedIdAsync,
} from '../constants/switchboardConstants';
import { bigIntToPrice } from '../utils/oracleDataUtils';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

const logger = createLogger('SwitchboardDataService');

const REQUEST_TIMEOUT = 15000;

interface SwitchboardMedianResponse {
  value: string;
  feedHash: string;
  numOracles: number;
}

interface SwitchboardUpdateResponse {
  medianResponses: SwitchboardMedianResponse[];
  oracleResponses: unknown[];
  timestamp: number;
  slot: number;
  recentHash: string;
  encoded: string;
}

export interface SwitchboardLatestPriceData {
  price: number;
  feedId: string;
  decimals: number;
  /** Unix milliseconds. */
  timestamp: number;
  numOracles: number;
  symbol: string;
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
 * Reads the latest signed Switchboard Surge price for a symbol via the public
 * Crossbar gateway (`GET /v2/update/{feedHash}`). The call is free and
 * unauthenticated — Insight only consumes the off-chain `medianResponses`
 * consensus value, never submitting the `encoded` payload on-chain (which is
 * the only path that can incur a fee on some networks).
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
    const feedId = await getSwitchboardFeedIdAsync(upperSymbol);

    if (!feedId) {
      throw new SwitchboardApiError(
        `Symbol '${upperSymbol}' has no Switchboard Surge feed`,
        'SYMBOL_NOT_FOUND'
      );
    }

    const cacheKey = `crossbar:latest:${feedId}`;
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

          const url = `${SWITCHBOARD_CROSSBAR_URL}/v2/update/${feedId}?chain=evm&network=mainnet&use_timestamp=true`;
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

          const data = (await response.json()) as SwitchboardUpdateResponse;
          const median = data.medianResponses?.[0];

          if (!median || !median.value) {
            throw new SwitchboardApiError(
              `No median response for ${upperSymbol} from Crossbar`,
              'NO_DATA'
            );
          }

          const rawPrice = BigInt(median.value);
          const price = bigIntToPrice(rawPrice, SWITCHBOARD_DECIMALS);

          if (!isFinite(price) || price <= 0) {
            throw new SwitchboardApiError(
              `Invalid price for ${upperSymbol}: ${median.value}`,
              'INVALID_DATA'
            );
          }

          // Crossbar `timestamp` is unix seconds when use_timestamp=true.
          const timestampMs = (data.timestamp ?? Math.floor(Date.now() / 1000)) * 1000;

          return {
            price,
            feedId,
            decimals: SWITCHBOARD_DECIMALS,
            timestamp: timestampMs,
            numOracles: median.numOracles ?? 1,
            symbol: upperSymbol,
          };
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
