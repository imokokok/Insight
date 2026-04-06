import { RedStoneApiError, type RedStoneErrorCode } from '@/lib/errors';
import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { SPREAD_PERCENTAGES } from '@/lib/oracles/redstoneConstants';
import { redstoneSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
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

/**
 * Converts a timestamp from seconds to milliseconds.
 * RedStone API returns timestamps in seconds, but JavaScript uses milliseconds.
 * @param timestampInSeconds - Timestamp in seconds
 * @returns Timestamp in milliseconds
 */
function timestampSecondsToMillis(timestampInSeconds: number): number {
  return timestampInSeconds * 1000;
}

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
  /** Timestamp in seconds (from RedStone API) */
  timestamp: number;
  provider?: string;
  permawireTx?: string;
  source?: {
    value: number;
    /** Timestamp in seconds */
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
   * Converts timestamps from seconds to milliseconds and generates confidence intervals.
   * @param response - The raw response from RedStone API
   * @param symbol - The trading symbol
   * @returns Standardized PriceData object
   */
  private parsePriceResponse(response: RedStonePriceResponse, symbol: string): PriceData {
    const price = response.value;
    const timestamp = timestampSecondsToMillis(response.timestamp);
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
   * Uses real data from RedStone API, with Binance API as fallback.
   * When querying RED token price, directly uses Binance API without trying RedStone API.
   * @param symbol - The trading symbol (e.g., 'BTC', 'ETH')
   * @param chain - Optional blockchain context for chain-specific pricing
   * @returns Promise resolving to PriceData with current price information
   * @throws OracleError if price fetching fails
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();

    // 当查询自己预言机的代币 (RED) 时，直接使用 Binance API，不尝试 RedStone API
    if (upperSymbol === 'RED') {
      const binancePrice = await this.fetchPriceFromBinance(symbol, chain);
      if (binancePrice) {
        return binancePrice;
      }
      throw this.createError(
        `No price data available for ${symbol} from Binance API`,
        'FETCH_ERROR'
      );
    }

    try {
      const realPrice = await this.fetchRealPrice(symbol);

      if (realPrice) {
        return {
          ...realPrice,
          chain,
        };
      }

      // If RedStone API returns no data, try Binance API as fallback
      const binancePrice = await this.fetchPriceFromBinance(symbol, chain);
      if (binancePrice) {
        return binancePrice;
      }

      // If no price data available from any source, throw error
      throw this.createError(
        `No price data available for ${symbol} from RedStone or Binance API`,
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
   * Fetches price data from Binance API as a fallback source.
   * @param symbol - The trading symbol
   * @param chain - Optional blockchain context
   * @returns PriceData if successful, null otherwise
   */
  private async fetchPriceFromBinance(
    symbol: string,
    chain?: Blockchain
  ): Promise<PriceData | null> {
    try {
      const marketData = await binanceMarketService.getTokenMarketData(symbol);

      if (!marketData) {
        return null;
      }

      const confidenceInterval = this.generateConfidenceInterval(marketData.currentPrice, symbol);

      return {
        provider: this.name,
        symbol: symbol.toUpperCase(),
        price: marketData.currentPrice,
        timestamp: new Date(marketData.lastUpdated).getTime(),
        decimals: 8,
        confidence: 0.97,
        confidenceInterval,
        change24h: marketData.priceChange24h,
        change24hPercent: marketData.priceChangePercentage24h,
        chain,
        source: 'binance',
      };
    } catch (error) {
      console.warn(`[RedStone] Failed to fetch from Binance:`, error);
      return null;
    }
  }

  /**
   * Gets historical price data for a given symbol over a specified time period.
   * Fetches real historical data from RedStone API when available, with Binance API as fallback.
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
      // Try to fetch real historical data from RedStone API
      const historicalData = await this.fetchHistoricalPricesFromAPI(symbol, period);

      if (historicalData.length > 0) {
        this.setCache(cacheKey, historicalData, REDSTONE_CACHE_TTL.PRICE);
        return historicalData;
      }

      // If RedStone API returns no data, try Binance API as fallback
      const binanceData = await this.fetchHistoricalPricesFromBinance(symbol, chain, period);
      if (binanceData.length > 0) {
        this.setCache(cacheKey, binanceData, REDSTONE_CACHE_TTL.PRICE);
        return binanceData;
      }

      // If no data available from any source, return empty array
      console.warn(`[RedStone] No historical data available for ${symbol}`);
      return [];
    } catch (error) {
      console.warn(`[RedStone] Failed to fetch historical prices for ${symbol}:`, error);
      // Try Binance API as fallback
      try {
        const binanceData = await this.fetchHistoricalPricesFromBinance(symbol, chain, period);
        if (binanceData.length > 0) {
          return binanceData;
        }
      } catch (binanceError) {
        console.warn(
          `[RedStone] Binance historical fallback also failed for ${symbol}:`,
          binanceError
        );
      }
      // Return empty array on error
      return [];
    }
  }

  /**
   * Fetches historical price data from Binance API as a fallback source.
   * @param symbol - The trading symbol
   * @param chain - Optional blockchain context
   * @param period - Time period in hours
   * @returns Array of historical PriceData points
   */
  private async fetchHistoricalPricesFromBinance(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const days = Math.ceil(period / 24);
      const historicalPrices = await binanceMarketService.getHistoricalPrices(symbol, days);

      if (!historicalPrices || historicalPrices.length === 0) {
        return [];
      }

      return historicalPrices.map((point) => {
        const confidenceInterval = this.generateConfidenceInterval(point.price, symbol);
        return {
          provider: this.name,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.97,
          confidenceInterval,
          change24h: 0,
          change24hPercent: 0,
          chain,
          source: 'binance',
        };
      });
    } catch (error) {
      console.warn(`[RedStone] Failed to fetch historical data from Binance:`, error);
      return [];
    }
  }

  /**
   * Fetches historical price data from RedStone API.
   * @param symbol - The trading symbol
   * @param period - Time period in hours
   * @returns Array of historical PriceData points
   * @throws Error if historical data is not available
   */
  private async fetchHistoricalPricesFromAPI(symbol: string, period: number): Promise<PriceData[]> {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - period * 3600;

    try {
      const response = await fetch(
        `${REDSTONE_API_BASE}/prices?symbol=${symbol.toUpperCase()}&fromTimestamp=${startTime}&toTimestamp=${endTime}&interval=1h`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `RedStone historical API returned ${response.status}: ${response.statusText}`
        );
      }

      const data: RedStonePriceResponse[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No historical price data available for ${symbol} from RedStone API`);
      }

      return data.map((priceData) => this.parsePriceResponse(priceData, symbol));
    } catch (error) {
      throw new Error(
        `Failed to fetch historical prices from RedStone API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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

  /**
   * Gets market data for a given symbol from Binance API.
   * Used as a fallback when RedStone API doesn't support the token.
   * @param symbol - The trading symbol (e.g., 'RED', 'ETH')
   * @returns Promise resolving to market data or null if not available
   */
  async getMarketData(symbol: string = 'RED'): Promise<{
    symbol: string;
    name: string;
    currentPrice: number;
    marketCap: number;
    marketCapRank: number;
    totalVolume24h: number;
    high24h: number;
    low24h: number;
    priceChange24h: number;
    priceChangePercentage24h: number;
    circulatingSupply: number;
    totalSupply: number;
    maxSupply?: number;
    stakingApr?: number;
  } | null> {
    try {
      const marketData = await binanceMarketService.getTokenMarketData(symbol);

      if (!marketData) {
        console.warn(`[RedStoneClient] No market data found for ${symbol}`);
        return null;
      }

      return {
        symbol: marketData.symbol,
        name: marketData.name,
        currentPrice: marketData.currentPrice,
        marketCap: marketData.marketCap ?? 0,
        marketCapRank: marketData.marketCapRank ?? 0,
        totalVolume24h: marketData.totalVolume24h,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        priceChange24h: marketData.priceChange24h,
        priceChangePercentage24h: marketData.priceChangePercentage24h,
        circulatingSupply: marketData.circulatingSupply ?? 0,
        totalSupply: marketData.totalSupply ?? 0,
        maxSupply: marketData.maxSupply ?? undefined,
        stakingApr: 0,
      };
    } catch (error) {
      console.error(`[RedStoneClient] Failed to fetch market data for ${symbol}:`, error);
      return null;
    }
  }
}
