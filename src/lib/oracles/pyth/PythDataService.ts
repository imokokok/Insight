import { HermesClient } from '@pythnetwork/hermes-client';

import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';

import {
  PYTH_PRICE_FEED_IDS,
  HERMES_API_URL,
  CACHE_TTL,
  normalizeSymbol,
  getSymbolFromPriceId,
} from '../pythConstants';

import { getCrossChainPrices } from './crossChain';
import {
  fetchPublishers,
  fetchValidators,
  fetchPriceFeeds,
  fetchNetworkStats,
} from './metadataFetching';
import {
  fetchLatestPrice,
  fetchMultiplePrices,
  fetchPriceAtTimestamp,
  fetchHistoricalPrices,
} from './priceFetching';
import { PythCache } from './pythCache';
import { parsePythPrice } from './pythParser';
import { PythWebSocket } from './pythWebSocket';
import { isPythPriceRaw } from './types';

import type {
  PublisherData,
  ValidatorData,
  PythServiceNetworkStats,
  CrossChainResult,
  PythServicePriceFeed,
  WebSocketConnectionState,
  ConnectionStateListener,
  PythPriceRaw,
} from './types';

const logger = createLogger('PythDataService');

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
    return fetchLatestPrice(this.hermesClient, this.cache, symbol);
  }

  async getPublishers(): Promise<PublisherData[]> {
    return fetchPublishers(this.cache);
  }

  async getValidators(): Promise<ValidatorData[]> {
    return fetchValidators(this.cache);
  }

  async getNetworkStats(): Promise<PythServiceNetworkStats> {
    return fetchNetworkStats(this.cache);
  }

  async getPriceFeeds(): Promise<PythServicePriceFeed[]> {
    return fetchPriceFeeds(this.cache);
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
    return fetchMultiplePrices(this.hermesClient, symbols);
  }

  async getPriceAtTimestamp(symbol: string, timestamp: number): Promise<PriceData | null> {
    return fetchPriceAtTimestamp(this.hermesClient, symbol, timestamp);
  }

  async getHistoricalPrices(
    symbol: string,
    hours: number = 24,
    intervalMinutes: number = 60
  ): Promise<PriceData[]> {
    return fetchHistoricalPrices(this.hermesClient, this.cache, symbol, hours, intervalMinutes);
  }

  async getCrossChainPrices(symbol: string = 'SOL/USD'): Promise<CrossChainResult> {
    const cacheKey = `crossChain:${symbol}`;
    const cached = this.cache.get<CrossChainResult>(cacheKey);
    if (cached) {
      logger.debug('Returning cached cross-chain prices', { symbol });
      return cached;
    }

    try {
      const result = await getCrossChainPrices(this.hermesClient, symbol);
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
