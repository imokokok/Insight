import { createLogger } from '@/lib/utils/logger';

import { HERMES_WS_URL } from '../constants/pythConstants';

import { isPythPriceRaw } from './types';

import type {
  WebSocketConnectionState,
  WebSocketConnectionStatus,
  ConnectionStateListener,
  PythPriceRaw,
} from './types';

const logger = createLogger('PythWebSocket');

type PriceUpdateCallback = (priceId: string, price: PythPriceRaw) => void;

interface PythWebSocketOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onPriceUpdate?: PriceUpdateCallback;
}

export class PythWebSocket {
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private isShuttingDown = false;
  private connectionStateListeners: Set<ConnectionStateListener> = new Set();
  private connectionState: WebSocketConnectionState = {
    status: 'disconnected',
    isConnected: false,
    lastUpdateLatency: 0,
    reconnectAttempts: 0,
    error: null,
  };
  private lastUpdateTime: number = Date.now();
  private onPriceUpdate?: PriceUpdateCallback;
  private subscribedPriceIds: Set<string> = new Set();

  constructor(options: PythWebSocketOptions = {}) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
    this.onPriceUpdate = options.onPriceUpdate;
  }

  subscribeToConnectionState(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  private updateConnectionState(updates: Partial<WebSocketConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.connectionStateListeners.forEach((listener) => {
      try {
        listener(this.connectionState);
      } catch (error) {
        logger.error(
          'Error in connection state listener',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  isConnected(): boolean {
    return this.wsConnection?.readyState === WebSocket.OPEN;
  }

  getStatus(): WebSocketConnectionStatus {
    return this.connectionState.status;
  }

  initialize(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.wsConnection?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.isShuttingDown = false;
    this.reconnectAttempts = 0;

    this.updateConnectionState({
      status: 'connecting',
      isConnected: false,
    });

    try {
      this.wsConnection = new WebSocket(HERMES_WS_URL);

      this.wsConnection.onopen = () => {
        logger.info('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.lastUpdateTime = Date.now();

        this.updateConnectionState({
          status: 'connected',
          isConnected: true,
          reconnectAttempts: 0,
          error: null,
        });

        const priceIds = Array.from(this.subscribedPriceIds);
        if (priceIds.length > 0) {
          this.subscribeToPriceIds(priceIds);
        }
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'price_update') {
            const now = Date.now();
            const publishTime = data.price?.publish_time
              ? data.price.publish_time * 1000
              : this.lastUpdateTime;
            const latency = now - publishTime;
            this.lastUpdateTime = now;

            this.updateConnectionState({
              lastUpdateLatency: Math.max(0, latency),
            });

            this.handlePriceUpdate(data);
          }
        } catch (error) {
          logger.error(
            'Failed to parse WebSocket message',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      };

      this.wsConnection.onerror = (error) => {
        logger.error('WebSocket error', new Error(String(error)));
        this.updateConnectionState({
          error: new Error('WebSocket error'),
        });
      };

      this.wsConnection.onclose = () => {
        logger.warn('WebSocket connection closed');
        this.updateConnectionState({
          status: 'disconnected',
          isConnected: false,
        });
        this.handleReconnect();
      };
    } catch (error) {
      logger.error(
        'Failed to initialize WebSocket',
        error instanceof Error ? error : new Error(String(error))
      );
      this.updateConnectionState({
        status: 'disconnected',
        isConnected: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      this.handleReconnect();
    }
  }

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private handleReconnect(): void {
    if (this.isShuttingDown) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      this.updateConnectionState({
        reconnectAttempts: this.reconnectAttempts,
      });

      logger.info('Reconnecting', {
        delay,
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
      this.reconnectTimer = setTimeout(() => this.initialize(), delay);
    } else {
      logger.error('Max reconnection attempts reached');
      this.updateConnectionState({
        status: 'disconnected',
        isConnected: false,
        error: new Error('Max reconnection attempts reached'),
      });
    }
  }

  private handlePriceUpdate(data: { price_id: string; price: PythPriceRaw }): void {
    if (isPythPriceRaw(data.price) && this.onPriceUpdate) {
      this.onPriceUpdate(data.price_id, data.price);
    }
  }

  subscribeToPriceIds(priceIds: string[]): void {
    priceIds.forEach((id) => this.subscribedPriceIds.add(id));

    if (this.isConnected() && priceIds.length > 0) {
      this.wsConnection!.send(
        JSON.stringify({
          type: 'subscribe',
          ids: priceIds,
        })
      );
      logger.debug('Subscribed to price IDs', { priceIds });
    } else if (!this.isConnected()) {
      this.initialize();
    }
  }

  unsubscribeFromPriceIds(priceIds: string[]): void {
    priceIds.forEach((id) => this.subscribedPriceIds.delete(id));

    if (this.isConnected() && priceIds.length > 0) {
      this.wsConnection!.send(
        JSON.stringify({
          type: 'unsubscribe',
          ids: priceIds,
        })
      );
      logger.debug('Unsubscribed from price IDs', { priceIds });
    }
  }

  disconnect(): void {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.subscribedPriceIds.clear();
    this.updateConnectionState({
      status: 'disconnected',
      isConnected: false,
      reconnectAttempts: 0,
      error: null,
    });
    this.connectionStateListeners.clear();
    logger.info('WebSocket disconnected');
  }

  getSubscribedPriceIds(): string[] {
    return Array.from(this.subscribedPriceIds);
  }
}
