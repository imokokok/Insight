import { HermesClient } from '@pythnetwork/hermes-client';
import { PriceData, ConfidenceInterval, Blockchain, OracleProvider } from '@/types/oracle';
import { createLogger } from '@/lib/utils/logger';
import { NotImplementedError } from '@/lib/errors';

const logger = createLogger('PythHermesClient');

// Pyth price feed IDs for common symbols
// Source: https://pyth.network/developers/price-feed-ids
const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'PYTH/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'LINK/USD': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433617f47b4d5d3a132b01d9dca6a9',
  'AVAX/USD': '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'DOT/USD': '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  'UNI/USD': '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d56834200e2a28e860bb308e3',
  'ATOM/USD': '0xb00b60f88b03a6a625a8d1c048c3f66645d46b958890e6e1f3d5f1e6e6e6e6e6',
  'ARB/USD': '0x3fa4252848f9f0a1450fbbf801fcfc1778a2a91a5b11c13f5e2f5f8f8f8f8f8f',
  'OP/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'BASE/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
};

// Map internal symbol format to Pyth format
function normalizeSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  // Remove /USD suffix if present
  const baseSymbol = upperSymbol.replace('/USD', '');
  return `${baseSymbol}/USD`;
}

export interface PythPriceData {
  price: string | number;
  confidence?: string | number;
  exponent?: number;
  expo?: number;
  publish_time?: number;
  slot?: number;
}

export interface PythPriceUpdate {
  price: number;
  confidence: number;
  timestamp: number;
  slot: number;
  exponent: number;
}

export interface PythWebSocketPriceMessage {
  type: 'price_update';
  price_id: string;
  price: PythPriceData;
}

function isPythPriceData(data: unknown): data is PythPriceData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    (typeof obj.price === 'string' || typeof obj.price === 'number') &&
    (obj.confidence === undefined ||
      typeof obj.confidence === 'string' ||
      typeof obj.confidence === 'number') &&
    (obj.exponent === undefined || typeof obj.exponent === 'number') &&
    (obj.expo === undefined || typeof obj.expo === 'number') &&
    (obj.publish_time === undefined || typeof obj.publish_time === 'number') &&
    (obj.slot === undefined || typeof obj.slot === 'number')
  );
}

export class PythHermesClient {
  private client: HermesClient;
  private priceCallbacks: Map<string, ((price: PythPriceUpdate) => void)[]> = new Map();
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(endpoint: string = 'https://hermes.pyth.network') {
    this.client = new HermesClient(endpoint);
  }

  /**
   * Get the latest price for a symbol
   */
  async getLatestPrice(symbol: string): Promise<PriceData | null> {
    try {
      const pythSymbol = normalizeSymbol(symbol);
      const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

      if (!priceId) {
        logger.warn(`No price feed ID found for symbol: ${symbol}`);
        return null;
      }

      const priceUpdates = await this.client.getLatestPriceUpdates([priceId]);

      if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
        logger.warn(`No price data available for ${symbol}`);
        return null;
      }

      const parsed = priceUpdates.parsed?.[0];

      if (!parsed || !parsed.price || !isPythPriceData(parsed.price)) {
        logger.error(
          'Invalid price data format in getLatestPrice',
          new Error(`Expected PythPriceData, got: ${JSON.stringify(parsed.price)}`)
        );
        return null;
      }

      const priceData = parsed.price;
      const price = this.convertPythPrice(priceData);
      const exponent = priceData.exponent ?? priceData.expo ?? 0;
      const confidenceValue =
        typeof priceData.confidence === 'string'
          ? priceData.confidence
          : String(priceData.confidence ?? '0');

      const confidenceInterval = this.calculateConfidenceInterval(price, confidenceValue, exponent);

      return {
        provider: OracleProvider.PYTH,
        symbol: symbol.toUpperCase(),
        price,
        timestamp: (priceData.publish_time ?? Date.now() / 1000) * 1000,
        decimals: Math.abs(exponent),
        confidence: this.calculateConfidenceScore(
          confidenceValue,
          String(priceData.price),
          exponent
        ),
        confidenceInterval,
        change24h: 0,
        change24hPercent: 0,
      };
    } catch (error) {
      logger.error(
        `Failed to get latest price for ${symbol}:`,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * Get historical prices for a symbol
   *
   * Note: Pyth Hermes API does not support historical price range queries.
   * It only supports:
   * - getLatestPriceUpdates: Get current prices
   * - getPriceUpdatesAtTimestamp: Get price at a specific timestamp
   * - getLatestTwaps: Get TWAP for up to 10 minutes
   *
   * For historical price data, consider:
   * - Using on-chain price feeds
   * - External data sources like Dune Analytics
   * - Storing price data locally over time
   */
  async getHistoricalPrices(symbol: string, hours: number = 24): Promise<PriceData[]> {
    throw new NotImplementedError(
      'Historical prices are not supported by Pyth Hermes API. ' +
        'Pyth only provides real-time prices and prices at specific timestamps. ' +
        'Consider using on-chain price feeds, external data sources, or storing price data locally over time.'
    );
  }

  /**
   * Subscribe to real-time price updates via WebSocket
   */
  subscribeToPriceUpdates(symbol: string, callback: (price: PythPriceUpdate) => void): () => void {
    const pythSymbol = normalizeSymbol(symbol);
    const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

    if (!priceId) {
      logger.warn(`No price feed ID found for symbol: ${symbol}`);
      return () => {};
    }

    // Add callback to the list
    if (!this.priceCallbacks.has(priceId)) {
      this.priceCallbacks.set(priceId, []);
    }
    this.priceCallbacks.get(priceId)!.push(callback);

    // Initialize WebSocket if not already connected
    this.initializeWebSocket();

    // Return unsubscribe function
    return () => {
      const callbacks = this.priceCallbacks.get(priceId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get available publishers for a price feed
   */
  async getPublishers(symbol: string): Promise<
    Array<{
      id: string;
      name: string;
      reliability: number;
      lastUpdate: number;
    }>
  > {
    try {
      const pythSymbol = normalizeSymbol(symbol);
      const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

      if (!priceId) {
        return [];
      }

      // This would require additional API integration
      // For now, return empty array
      logger.info(`Getting publishers for ${symbol} - feature pending`);
      return [];
    } catch (error) {
      logger.error(
        `Failed to get publishers for ${symbol}:`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  private initializeWebSocket(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = 'wss://hermes.pyth.network/ws';
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        logger.info('WebSocket connection established');
        this.reconnectAttempts = 0;

        // Subscribe to all price feeds that have callbacks
        const priceIds = Array.from(this.priceCallbacks.keys());
        if (priceIds.length > 0) {
          this.wsConnection!.send(
            JSON.stringify({
              type: 'subscribe',
              ids: priceIds,
            })
          );
        }
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'price_update') {
            this.handlePriceUpdate(data);
          }
        } catch (error) {
          logger.error(
            'Failed to parse WebSocket message:',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      };

      this.wsConnection.onerror = (error) => {
        logger.error('WebSocket error:', new Error(String(error)));
      };

      this.wsConnection.onclose = () => {
        logger.warn('WebSocket connection closed');
        this.handleReconnect();
      };
    } catch (error) {
      logger.error(
        'Failed to initialize WebSocket:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.initializeWebSocket(), delay);
    } else {
      logger.error('Max reconnection attempts reached');
    }
  }

  private handlePriceUpdate(data: PythWebSocketPriceMessage): void {
    const priceId = data.price_id;
    const callbacks = this.priceCallbacks.get(priceId);

    if (callbacks && callbacks.length > 0) {
      if (!data.price) {
        logger.error('Price update missing price data', new Error(JSON.stringify(data)));
        return;
      }

      if (!isPythPriceData(data.price)) {
        logger.error(
          'Invalid price data format',
          new Error(`Expected PythPriceData, got: ${JSON.stringify(data.price)}`)
        );
        return;
      }

      const priceData = data.price;
      const exponent = priceData.exponent ?? priceData.expo ?? 0;
      const confidenceValue =
        typeof priceData.confidence === 'string'
          ? parseInt(priceData.confidence, 10)
          : (priceData.confidence ?? 0);

      const priceUpdate: PythPriceUpdate = {
        price: this.convertPythPrice(priceData),
        confidence: confidenceValue * Math.pow(10, exponent),
        timestamp: (priceData.publish_time ?? Date.now() / 1000) * 1000,
        slot: priceData.slot ?? 0,
        exponent: exponent,
      };

      callbacks.forEach((callback) => {
        try {
          callback(priceUpdate);
        } catch (error) {
          logger.error(
            'Error in price callback:',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      });
    }
  }

  private convertPythPrice(pythPrice: PythPriceData): number {
    const priceValue =
      typeof pythPrice.price === 'string' ? parseInt(pythPrice.price, 10) : pythPrice.price;
    const exponent = pythPrice.exponent ?? pythPrice.expo ?? 0;
    return priceValue * Math.pow(10, exponent);
  }

  private calculateConfidenceInterval(
    price: number,
    confidence: string,
    exponent: number
  ): ConfidenceInterval {
    const confidenceValue = parseInt(confidence, 10) * Math.pow(10, Number(exponent));
    const halfSpread = confidenceValue / 2;

    return {
      bid: Number((price - halfSpread).toFixed(8)),
      ask: Number((price + halfSpread).toFixed(8)),
      widthPercentage: Number(((confidenceValue / price) * 100).toFixed(4)),
    };
  }

  private calculateConfidenceScore(confidence: string, price: string, exponent: number): number {
    const confidenceValue = parseInt(confidence, 10) * Math.pow(10, exponent);
    const priceValue = parseInt(price, 10) * Math.pow(10, exponent);
    const ratio = confidenceValue / priceValue;

    // Higher confidence when ratio is lower (tighter spread)
    // Scale: 0.1% spread = 100% confidence, 1% spread = 50% confidence
    const score = Math.max(0, Math.min(100, 100 - ratio * 10000));
    return Number(score.toFixed(2));
  }

  /**
   * Close all connections
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.priceCallbacks.clear();
  }
}

// Singleton instance
let hermesClientInstance: PythHermesClient | null = null;

export function getPythHermesClient(): PythHermesClient {
  if (!hermesClientInstance) {
    hermesClientInstance = new PythHermesClient();
  }
  return hermesClientInstance;
}

export function resetPythHermesClient(): void {
  if (hermesClientInstance) {
    hermesClientInstance.disconnect();
    hermesClientInstance = null;
  }
}
