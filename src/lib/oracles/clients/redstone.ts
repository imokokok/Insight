import { OracleProviderError } from '@/lib/errors';
import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import {
  SPREAD_PERCENTAGES,
  REDSTONE_API_BASE,
  isRedStoneSymbolSupportedAsync,
} from '@/lib/oracles/constants/redstoneConstants';
import { redstoneSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { createLogger } from '@/lib/utils/logger';
import { toMilliseconds } from '@/lib/utils/timestamp';
import {
  OracleProvider,
  Blockchain,
  type PriceData,
  type ConfidenceInterval,
  type RedStoneTokenOnChainData,
} from '@/types/oracle';

const logger = createLogger('RedStoneClient');

const REDSTONE_CACHE_TTL = {
  PRICE: 10000,
};

// Per-request hard timeout. The fetch call in fetchRealPrice has no native
// timeout (the external `signal` is undefined when called from the snapshot
// collector). Without this, a hung RedStone API connection is never cancelled
// — withOracleRetry's withTimeout rejects the promise after 15s but the
// underlying socket stays open, and the raw AbortError's "abort" message
// causes shouldRetry to give up instead of retrying. This per-request
// AbortController ensures the fetch is properly cancelled and the error is
// classified as TIMEOUT_ERROR (which is retryable).
const REDSTONE_REQUEST_TIMEOUT_MS = 10000;

interface RedStonePriceResponse {
  symbol: string;
  value: number;
  timestamp: number;
  provider?: string;
  permawireTx?: string;
  source?: {
    value: number;
    timestamp: number;
  }[];
  change24h?: number;
  change24hPercent?: number;
}

export class RedStoneClient extends BaseOracleClient {
  name = OracleProvider.REDSTONE;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.FANTOM,
    Blockchain.LINEA,
    Blockchain.MANTLE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
  ];

  supportedSymbolsList = redstoneSymbols;

  defaultUpdateIntervalMinutes = 10;
  private cache = new OracleCache();

  constructor(config?: OracleClientConfig) {
    super(config);
    this.cache.startCleanupInterval();
  }

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const spreadPercentage = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(spreadPercentage.toFixed(4)),
    };
  }

  private classifyError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('HTTP 429') || error.message.includes('rate limit')) {
        return 'RATE_LIMIT_ERROR';
      }
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return 'TIMEOUT_ERROR';
      }
      if (
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')
      ) {
        return 'NETWORK_ERROR';
      }
      if (error.message.includes('parse') || error.message.includes('JSON')) {
        return 'PARSE_ERROR';
      }
    }
    return 'FETCH_ERROR';
  }

  private async fetchRealPrice(symbol: string, signal?: AbortSignal): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    let attemptCount = 0;

    try {
      const result = await withOracleRetry(
        async () => {
          attemptCount++;

          // Per-request AbortController with hard timeout. Ensures the fetch
          // is actually cancelled on timeout (not just the promise rejected)
          // and that the error is classified as TIMEOUT_ERROR so shouldRetry
          // retries it. A raw AbortError's message contains "abort" which
          // shouldRetry explicitly does NOT retry, so we intercept it here.
          const controller = new AbortController();
          let timedOut = false;
          const timeoutId = setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, REDSTONE_REQUEST_TIMEOUT_MS);

          // Propagate external abort (e.g. caller cancellation) to the
          // internal controller so the fetch is cancelled immediately.
          if (signal) {
            if (signal.aborted) {
              clearTimeout(timeoutId);
              controller.abort();
            } else {
              signal.addEventListener('abort', () => controller.abort(), { once: true });
            }
          }

          try {
            const response = await fetch(
              `${REDSTONE_API_BASE}/prices?symbol=${symbol.toUpperCase()}&provider=redstone-rapid`,
              {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
                signal: controller.signal,
              }
            );

            if (!response.ok) {
              const errorCode = this.classifyErrorFromStatus(response.status);
              throw new OracleProviderError(
                `HTTP ${response.status}: ${response.statusText}`,
                'redstone',
                errorCode,
                { symbol, attemptCount }
              );
            }

            let data: RedStonePriceResponse[];
            try {
              data = await response.json();
            } catch {
              throw new OracleProviderError(
                'Failed to parse API response as JSON',
                'redstone',
                'PARSE_ERROR',
                {
                  symbol,
                  attemptCount,
                }
              );
            }

            if (!Array.isArray(data) || data.length === 0) {
              return null;
            }

            const priceData = data[0];
            return this.parsePriceResponse(priceData, symbol);
          } catch (error) {
            if (error instanceof OracleProviderError) {
              throw error;
            }
            // If our per-request timeout fired, classify as TIMEOUT_ERROR
            // (retryable) instead of letting the raw AbortError propagate —
            // its "abort" message would cause shouldRetry to give up.
            if (timedOut) {
              throw new OracleProviderError(
                `Request timeout after ${REDSTONE_REQUEST_TIMEOUT_MS}ms: ${symbol}`,
                'redstone',
                'TIMEOUT_ERROR',
                { symbol, attemptCount },
                error instanceof Error ? error : undefined
              );
            }
            const errorCode = this.classifyError(error);
            throw new OracleProviderError(
              `Failed to fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'redstone',
              errorCode,
              { symbol, attemptCount },
              error instanceof Error ? error : undefined
            );
          } finally {
            clearTimeout(timeoutId);
          }
        },
        'fetchRealPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );

      if (result) {
        this.cache.set(cacheKey, result, REDSTONE_CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      if (error instanceof OracleProviderError) {
        throw error;
      }
      throw new OracleProviderError(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'redstone',
        this.classifyError(error),
        { symbol, attemptCount },
        error instanceof Error ? error : undefined
      );
    }
  }

  private classifyErrorFromStatus(status: number): string {
    switch (status) {
      case 429:
        return 'RATE_LIMIT_ERROR';
      case 504:
        return 'TIMEOUT_ERROR';
      case 503:
        return 'NETWORK_ERROR';
      default:
        return 'FETCH_ERROR';
    }
  }

  private parsePriceResponse(response: RedStonePriceResponse, symbol: string): PriceData {
    const price = response.value;
    // External API data is untrusted. A missing/non-finite `value` must be
    // rejected here rather than cached as NaN, which would otherwise poison
    // downstream deviation/accuracy math. The timestamp is already validated
    // by toMilliseconds; the price needs the same guard at this data boundary.
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new OracleProviderError(
        `Invalid or missing price value for ${symbol}`,
        'redstone',
        'PARSE_ERROR',
        { symbol, value: price }
      );
    }
    const timestamp = toMilliseconds(response.timestamp);
    const confidenceInterval = this.generateConfidenceInterval(price, symbol);

    return {
      provider: this.name,
      symbol: symbol.toUpperCase(),
      price,
      timestamp,
      decimals: 8,
      confidence: 0.97,
      confidenceSource: 'estimated',
      confidenceInterval,
      change24h: response.change24h ?? 0,
      change24hPercent: response.change24hPercent ?? 0,
      source: response.provider,
      ingestionTimestamp: Date.now(),
    };
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    try {
      const realPrice = await this.fetchRealPrice(symbol, options?.signal);

      if (realPrice) {
        // Central schema validation: the live-fetch path must reject untrusted
        // NaN/negative prices or non-positive/non-integer timestamps instead of
        // caching them. This is the canonical chokepoint every RedStone price
        // traverses before reaching the cache/downstream math.
        return this.validatePriceData(
          {
            ...realPrice,
            chain,
            verification: buildApiVerification(
              `${REDSTONE_API_BASE}/prices?symbol=${symbol.toUpperCase()}`,
              'getPrice',
              'RedStone API'
            ),
          },
          'getPrice'
        );
      }

      throw this.createError(
        `No price data available for ${symbol} from RedStone API`,
        'FETCH_ERROR'
      );
    } catch (error) {
      this.handleGetPriceError(error, 'RedStone', 'REDSTONE_ERROR');
    }
  }

  clearCache(): void {
    this.cache.stopCleanupInterval();
    this.cache.clear();
    this.cache.startCleanupInterval();
  }

  override destroy(): void {
    this.cache.destroy();
  }

  async isSymbolSupportedAsync(symbol: string): Promise<boolean> {
    return isRedStoneSymbolSupportedAsync(symbol);
  }

  async getTokenOnChainData(symbol: string): Promise<RedStoneTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.cache.get<RedStoneTokenOnChainData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const priceData = await this.fetchRealPrice(symbol);
      if (!priceData) {
        return null;
      }

      const now = Date.now();
      const refTime = priceData.ingestionTimestamp ?? priceData.timestamp;
      const dataAge = refTime ? Math.round((now - refTime) / 1000) : null;

      const onChainData: RedStoneTokenOnChainData = {
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        decimals: priceData.decimals || 8,
        bid: priceData.confidenceInterval?.bid || null,
        ask: priceData.confidenceInterval?.ask || null,
        spreadPercentage: priceData.confidenceInterval?.widthPercentage || null,
        supportedChainsCount: this.supportedChains.length,
        updateIntervalMinutes: this.defaultUpdateIntervalMinutes,
        provider: priceData.source || 'redstone-rapid',
        dataAge,
        lastUpdated: priceData.timestamp,
      };

      this.cache.set(cacheKey, onChainData, 60000);
      return onChainData;
    } catch (error) {
      logger.error(
        `Failed to get on-chain data for ${symbol}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }
}

export type { RedStoneTokenOnChainData };
