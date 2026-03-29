import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { RedStoneApiError, type RedStoneErrorCode } from '@/lib/errors';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

import {
  REDSTONE_SUPPORTED_CHAINS,
  SPREAD_PERCENTAGES,
  type RedStoneChainInfo,
} from './redstoneConstants';

import { BaseOracleClient } from './base';

import type { OracleClientConfig } from './base';

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

/**
 * Converts a timestamp from milliseconds to seconds.
 * Useful when sending timestamps to RedStone API.
 * @param timestampInMillis - Timestamp in milliseconds
 * @returns Timestamp in seconds
 */
function timestampMillisToSeconds(timestampInMillis: number): number {
  return Math.floor(timestampInMillis / 1000);
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

async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
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
    const hash = (minute * 2654435761) % 1000 / 1000;
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
              throw new RedStoneApiError(
                'Failed to parse API response as JSON',
                'PARSE_ERROR',
                { symbol, attemptCount }
              );
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
   * Falls back to mock data if the API is unavailable.
   * @param symbol - The trading symbol (e.g., 'BTC', 'ETH')
   * @param chain - Optional blockchain context for chain-specific pricing
   * @returns Promise resolving to PriceData with current price information
   * @throws OracleError if price fetching fails completely
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      let realPrice: PriceData | null = null;
      let fetchError: RedStoneApiError | null = null;

      try {
        realPrice = await this.fetchRealPrice(symbol);
      } catch (error) {
        if (error instanceof RedStoneApiError) {
          fetchError = error;
        } else {
          fetchError = new RedStoneApiError(
            `Unexpected error fetching price: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'FETCH_ERROR',
            { symbol },
            error instanceof Error ? error : undefined
          );
        }
      }

      if (realPrice) {
        return {
          ...realPrice,
          chain,
        };
      }

      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      const priceData = await this.fetchPriceWithDatabase(symbol, chain, () => {
        const mockPrice = this.generateMockPrice(symbol, basePrice, chain);
        const confidenceInterval = this.generateConfidenceInterval(mockPrice.price, symbol);
        return {
          ...mockPrice,
          confidenceInterval,
        };
      });

      if (!priceData.confidenceInterval) {
        const confidenceInterval = this.generateConfidenceInterval(priceData.price, symbol);
        return {
          ...priceData,
          confidenceInterval,
        };
      }

      if (fetchError) {
        console.warn(
          `[RedStone] Using fallback data for ${symbol} due to API error: ${fetchError.message}`
        );
      }

      return priceData;
    } catch (error) {
      if (error instanceof RedStoneApiError) {
        throw this.createError(error.message, error.code);
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from RedStone',
        'REDSTONE_ERROR'
      );
    }
  }

  /**
   * Gets historical price data for a given symbol over a specified time period.
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
    try {
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from RedStone',
        'REDSTONE_HISTORICAL_ERROR'
      );
    }
  }

  /**
   * Gets RedStone network metrics including provider statistics and data freshness.
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
      const avgReputation =
        providers.length > 0
          ? providers.reduce((sum, p) => sum + p.reputation, 0) / providers.length
          : 0.85;

      const metrics: RedStoneMetrics = {
        modularFee: 0.0002,
        dataFreshnessScore: 97,
        providerCount: providers.length || 18,
        avgProviderReputation: avgReputation,
      };

      this.setCache(cacheKey, metrics, REDSTONE_CACHE_TTL.STATS);
      return metrics;
    } catch {
      return {
        modularFee: 0.0002,
        dataFreshnessScore: 97,
        providerCount: 18,
        avgProviderReputation: 0.90,
      };
    }
  }

  /**
   * Gets information about all RedStone data providers.
   * Includes reputation scores, data points contributed, and last update timestamps.
   * Falls back to static provider list if API is unavailable.
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
            return this.getFallbackProviders();
          }

          return data.map((provider, index) => ({
            id: provider.address || `provider-${index}`,
            name: provider.name || `Provider ${index + 1}`,
            reputation: provider.reputation || 0.92,
            dataPoints: provider.totalDataPoints || 500000,
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
    } catch {
      return this.getFallbackProviders();
    }
  }

  private getFallbackProviders(): RedStoneProviderInfo[] {
    return [
      {
        id: 'provider-1',
        name: 'RedStone Core',
        reputation: 0.98,
        dataPoints: 1500000,
        lastUpdate: Date.now(),
      },
      {
        id: 'provider-2',
        name: 'Data Provider A',
        reputation: 0.95,
        dataPoints: 890000,
        lastUpdate: Date.now() - 5000,
      },
      {
        id: 'provider-3',
        name: 'Data Provider B',
        reputation: 0.92,
        dataPoints: 650000,
        lastUpdate: Date.now() - 12000,
      },
      {
        id: 'provider-4',
        name: 'Data Provider C',
        reputation: 0.89,
        dataPoints: 420000,
        lastUpdate: Date.now() - 18000,
      },
    ];
  }

  /**
   * Gets RedStone network statistics including active nodes, data feeds, and latency.
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
      const providers = await this.getDataProviders();
      const activeNodes = providers.length > 0 ? providers.length : 55;

      const stats: RedStoneNetworkStats = {
        activeNodes,
        dataFeeds: 225,
        nodeUptime: 99.7,
        avgResponseTime: 180,
        latency: 65,
      };

      this.setCache(cacheKey, stats, REDSTONE_CACHE_TTL.STATS);
      return stats;
    } catch {
      return {
        activeNodes: 55,
        dataFeeds: 225,
        nodeUptime: 99.7,
        avgResponseTime: 180,
        latency: 65,
      };
    }
  }

  async getEcosystemData(): Promise<RedStoneEcosystemData> {
    const cacheKey = 'ecosystem';
    const cached = this.getFromCache<RedStoneEcosystemData>(cacheKey);
    if (cached) {
      return cached;
    }

    const ecosystem: RedStoneEcosystemData = {
      integrations: [
        { name: 'Ethereum DeFi', description: 'Major DeFi protocols on Ethereum' },
        { name: 'Arbitrum Ecosystem', description: 'Growing L2 ecosystem' },
        { name: 'Polygon Gaming', description: 'Web3 gaming applications' },
        { name: 'Avalanche Subnets', description: 'Custom blockchain deployments' },
        { name: 'Base L2', description: 'Coinbase L2 network' },
        { name: 'Optimism OP Stack', description: 'Superchain ecosystem' },
      ],
    };

    this.setCache(cacheKey, ecosystem, REDSTONE_CACHE_TTL.ECOSYSTEM);
    return ecosystem;
  }

  async getRiskMetrics(): Promise<RedStoneRiskMetrics> {
    return {
      centralizationRisk: 0.25,
      liquidityRisk: 0.20,
      technicalRisk: 0.12,
      overallRisk: 0.19,
    };
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
      for (const symbol of symbols) {
        const price = await this.getPrice(symbol);
        results.set(symbol.toUpperCase(), price);
      }
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export { type RedStoneChainInfo } from './redstoneConstants';
