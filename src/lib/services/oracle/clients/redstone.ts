import { RedStoneApiError, type RedStoneErrorCode } from '@/lib/errors';
import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import {
  REDSTONE_SUPPORTED_CHAINS,
  SPREAD_PERCENTAGES,
  type RedStoneChainInfo,
} from '@/lib/oracles/redstoneConstants';
import { redstoneSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain, type OracleErrorCode } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

const REDSTONE_API_BASE = 'https://api.redstone.finance';
const REDSTONE_CACHE_TTL = {
  PRICE: 10000,
  PROVIDERS: 60000,
  STATS: 30000,
  CHAINS: 300000,
  ECOSYSTEM: 300000,
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

interface RedStoneProviderResponse {
  name: string;
  address?: string;
  dataFeedsCount?: number;
  /** Timestamp in seconds (from RedStone API) */
  lastUpdateTimestamp?: number;
  totalDataPoints?: number;
  reputation?: number;
}

export interface RedStoneProviderInfo {
  id: string;
  name: string;
  reputation: number;
  dataPoints: number;
  /** Timestamp in milliseconds */
  lastUpdate: number;
}

export interface RedStoneMetrics {
  modularFee: number;
  dataFreshnessScore: number;
  providerCount: number;
  avgProviderReputation: number;
}

export interface RedStoneNetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
}

export interface RedStoneEcosystemData {
  integrations: Array<{
    name: string;
    description: string;
  }>;
}

export interface RedStoneRiskMetrics {
  centralizationRisk: number;
  liquidityRisk: number;
  technicalRisk: number;
  overallRisk: number;
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

    let lastError: Error | undefined;
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
          onRetry: (attempt, error) => {
            lastError = error;
          },
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

  /**
   * Gets RedStone network metrics including provider statistics and data freshness.
   * Calculates metrics from real provider data.
   * Results are cached for performance.
   * @returns Promise resolving to RedStoneMetrics object
   */
  async getRedStoneMetrics(): Promise<RedStoneMetrics> {
    const cacheKey = 'metrics';
    const cached = this.getFromCache<RedStoneMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const providers = await this.getDataProviders();

      // Calculate metrics from real provider data
      const avgReputation =
        providers.length > 0
          ? providers.reduce((sum, p) => sum + p.reputation, 0) / providers.length
          : 0;

      // Calculate data freshness score based on provider activity
      const dataFreshnessScore = this.calculateDataFreshnessScore(providers);

      const metrics: RedStoneMetrics = {
        modularFee: 0.0002, // This is a protocol parameter, not dynamic data
        dataFreshnessScore,
        providerCount: providers.length,
        avgProviderReputation: avgReputation,
      };

      this.setCache(cacheKey, metrics, REDSTONE_CACHE_TTL.STATS);
      return metrics;
    } catch (error) {
      console.warn('[RedStone] Failed to calculate metrics:', error);
      // Return zero/empty metrics on error instead of hardcoded values
      return {
        modularFee: 0.0002,
        dataFreshnessScore: 0,
        providerCount: 0,
        avgProviderReputation: 0,
      };
    }
  }

  /**
   * Calculates data freshness score based on provider activity.
   * Score is based on percentage of providers active within the last 10 minutes.
   * @param providers - Array of provider information
   * @returns Freshness score (0-100)
   */
  private calculateDataFreshnessScore(providers: RedStoneProviderInfo[]): number {
    if (providers.length === 0) return 0;

    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    const freshProviders = providers.filter((provider) => {
      const timeSinceUpdate = now - provider.lastUpdate;
      return timeSinceUpdate < tenMinutes;
    });

    return Math.round((freshProviders.length / providers.length) * 100);
  }

  /**
   * Gets information about all RedStone data providers.
   * Includes reputation scores, data points contributed, and last update timestamps.
   * Uses real data from RedStone API only.
   * @returns Promise resolving to an array of RedStoneProviderInfo objects
   */
  async getDataProviders(): Promise<RedStoneProviderInfo[]> {
    const cacheKey = 'providers';
    const cached = this.getFromCache<RedStoneProviderInfo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const response = await fetch(`${REDSTONE_API_BASE}/providers`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: RedStoneProviderResponse[] = await response.json();

          if (!Array.isArray(data) || data.length === 0) {
            return [];
          }

          return data.map((provider, index) => ({
            id: provider.address || `provider-${index}`,
            name: provider.name || `Provider ${index + 1}`,
            reputation: provider.reputation ?? 0,
            dataPoints: provider.totalDataPoints ?? 0,
            lastUpdate: provider.lastUpdateTimestamp
              ? timestampSecondsToMillis(provider.lastUpdateTimestamp)
              : Date.now(),
          }));
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          operationName: 'getDataProviders',
        }
      );

      this.setCache(cacheKey, result, REDSTONE_CACHE_TTL.PROVIDERS);
      return result;
    } catch (error) {
      console.warn('[RedStone] Failed to fetch providers:', error);
      return [];
    }
  }

  /**
   * Gets RedStone network statistics including active nodes, data feeds, and latency.
   * Fetches real data from RedStone API and calculates metrics based on actual provider data.
   * Results are cached for performance.
   * @returns Promise resolving to RedStoneNetworkStats object
   */
  async getNetworkStats(): Promise<RedStoneNetworkStats> {
    const cacheKey = 'networkStats';
    const cached = this.getFromCache<RedStoneNetworkStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch real providers data to calculate network stats
      const providers = await this.getDataProviders();

      // Calculate real metrics based on provider data
      const activeNodes = providers.length;

      // Fetch data feeds count from RedStone API
      const dataFeeds = await this.fetchDataFeedsCount();

      // Calculate average response time based on provider last update timestamps
      const avgResponseTime = this.calculateAvgResponseTime(providers);

      // Calculate network latency based on provider activity
      const latency = this.calculateNetworkLatency(providers);

      // Calculate uptime based on provider activity (providers active in last hour)
      const nodeUptime = this.calculateNodeUptime(providers);

      const stats: RedStoneNetworkStats = {
        activeNodes,
        dataFeeds,
        nodeUptime,
        avgResponseTime,
        latency,
      };

      this.setCache(cacheKey, stats, REDSTONE_CACHE_TTL.STATS);
      return stats;
    } catch (error) {
      console.warn('[RedStone] Failed to fetch network stats, using fallback:', error);
      // Return calculated fallback based on available data
      const providers = await this.getDataProviders().catch(() => []);
      return {
        activeNodes: providers.length || 0,
        dataFeeds: 0,
        nodeUptime: 0,
        avgResponseTime: 0,
        latency: 0,
      };
    }
  }

  /**
   * Fetches the count of available data feeds from RedStone API.
   * @returns Promise resolving to the number of data feeds
   */
  private async fetchDataFeedsCount(): Promise<number> {
    try {
      const response = await fetch(`${REDSTONE_API_BASE}/data-feeds`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        // If endpoint doesn't exist, estimate from supported tokens
        return this.estimateDataFeedsCount();
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        return data.length;
      }
      return data.count || this.estimateDataFeedsCount();
    } catch {
      return this.estimateDataFeedsCount();
    }
  }

  /**
   * Estimates data feeds count based on supported price symbols.
   * @returns Estimated number of data feeds
   */
  private estimateDataFeedsCount(): number {
    // Based on RedStone's documented supported assets
    const supportedSymbols = [
      'BTC',
      'ETH',
      'SOL',
      'AVAX',
      'LINK',
      'UNI',
      'AAVE',
      'SNX',
      'CRV',
      'MKR',
      'COMP',
      'YFI',
      'SUSHI',
      '1INCH',
      'LDO',
      'STETH',
      'USDC',
      'USDT',
      'DAI',
      'FRAX',
      'WBTC',
      'WETH',
      'MATIC',
      'BNB',
      'FTM',
      'OP',
      'ARB',
      'BASE',
      'MNT',
    ];
    return supportedSymbols.length;
  }

  /**
   * Calculates average response time based on provider last update timestamps.
   * @param providers - Array of provider information
   * @returns Average response time in milliseconds
   */
  private calculateAvgResponseTime(providers: RedStoneProviderInfo[]): number {
    if (providers.length === 0) return 0;

    const now = Date.now();
    const responseTimes = providers.map((provider) => {
      const timeSinceUpdate = now - provider.lastUpdate;
      // Convert to a reasonable response time metric (lower is better)
      return Math.max(50, Math.min(5000, timeSinceUpdate / 10));
    });

    const avg = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    return Math.round(avg);
  }

  /**
   * Calculates network latency based on provider activity freshness.
   * @param providers - Array of provider information
   * @returns Network latency in milliseconds
   */
  private calculateNetworkLatency(providers: RedStoneProviderInfo[]): number {
    if (providers.length === 0) return 0;

    const now = Date.now();
    const latencies = providers.map((provider) => {
      const timeSinceUpdate = now - provider.lastUpdate;
      // Latency is proportional to time since last update
      return Math.max(10, Math.min(1000, timeSinceUpdate / 100));
    });

    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    return Math.round(avg);
  }

  /**
   * Calculates node uptime percentage based on provider activity.
   * Considers providers active if they updated within the last hour.
   * @param providers - Array of provider information
   * @returns Uptime percentage (0-100)
   */
  private calculateNodeUptime(providers: RedStoneProviderInfo[]): number {
    if (providers.length === 0) return 0;

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const activeProviders = providers.filter((provider) => {
      const timeSinceUpdate = now - provider.lastUpdate;
      return timeSinceUpdate < oneHour;
    });

    const uptime = (activeProviders.length / providers.length) * 100;
    return Number(uptime.toFixed(2));
  }

  /**
   * Gets RedStone ecosystem data including integrations and supported protocols.
   * Fetches real data from supported chains and providers.
   * @returns Promise resolving to RedStoneEcosystemData object
   */
  async getEcosystemData(): Promise<RedStoneEcosystemData> {
    const cacheKey = 'ecosystem';
    const cached = this.getFromCache<RedStoneEcosystemData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Build ecosystem data based on real supported chains and providers
      const chains = await this.getSupportedChains();
      const providers = await this.getDataProviders();

      // Create integrations based on active chains
      const integrations = this.buildEcosystemIntegrations(chains, providers);

      const ecosystem: RedStoneEcosystemData = {
        integrations,
      };

      this.setCache(cacheKey, ecosystem, REDSTONE_CACHE_TTL.ECOSYSTEM);
      return ecosystem;
    } catch (error) {
      console.warn('[RedStone] Failed to fetch ecosystem data:', error);
      // Return empty integrations on error
      return {
        integrations: [],
      };
    }
  }

  /**
   * Builds ecosystem integrations based on supported chains and providers.
   * @param chains - Array of supported chain information
   * @param providers - Array of provider information
   * @returns Array of integration objects
   */
  private buildEcosystemIntegrations(
    chains: RedStoneChainInfo[],
    providers: RedStoneProviderInfo[]
  ): Array<{ name: string; description: string }> {
    const integrations: Array<{ name: string; description: string }> = [];

    // Add chain-based integrations
    for (const chain of chains) {
      if (chain.status === 'active') {
        const chainName = chain.chain;
        const providerCount = providers.length;

        switch (chainName) {
          case 'Ethereum':
            integrations.push({
              name: 'Ethereum DeFi',
              description: `Active DeFi protocols on Ethereum with ${providerCount} data providers`,
            });
            break;
          case 'Arbitrum':
            integrations.push({
              name: 'Arbitrum Ecosystem',
              description: `Layer 2 scaling solution with ${chain.latency}ms latency`,
            });
            break;
          case 'Optimism':
            integrations.push({
              name: 'Optimism OP Stack',
              description: `Superchain ecosystem member with ${chain.updateFreq}s updates`,
            });
            break;
          case 'Polygon':
            integrations.push({
              name: 'Polygon Network',
              description: `High-speed sidechain with ${chain.latency}ms latency`,
            });
            break;
          case 'Avalanche':
            integrations.push({
              name: 'Avalanche Subnets',
              description: `Custom blockchain deployments supported`,
            });
            break;
          case 'Base':
            integrations.push({
              name: 'Base L2',
              description: `Coinbase L2 network with ${chain.latency}ms latency`,
            });
            break;
          case 'BNB Chain':
            integrations.push({
              name: 'BNB Chain',
              description: `BSC ecosystem integration active`,
            });
            break;
          case 'Fantom':
            integrations.push({
              name: 'Fantom Opera',
              description: `High-performance EVM chain supported`,
            });
            break;
          case 'Linea':
            integrations.push({
              name: 'Linea zkEVM',
              description: `Consensys zkEVM with ${chain.latency}ms latency`,
            });
            break;
          case 'Mantle':
            integrations.push({
              name: 'Mantle Network',
              description: `Modular L2 solution with ${chain.updateFreq}s updates`,
            });
            break;
          case 'Scroll':
            integrations.push({
              name: 'Scroll zkEVM',
              description: `Native zkEVM scaling solution`,
            });
            break;
          case 'zkSync':
            integrations.push({
              name: 'zkSync Era',
              description: `ZK rollup with ${chain.latency}ms latency`,
            });
            break;
        }
      }
    }

    // Add provider-based integration summary
    if (providers.length > 0) {
      const avgReputation = providers.reduce((sum, p) => sum + p.reputation, 0) / providers.length;
      integrations.push({
        name: 'Data Provider Network',
        description: `${providers.length} active providers with ${(avgReputation * 100).toFixed(1)}% avg reputation`,
      });
    }

    return integrations;
  }

  /**
   * Gets RedStone risk metrics calculated from real network data.
   * Analyzes provider decentralization, data diversity, and network health.
   * @returns Promise resolving to RedStoneRiskMetrics object
   */
  async getRiskMetrics(): Promise<RedStoneRiskMetrics> {
    try {
      const providers = await this.getDataProviders();
      const networkStats = await this.getNetworkStats();

      // Calculate centralization risk based on provider concentration
      const centralizationRisk = this.calculateCentralizationRisk(providers);

      // Calculate liquidity risk based on data feeds and provider activity
      const liquidityRisk = this.calculateLiquidityRisk(providers, networkStats);

      // Calculate technical risk based on network performance
      const technicalRisk = this.calculateTechnicalRisk(networkStats);

      // Calculate overall risk as weighted average
      const overallRisk = centralizationRisk * 0.4 + liquidityRisk * 0.35 + technicalRisk * 0.25;

      return {
        centralizationRisk: Number(centralizationRisk.toFixed(4)),
        liquidityRisk: Number(liquidityRisk.toFixed(4)),
        technicalRisk: Number(technicalRisk.toFixed(4)),
        overallRisk: Number(overallRisk.toFixed(4)),
      };
    } catch (error) {
      console.warn('[RedStone] Failed to calculate risk metrics:', error);
      // Return zero risk on error (unknown state)
      return {
        centralizationRisk: 0,
        liquidityRisk: 0,
        technicalRisk: 0,
        overallRisk: 0,
      };
    }
  }

  /**
   * Calculates centralization risk based on provider concentration.
   * Uses Herfindahl-Hirschman Index (HHI) approach.
   * @param providers - Array of provider information
   * @returns Centralization risk score (0-1, higher is more risky)
   */
  private calculateCentralizationRisk(providers: RedStoneProviderInfo[]): number {
    if (providers.length === 0) return 1; // Max risk if no providers
    if (providers.length === 1) return 0.8; // High risk with single provider

    // Calculate market share based on data points contributed
    const totalDataPoints = providers.reduce((sum, p) => sum + p.dataPoints, 0);
    if (totalDataPoints === 0) return 0.5;

    // Calculate HHI
    let hhi = 0;
    for (const provider of providers) {
      const marketShare = provider.dataPoints / totalDataPoints;
      hhi += marketShare * marketShare;
    }

    // Normalize HHI to 0-1 range (HHI ranges from 1/n to 1)
    const minHHI = 1 / providers.length;
    const normalizedHHI = (hhi - minHHI) / (1 - minHHI);

    return Math.min(1, Math.max(0, normalizedHHI));
  }

  /**
   * Calculates liquidity risk based on data feed coverage and provider activity.
   * @param providers - Array of provider information
   * @param networkStats - Network statistics
   * @returns Liquidity risk score (0-1, higher is more risky)
   */
  private calculateLiquidityRisk(
    providers: RedStoneProviderInfo[],
    networkStats: RedStoneNetworkStats
  ): number {
    if (providers.length === 0) return 1;

    // Risk factors
    const providerCountRisk = Math.max(0, 1 - providers.length / 20); // Normalize to 20 providers
    const dataFeedRisk = Math.max(0, 1 - networkStats.dataFeeds / 100); // Normalize to 100 feeds
    const uptimeRisk = Math.max(0, 1 - networkStats.nodeUptime / 100); // Invert uptime

    // Weighted combination
    return providerCountRisk * 0.4 + dataFeedRisk * 0.35 + uptimeRisk * 0.25;
  }

  /**
   * Calculates technical risk based on network performance metrics.
   * @param networkStats - Network statistics
   * @returns Technical risk score (0-1, higher is more risky)
   */
  private calculateTechnicalRisk(networkStats: RedStoneNetworkStats): number {
    // Latency risk (higher latency = higher risk)
    const latencyRisk = Math.min(1, networkStats.latency / 1000);

    // Response time risk
    const responseTimeRisk = Math.min(1, networkStats.avgResponseTime / 5000);

    // Uptime risk (inverse of uptime)
    const uptimeRisk = Math.max(0, 1 - networkStats.nodeUptime / 100);

    // Weighted combination
    return latencyRisk * 0.4 + responseTimeRisk * 0.35 + uptimeRisk * 0.25;
  }

  async getSupportedChains(): Promise<RedStoneChainInfo[]> {
    const cacheKey = 'chains';
    const cached = this.getFromCache<RedStoneChainInfo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    this.setCache(cacheKey, REDSTONE_SUPPORTED_CHAINS, REDSTONE_CACHE_TTL.CHAINS);
    return REDSTONE_SUPPORTED_CHAINS;
  }

  /**
   * Gets multiple prices from RedStone API in a single request.
   * Falls back to individual price requests if batch request fails.
   * @param symbols - Array of trading symbols to fetch
   * @returns Promise resolving to a Map of symbol to PriceData
   */
  async getMultiplePrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    try {
      const symbolsParam = symbols.map((s) => s.toUpperCase()).join(',');
      const response = await fetch(
        `${REDSTONE_API_BASE}/prices?symbols=${symbolsParam}&provider=redstone-rapid`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: RedStonePriceResponse[] = await response.json();

      if (Array.isArray(data)) {
        for (const priceData of data) {
          const symbol = priceData.symbol.toUpperCase();
          results.set(symbol, this.parsePriceResponse(priceData, symbol));
        }
      }
    } catch {
      // Fallback to individual requests for symbols that weren't fetched
      const fetchedSymbols = new Set(results.keys());
      for (const symbol of symbols) {
        if (!fetchedSymbols.has(symbol.toUpperCase())) {
          try {
            const price = await this.getPrice(symbol);
            results.set(symbol.toUpperCase(), price);
          } catch {
            // Skip symbols that fail to fetch
          }
        }
      }
    }

    return results;
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

export { type RedStoneChainInfo } from '@/lib/oracles/redstoneConstants';
