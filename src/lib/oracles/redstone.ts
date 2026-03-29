import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

import { BaseOracleClient } from './base';

import type { OracleClientConfig } from './base';

const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  REDSTONE: 0.08,
  USDC: 0.01,
};

const REDSTONE_API_BASE = 'https://api.redstone.finance';
const REDSTONE_CACHE_TTL = {
  PRICE: 10000,
  PROVIDERS: 60000,
  STATS: 30000,
  CHAINS: 300000,
  ECOSYSTEM: 300000,
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

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
}

interface RedStoneProviderResponse {
  name: string;
  address?: string;
  dataFeedsCount?: number;
  lastUpdateTimestamp?: number;
  totalDataPoints?: number;
  reputation?: number;
}

export interface RedStoneProviderInfo {
  id: string;
  name: string;
  reputation: number;
  dataPoints: number;
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

export interface RedStoneChainInfo {
  chain: string;
  latency: number;
  updateFreq: number;
  status: 'active' | 'inactive';
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;
  let delay = baseDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
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

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const baseSpread = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    const randomFactor = 0.8 + Math.random() * 0.4;
    const spreadPercentage = baseSpread * randomFactor;

    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(spreadPercentage.toFixed(4)),
    };
  }

  private async fetchRealPrice(symbol: string): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: RedStonePriceResponse[] = await response.json();

          if (!Array.isArray(data) || data.length === 0) {
            return null;
          }

          const priceData = data[0];
          return this.parsePriceResponse(priceData, symbol);
        },
        3,
        1000,
        'fetchRealPrice'
      );

      if (result) {
        this.setCache(cacheKey, result, REDSTONE_CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      return null;
    }
  }

  private parsePriceResponse(response: RedStonePriceResponse, symbol: string): PriceData {
    const price = response.value;
    const timestamp = response.timestamp * 1000;
    const confidenceInterval = this.generateConfidenceInterval(price, symbol);

    return {
      provider: this.name,
      symbol: symbol.toUpperCase(),
      price,
      timestamp,
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
      confidenceInterval,
      change24h: 0,
      change24hPercent: 0,
      source: response.provider,
    };
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const realPrice = await this.fetchRealPrice(symbol);

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

      return priceData;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from RedStone',
        'REDSTONE_ERROR'
      );
    }
  }

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
        modularFee: 0.0001 + Math.random() * 0.0002,
        dataFreshnessScore: 95 + Math.random() * 4,
        providerCount: providers.length || 15 + Math.floor(Math.random() * 10),
        avgProviderReputation: avgReputation,
      };

      this.setCache(cacheKey, metrics, REDSTONE_CACHE_TTL.STATS);
      return metrics;
    } catch {
      return {
        modularFee: 0.0001 + Math.random() * 0.0002,
        dataFreshnessScore: 95 + Math.random() * 4,
        providerCount: 15 + Math.floor(Math.random() * 10),
        avgProviderReputation: 0.85 + Math.random() * 0.1,
      };
    }
  }

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
            reputation: provider.reputation || 0.85 + Math.random() * 0.15,
            dataPoints: provider.totalDataPoints || Math.floor(Math.random() * 1000000),
            lastUpdate: provider.lastUpdateTimestamp
              ? provider.lastUpdateTimestamp * 1000
              : Date.now(),
          }));
        },
        3,
        1000,
        'getDataProviders'
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

  async getNetworkStats(): Promise<RedStoneNetworkStats> {
    const cacheKey = 'networkStats';
    const cached = this.getFromCache<RedStoneNetworkStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const providers = await this.getDataProviders();
      const activeNodes = providers.length > 0 ? providers.length : 50 + Math.floor(Math.random() * 20);

      const stats: RedStoneNetworkStats = {
        activeNodes,
        dataFeeds: 200 + Math.floor(Math.random() * 50),
        nodeUptime: 99.5 + Math.random() * 0.4,
        avgResponseTime: 150 + Math.floor(Math.random() * 100),
        latency: 50 + Math.floor(Math.random() * 50),
      };

      this.setCache(cacheKey, stats, REDSTONE_CACHE_TTL.STATS);
      return stats;
    } catch {
      return {
        activeNodes: 50 + Math.floor(Math.random() * 20),
        dataFeeds: 200 + Math.floor(Math.random() * 50),
        nodeUptime: 99.5 + Math.random() * 0.4,
        avgResponseTime: 150 + Math.floor(Math.random() * 100),
        latency: 50 + Math.floor(Math.random() * 50),
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
      centralizationRisk: 0.2 + Math.random() * 0.1,
      liquidityRisk: 0.15 + Math.random() * 0.1,
      technicalRisk: 0.1 + Math.random() * 0.05,
      overallRisk: 0.15 + Math.random() * 0.1,
    };
  }

  async getSupportedChains(): Promise<RedStoneChainInfo[]> {
    const cacheKey = 'chains';
    const cached = this.getFromCache<RedStoneChainInfo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const chains: RedStoneChainInfo[] = [
      { chain: 'Ethereum', latency: 80, updateFreq: 60, status: 'active' },
      { chain: 'Arbitrum', latency: 65, updateFreq: 30, status: 'active' },
      { chain: 'Optimism', latency: 70, updateFreq: 30, status: 'active' },
      { chain: 'Polygon', latency: 75, updateFreq: 45, status: 'active' },
      { chain: 'Avalanche', latency: 85, updateFreq: 60, status: 'active' },
      { chain: 'Base', latency: 60, updateFreq: 30, status: 'active' },
      { chain: 'BNB Chain', latency: 90, updateFreq: 60, status: 'active' },
      { chain: 'Fantom', latency: 95, updateFreq: 60, status: 'active' },
      { chain: 'Linea', latency: 70, updateFreq: 45, status: 'active' },
      { chain: 'Mantle', latency: 75, updateFreq: 45, status: 'active' },
      { chain: 'Scroll', latency: 80, updateFreq: 60, status: 'active' },
      { chain: 'zkSync', latency: 72, updateFreq: 45, status: 'active' },
    ];

    this.setCache(cacheKey, chains, REDSTONE_CACHE_TTL.CHAINS);
    return chains;
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
