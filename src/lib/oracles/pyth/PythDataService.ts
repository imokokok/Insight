import { HermesClient } from '@pythnetwork/hermes-client';

import type {
  PublisherData,
  ValidatorData,
  PythServiceNetworkStats,
  CrossChainPriceData,
  CrossChainResult,
  PythServicePriceFeed,
} from '@/app/[locale]/pyth/types';
import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';

import {
  PYTH_PRICE_FEED_IDS,
  HERMES_API_URL,
  CACHE_TTL,
  normalizeSymbol,
  getSymbolFromPriceId,
  DEFAULT_RETRY_CONFIG,
} from '../pythConstants';
import { PYTH_PUBLISHERS, PYTH_PUBLISHER_STATS } from '../pythPublishersData';

import { PythCache } from './pythCache';
import { parsePythPrice, parsePublisherStatus } from './pythParser';
import { PythWebSocket, PriceUpdateCallback } from './pythWebSocket';
import { isPythPriceRaw } from './types';

import type { RetryConfig } from '../pythConstants';
import type { WebSocketConnectionState, ConnectionStateListener, PythPriceRaw } from './types';

const logger = createLogger('PythDataService');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.baseDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`${operationName} failed (attempt ${attempt}/${config.maxAttempts})`, {
        error: lastError.message,
      });

      if (attempt < config.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
}

export class PythDataService {
  private hermesClient: HermesClient;
  private cache: PythCache;
  private wsManager: PythWebSocket;
  private priceCallbacks: Map<string, ((price: PriceData) => void)[]> = new Map();

  constructor(hermesEndpoint: string = HERMES_API_URL) {
    this.hermesClient = new HermesClient(hermesEndpoint);
    this.cache = new PythCache();
    this.wsManager = new PythWebSocket({
      onPriceUpdate: this.handlePriceUpdate.bind(this),
    });
    logger.info('PythDataService initialized', { endpoint: hermesEndpoint });
  }

  subscribeToConnectionState(listener: ConnectionStateListener): () => void {
    return this.wsManager.subscribeToConnectionState(listener);
  }

  getConnectionState(): WebSocketConnectionState {
    return this.wsManager.getConnectionState();
  }

  isWebSocketConnected(): boolean {
    return this.wsManager.isConnected();
  }

  async getLatestPrice(symbol: string): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      logger.debug('Returning cached price', { symbol });
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const pythSymbol = normalizeSymbol(symbol);
          const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

          if (!priceId) {
            logger.warn('No price feed ID found for symbol', { symbol });
            return null;
          }

          const priceUpdates = await this.hermesClient.getLatestPriceUpdates([priceId]);

          if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
            logger.warn('No price data available', { symbol });
            return null;
          }

          const parsed = priceUpdates.parsed[0];

          if (!parsed || !parsed.price || !isPythPriceRaw(parsed.price)) {
            logger.error('Invalid price data format', new Error(JSON.stringify(parsed)));
            return null;
          }

          return parsePythPrice(parsed.price, symbol);
        },
        DEFAULT_RETRY_CONFIG,
        'getLatestPrice'
      );

      if (result) {
        this.cache.set(cacheKey, result, CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get latest price',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

  async getPublishers(): Promise<PublisherData[]> {
    const cacheKey = 'publishers';
    const cached = this.cache.get<PublisherData[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached publishers');
      return cached;
    }

    logger.info('Returning official Pyth publishers data');
    const publishers = PYTH_PUBLISHERS.map((p) => ({
      ...p,
      lastUpdate: Date.now(),
    }));

    this.cache.set(cacheKey, publishers, CACHE_TTL.PUBLISHERS);
    return publishers;
  }

  async getValidators(): Promise<ValidatorData[]> {
    const cacheKey = 'validators';
    const cached = this.cache.get<ValidatorData[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached validators');
      return cached;
    }

    logger.warn('No validator data available - API does not provide validator data');
    return [];
  }

  async getNetworkStats(): Promise<PythServiceNetworkStats> {
    const cacheKey = 'networkStats';
    const cached = this.cache.get<PythServiceNetworkStats>(cacheKey);
    if (cached) {
      logger.debug('Returning cached network stats');
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const [publishers, feeds] = await Promise.all([
            this.getPublishers(),
            this.getPriceFeeds(),
          ]);

          const activePublishers = publishers.filter((p) => p.status === 'active').length;

          return {
            totalPublishers: publishers.length,
            activePublishers,
            totalPriceFeeds: feeds.length,
            totalSubmissions24h: this.calculateTotalSubmissions(publishers),
            averageLatency: this.calculateAverageLatency(publishers),
            uptimePercentage: 99.9,
            lastUpdated: Date.now(),
          };
        },
        DEFAULT_RETRY_CONFIG,
        'getNetworkStats'
      );

      this.cache.set(cacheKey, result, CACHE_TTL.STATS);
      return result;
    } catch (error) {
      logger.error(
        'Failed to get network stats',
        error instanceof Error ? error : new Error(String(error))
      );
      return this.getFallbackNetworkStats();
    }
  }

  async getPriceFeeds(): Promise<PythServicePriceFeed[]> {
    const cacheKey = 'priceFeeds';
    const cached = this.cache.get<PythServicePriceFeed[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached price feeds');
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const feeds: PythServicePriceFeed[] = [];

          for (const [symbol, id] of Object.entries(PYTH_PRICE_FEED_IDS)) {
            feeds.push({
              id,
              symbol,
              description: `${symbol} Price Feed`,
              assetType: symbol.includes('USD') ? 'Crypto' : 'Unknown',
              status: 'active',
            });
          }

          return feeds;
        },
        DEFAULT_RETRY_CONFIG,
        'getPriceFeeds'
      );

      this.cache.set(cacheKey, result, CACHE_TTL.FEEDS);
      return result;
    } catch (error) {
      logger.error(
        'Failed to get price feeds',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  subscribeToPriceUpdates(symbol: string, callback: (price: PriceData) => void): () => void {
    const pythSymbol = normalizeSymbol(symbol);
    const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

    if (!priceId) {
      logger.warn('No price feed ID found for symbol', { symbol });
      return () => {};
    }

    if (!this.priceCallbacks.has(priceId)) {
      this.priceCallbacks.set(priceId, []);
    }
    this.priceCallbacks.get(priceId)!.push(callback);

    if (this.wsManager.isConnected()) {
      this.wsManager.subscribeToPriceIds([priceId]);
    } else {
      this.wsManager.initialize();
    }

    return () => {
      const callbacks = this.priceCallbacks.get(priceId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.priceCallbacks.delete(priceId);
          if (this.wsManager.isConnected()) {
            this.wsManager.unsubscribeFromPriceIds([priceId]);
          }
        }
      }
    };
  }

  async getMultiplePrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    const priceIds: string[] = [];
    const symbolToId = new Map<string, string>();

    for (const symbol of symbols) {
      const pythSymbol = normalizeSymbol(symbol);
      const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];
      if (priceId) {
        priceIds.push(priceId);
        symbolToId.set(priceId, symbol);
      }
    }

    if (priceIds.length === 0) {
      return results;
    }

    try {
      const priceUpdates = await withRetry(
        () => this.hermesClient.getLatestPriceUpdates(priceIds),
        DEFAULT_RETRY_CONFIG,
        'getMultiplePrices'
      );

      if (priceUpdates.parsed) {
        for (const parsed of priceUpdates.parsed) {
          if (parsed.price && isPythPriceRaw(parsed.price)) {
            const symbol = symbolToId.get(parsed.id);
            if (symbol) {
              const priceData = parsePythPrice(parsed.price, symbol);
              results.set(symbol, priceData);
            }
          }
        }
      }
    } catch (error) {
      logger.error(
        'Failed to get multiple prices',
        error instanceof Error ? error : new Error(String(error)),
        { symbols }
      );
    }

    return results;
  }

  async getPriceAtTimestamp(symbol: string, timestamp: number): Promise<PriceData | null> {
    try {
      const pythSymbol = normalizeSymbol(symbol);
      const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

      if (!priceId) {
        logger.warn('No price feed ID found for symbol', { symbol });
        return null;
      }

      const result = await withRetry(
        async () => {
          const priceUpdates = await this.hermesClient.getPriceUpdatesAtTimestamp(
            Math.floor(timestamp / 1000),
            [priceId]
          );

          if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
            return null;
          }

          const parsed = priceUpdates.parsed[0];
          if (!parsed || !parsed.price || !isPythPriceRaw(parsed.price)) {
            return null;
          }

          return parsePythPrice(parsed.price, symbol);
        },
        DEFAULT_RETRY_CONFIG,
        'getPriceAtTimestamp'
      );

      return result;
    } catch (error) {
      logger.error(
        'Failed to get price at timestamp',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, timestamp }
      );
      return null;
    }
  }

  async getHistoricalPrices(
    symbol: string,
    hours: number = 24,
    intervalMinutes: number = 60
  ): Promise<PriceData[]> {
    const cacheKey = `historical:${symbol}:${hours}:${intervalMinutes}`;
    const cached = this.cache.get<PriceData[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached historical prices', { symbol, hours });
      return cached;
    }

    try {
      const pythSymbol = normalizeSymbol(symbol);
      const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

      if (!priceId) {
        logger.warn('No price feed ID found for symbol', { symbol });
        return [];
      }

      const now = Math.floor(Date.now() / 1000);
      const from = now - hours * 60 * 60;
      const dataPoints = Math.ceil((hours * 60) / intervalMinutes);

      logger.info(`Fetching historical prices for ${symbol} (${hours}h, ${dataPoints} points)`);

      const result = await withRetry(
        async () => {
          const priceUpdates = await this.hermesClient.getPriceUpdatesAtTimestamp(from, [priceId]);

          if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
            logger.warn('No historical price data available', { symbol, hours });
            return [];
          }

          const allPrices: PriceData[] = [];
          for (const parsed of priceUpdates.parsed) {
            if (parsed && parsed.price && isPythPriceRaw(parsed.price)) {
              const priceData = parsePythPrice(parsed.price, symbol);
              allPrices.push(priceData);
            }
          }

          allPrices.sort((a, b) => a.timestamp - b.timestamp);

          if (allPrices.length > dataPoints * 2) {
            const sampled: PriceData[] = [];
            const step = Math.floor(allPrices.length / dataPoints);
            for (let i = 0; i < allPrices.length; i += step) {
              sampled.push(allPrices[i]);
            }
            return sampled;
          }

          return allPrices;
        },
        DEFAULT_RETRY_CONFIG,
        'getHistoricalPrices'
      );

      if (result.length > 0) {
        this.cache.set(cacheKey, result, CACHE_TTL.PRICE);
        logger.info(`Successfully fetched ${result.length} historical price points for ${symbol}`);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get historical prices',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, hours }
      );
      return [];
    }
  }

  async getCrossChainPrices(symbol: string = 'SOL/USD'): Promise<CrossChainResult> {
    const cacheKey = `crossChain:${symbol}`;
    const cached = this.cache.get<CrossChainResult>(cacheKey);
    if (cached) {
      logger.debug('Returning cached cross-chain prices', { symbol });
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const pythSymbol = normalizeSymbol(symbol);
          const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

          if (!priceId) {
            throw new Error(`No price feed ID found for symbol: ${symbol}`);
          }

          const priceUpdates = await this.hermesClient.getLatestPriceUpdates([priceId]);

          if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
            throw new Error(`No price data available for cross-chain: ${symbol}`);
          }

          const parsed = priceUpdates.parsed[0];
          if (!parsed || !parsed.price || !isPythPriceRaw(parsed.price)) {
            throw new Error(`Invalid price data format for ${symbol}`);
          }

          const basePriceData = parsePythPrice(parsed.price, symbol);
          const basePrice = basePriceData.price;
          const timestamp = basePriceData.timestamp;

          const chainData = await this.fetchChainSpecificData(priceId, basePrice);

          return {
            data: chainData,
            basePrice,
            timestamp,
          };
        },
        DEFAULT_RETRY_CONFIG,
        'getCrossChainPrices'
      );

      this.cache.set(cacheKey, result, CACHE_TTL.CROSS_CHAIN);
      return result;
    } catch (error) {
      logger.error(
        'Failed to get cross-chain prices',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      throw error;
    }
  }

  private async fetchChainSpecificData(
    priceId: string,
    basePrice: number
  ): Promise<CrossChainPriceData[]> {
    const chains = [
      { id: 'solana', name: 'Solana', endpoint: HERMES_API_URL },
      { id: 'ethereum', name: 'Ethereum', endpoint: HERMES_API_URL },
      { id: 'arbitrum', name: 'Arbitrum', endpoint: HERMES_API_URL },
      { id: 'optimism', name: 'Optimism', endpoint: HERMES_API_URL },
      { id: 'polygon', name: 'Polygon', endpoint: HERMES_API_URL },
      { id: 'base', name: 'Base', endpoint: HERMES_API_URL },
      { id: 'avalanche', name: 'Avalanche', endpoint: HERMES_API_URL },
      { id: 'bsc', name: 'BNB Chain', endpoint: HERMES_API_URL },
    ];

    const results: CrossChainPriceData[] = [];

    for (const chain of chains) {
      try {
        const chainStartTime = Date.now();
        const response = await fetch(
          `${chain.endpoint}/api/latest_price_updates?ids[]=${priceId}`,
          {
            signal: AbortSignal.timeout(5000),
          }
        );

        const latency = Date.now() - chainStartTime;

        if (!response.ok) {
          results.push({
            chain: chain.id,
            price: basePrice,
            deviation: 0,
            latency,
            status: 'degraded',
            lastUpdate: new Date(),
          });
          continue;
        }

        const data = await response.json();
        const parsed = data.parsed?.[0];

        if (parsed?.price && isPythPriceRaw(parsed.price)) {
          const priceValue =
            typeof parsed.price.price === 'string'
              ? parseInt(parsed.price.price, 10)
              : parsed.price.price;
          const exponent = parsed.price.expo ?? -8;
          const price = priceValue * Math.pow(10, exponent);
          const deviation = basePrice > 0 ? ((price - basePrice) / basePrice) * 100 : 0;

          const status: 'online' | 'degraded' | 'offline' =
            latency < 200 && Math.abs(deviation) < 0.5
              ? 'online'
              : latency < 500 && Math.abs(deviation) < 1
                ? 'degraded'
                : 'offline';

          results.push({
            chain: chain.id,
            price,
            deviation,
            latency,
            status,
            lastUpdate: new Date((parsed.price.publish_time ?? Date.now() / 1000) * 1000),
          });
        } else {
          results.push({
            chain: chain.id,
            price: basePrice,
            deviation: 0,
            latency,
            status: 'degraded',
            lastUpdate: new Date(),
          });
        }
      } catch (_error) {
        results.push({
          chain: chain.id,
          price: basePrice,
          deviation: 0,
          latency: 999,
          status: 'offline',
          lastUpdate: new Date(),
        });
      }
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  disconnect(): void {
    this.wsManager.disconnect();
    this.priceCallbacks.clear();
    this.cache.clear();
    logger.info('PythDataService disconnected');
  }

  private handlePriceUpdate(priceId: string, price: PythPriceRaw): void {
    const callbacks = this.priceCallbacks.get(priceId);

    if (callbacks && callbacks.length > 0) {
      const symbol = getSymbolFromPriceId(priceId);
      if (symbol) {
        const priceData = parsePythPrice(price, symbol);
        callbacks.forEach((callback) => {
          try {
            callback(priceData);
          } catch (error) {
            logger.error(
              'Error in price callback',
              error instanceof Error ? error : new Error(String(error))
            );
          }
        });
      }
    }
  }

  private getFallbackNetworkStats(): PythServiceNetworkStats {
    return {
      totalPublishers: PYTH_PUBLISHER_STATS.totalPublishers,
      activePublishers: PYTH_PUBLISHER_STATS.activePublishers,
      totalPriceFeeds: Object.keys(PYTH_PRICE_FEED_IDS).length,
      totalSubmissions24h: PYTH_PUBLISHER_STATS.totalStake,
      averageLatency: 42,
      uptimePercentage: 99.9,
      lastUpdated: Date.now(),
    };
  }

  private calculateTotalSubmissions(publishers: PublisherData[]): number {
    return publishers.reduce((sum, p) => sum + (p.totalSubmissions ?? 0), 0);
  }

  private calculateAverageLatency(publishers: PublisherData[]): number {
    if (publishers.length === 0) return 0;
    const total = publishers.reduce((sum, p) => sum + (p.averageLatency ?? 0), 0);
    return Math.round(total / publishers.length);
  }
}

let pythDataServiceInstance: PythDataService | null = null;

export function getPythDataService(): PythDataService {
  if (!pythDataServiceInstance) {
    pythDataServiceInstance = new PythDataService();
  }
  return pythDataServiceInstance;
}

export function resetPythDataService(): void {
  if (pythDataServiceInstance) {
    pythDataServiceInstance.disconnect();
    pythDataServiceInstance = null;
  }
}
