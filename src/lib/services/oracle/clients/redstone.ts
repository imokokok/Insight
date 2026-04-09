import { RedStoneApiError, type RedStoneErrorCode } from '@/lib/errors';
import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { SPREAD_PERCENTAGES } from '@/lib/oracles/redstoneConstants';
import { redstoneSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { toMilliseconds } from '@/lib/utils/timestamp';
import {
  OracleProvider,
  Blockchain,
  type OracleErrorCode,
  type PriceData,
  type ConfidenceInterval,
} from '@/types/oracle';

const REDSTONE_API_BASE = 'https://api.redstone.finance';
const REDSTONE_CACHE_TTL = {
  PRICE: 10000,
};

interface CacheEntry<T> {
  data: T;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}

interface RedStonePriceResponse {
  symbol: string;
  value: number;
  /** Timestamp from RedStone API (could be in seconds or milliseconds) */
  timestamp: number;
  provider?: string;
  permawireTx?: string;
  source?: {
    value: number;
    /** Timestamp (could be in seconds or milliseconds) */
    timestamp: number;
  }[];
  change24h?: number;
  change24hPercent?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  operationName?: string;
  onRetry?: (attempt: number, error: Error) => void;
}

async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, operationName = 'operation', onRetry } = options;
  let lastError: Error | undefined;
  let delay = baseDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError);
        await sleep(delay);
        delay = Math.min(delay * 2, 10000);
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${maxAttempts} attempts`);
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

  defaultUpdateIntervalMinutes = 10;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
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

  /**
   * Generates a confidence interval (bid/ask spread) for a given price and symbol.
   * Uses a deterministic algorithm based on time to ensure consistent spreads within each minute.
   * @param price - The current price of the asset
   * @param symbol - The trading symbol (e.g., 'BTC', 'ETH')
   * @returns A ConfidenceInterval object containing bid, ask, and width percentage
   */
  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const baseSpread = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    const minute = Math.floor(Date.now() / 60000);
    const hash = ((minute * 2654435761) % 1000) / 1000;
    const deterministicFactor = 0.8 + hash * 0.4;
    const spreadPercentage = baseSpread * deterministicFactor;

    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(spreadPercentage.toFixed(4)),
    };
  }

  private classifyError(error: unknown): RedStoneErrorCode {
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

  /**
   * Fetches real-time price data from the RedStone API.
   * Implements caching and retry logic with exponential backoff.
   * @param symbol - The trading symbol to fetch (e.g., 'BTC', 'ETH')
   * @returns PriceData if successful, null if no data available
   * @throws RedStoneApiError if the API request fails after all retries
   */
  private async fetchRealPrice(symbol: string): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    let attemptCount = 0;

    try {
      const result = await withRetry(
        async () => {
          attemptCount++;
          try {
            const response = await fetch(
              `${REDSTONE_API_BASE}/prices?symbol=${symbol.toUpperCase()}&provider=redstone-rapid`,
              {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
              }
            );

            if (!response.ok) {
              const errorCode = this.classifyErrorFromStatus(response.status);
              throw new RedStoneApiError(
                `HTTP ${response.status}: ${response.statusText}`,
                errorCode,
                { symbol, attemptCount }
              );
            }

            let data: RedStonePriceResponse[];
            try {
              data = await response.json();
            } catch {
              throw new RedStoneApiError('Failed to parse API response as JSON', 'PARSE_ERROR', {
                symbol,
                attemptCount,
              });
            }

            if (!Array.isArray(data) || data.length === 0) {
              return null;
            }

            const priceData = data[0];
            return this.parsePriceResponse(priceData, symbol);
          } catch (error) {
            if (error instanceof RedStoneApiError) {
              throw error;
            }
            const errorCode = this.classifyError(error);
            throw new RedStoneApiError(
              `Failed to fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`,
              errorCode,
              { symbol, attemptCount },
              error instanceof Error ? error : undefined
            );
          }
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          operationName: 'fetchRealPrice',
        }
      );

      if (result) {
        this.setCache(cacheKey, result, REDSTONE_CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      if (error instanceof RedStoneApiError) {
        throw error;
      }
      throw new RedStoneApiError(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.classifyError(error),
        { symbol, attemptCount },
        error instanceof Error ? error : undefined
      );
    }
  }

  private classifyErrorFromStatus(status: number): RedStoneErrorCode {
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

  /**
   * Parses a RedStone API price response into a standardized PriceData object.
   * Uses toMilliseconds to automatically detect and convert timestamps (seconds or milliseconds).
   * @param response - The raw response from RedStone API
   * @param symbol - The trading symbol
   * @returns Standardized PriceData object
   */
  private parsePriceResponse(response: RedStonePriceResponse, symbol: string): PriceData {
    const price = response.value;
    // Use toMilliseconds to automatically detect timestamp format (seconds or milliseconds)
    const timestamp = toMilliseconds(response.timestamp);
    const confidenceInterval = this.generateConfidenceInterval(price, symbol);

    return {
      provider: this.name,
      symbol: symbol.toUpperCase(),
      price,
      timestamp,
      decimals: 8,
      confidence: 0.97,
      confidenceInterval,
      change24h: response.change24h ?? 0,
      change24hPercent: response.change24hPercent ?? 0,
      source: response.provider,
    };
  }

  /**
   * Gets the current price for a given symbol from RedStone oracle.
   * Uses real data from RedStone API only. No fallback to other sources.
   * @param symbol - The trading symbol (e.g., 'BTC', 'ETH')
   * @param chain - Optional blockchain context for chain-specific pricing
   * @returns Promise resolving to PriceData with current price information
   * @throws OracleError if price fetching fails
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const realPrice = await this.fetchRealPrice(symbol);

      if (realPrice) {
        return {
          ...realPrice,
          chain,
        };
      }

      // If RedStone API returns no data, throw error directly without fallback
      throw this.createError(
        `No price data available for ${symbol} from RedStone API`,
        'FETCH_ERROR'
      );
    } catch (error) {
      if (error instanceof RedStoneApiError) {
        throw this.createError(error.message, error.code as OracleErrorCode);
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from RedStone',
        'REDSTONE_ERROR'
      );
    }
  }

  /**
   * Gets historical price data for a given symbol over a specified time period.
   * 统一使用 Binance API 获取历史价格数据
   * @param symbol - The trading symbol (e.g., 'BTC', 'ETH')
   * @param chain - Optional blockchain context
   * @param period - Time period in hours (default: 24)
   * @returns Promise resolving to an array of PriceData points
   * @throws OracleError if historical data fetching fails
   */
  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    const cacheKey = `historical:${symbol}:${period}`;
    const cached = this.getFromCache<PriceData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 统一使用 Binance API 获取历史价格数据
      const historicalPrices = await binanceMarketService.getHistoricalPricesByHours(symbol, period);

      if (!historicalPrices || historicalPrices.length === 0) {
        console.warn(`[RedStone] No historical data available for ${symbol}`);
        return [];
      }

      const targetChain = chain || Blockchain.ETHEREUM;
      const basePrice = historicalPrices[0].price;

      const priceData: PriceData[] = historicalPrices.map((point, index) => {
        const change24hPercent = index === 0 ? 0 : ((point.price - basePrice) / basePrice) * 100;
        const change24h = index === 0 ? 0 : point.price - basePrice;

        return {
          provider: this.name,
          chain: targetChain,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.97,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          source: 'binance-api',
        };
      });

      this.setCache(cacheKey, priceData, REDSTONE_CACHE_TTL.PRICE);
      return priceData;
    } catch (error) {
      console.warn(`[RedStone] Failed to fetch historical prices for ${symbol}:`, error);
      return [];
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getSupportedSymbols(): string[] {
    return [...redstoneSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = redstoneSymbols.includes(
      symbol.toUpperCase() as (typeof redstoneSymbols)[number]
    );
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }
}
