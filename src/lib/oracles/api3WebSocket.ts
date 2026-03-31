import { API3_DATA_SOURCES } from './api3DataSources';

import type { API3Alert } from './api3';

export type WebSocketEventType =
  | 'price_update'
  | 'alert'
  | 'dapi_update'
  | 'oev_auction'
  | 'coverage_pool'
  | 'network_status';

export interface WebSocketMessage {
  type: WebSocketEventType;
  channel: string;
  data: unknown;
  timestamp: number;
}

export interface PriceUpdateData {
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  chain: string;
  timestamp: number;
}

export interface Subscription {
  channel: string;
  callback: (data: unknown) => void;
  id: string;
}

export interface WebSocketStatus {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  error?: string;
  queueSize?: number;
}

export interface QueueStats {
  size: number;
  maxSize: number;
  oldestMessageAge: number;
  droppedMessages: number;
}

type WebSocketCallback = (data: unknown) => void;

interface QueuedMessage {
  data: unknown;
  timestamp: number;
  channel: string;
}

const DEFAULT_MAX_QUEUE_SIZE = 100;
const MESSAGE_TTL = 60000;

export class API3WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private pingInterval: number;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private status: WebSocketStatus = { connected: false, reconnectAttempts: 0 };
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private messageQueue: QueuedMessage[] = [];
  private isConnecting = false;
  private url: string;
  private maxQueueSize: number;
  private droppedMessages = 0;
  private queueCleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(url?: string) {
    this.url = url || API3_DATA_SOURCES.websocket.url;
    this.maxReconnectAttempts = API3_DATA_SOURCES.websocket.maxReconnectAttempts;
    this.reconnectInterval = API3_DATA_SOURCES.websocket.reconnectInterval;
    this.pingInterval = API3_DATA_SOURCES.websocket.pingInterval;
    this.maxQueueSize = DEFAULT_MAX_QUEUE_SIZE;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        if (typeof window === 'undefined') {
          this.simulateConnection();
          resolve();
          return;
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.status = {
            connected: true,
            reconnectAttempts: 0,
            lastConnected: new Date(),
            queueSize: this.messageQueue.length,
          };
          this.notifyStatusListeners();
          this.startPingInterval();
          this.startQueueCleanup();
          this.resubscribeAll();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          this.status = {
            ...this.status,
            error: 'WebSocket connection error',
          };
          this.notifyStatusListeners();
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.status = {
            ...this.status,
            connected: false,
          };
          this.notifyStatusListeners();
          this.stopPingInterval();
          this.scheduleReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private simulateConnection(): void {
    this.status = {
      connected: true,
      reconnectAttempts: 0,
      lastConnected: new Date(),
    };
    this.notifyStatusListeners();
  }

  disconnect(): void {
    this.stopPingInterval();
    this.stopQueueCleanup();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status = { connected: false, reconnectAttempts: 0, queueSize: 0 };
    this.notifyStatusListeners();
  }

  subscribe(channel: string, callback: WebSocketCallback): () => void {
    const id = `${channel}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const subscription: Subscription = { channel, callback, id };

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    this.subscriptions.get(channel)!.push(subscription);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(channel);
    }

    return () => this.unsubscribe(channel, id);
  }

  unsubscribe(channel: string, id?: string): void {
    if (!this.subscriptions.has(channel)) return;

    if (id) {
      const subs = this.subscriptions.get(channel)!;
      const index = subs.findIndex((s) => s.id === id);
      if (index !== -1) {
        subs.splice(index, 1);
      }
      if (subs.length === 0) {
        this.subscriptions.delete(channel);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.sendUnsubscribe(channel);
        }
      }
    } else {
      this.subscriptions.delete(channel);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendUnsubscribe(channel);
      }
    }
  }

  subscribeToPriceUpdates(symbol: string, callback: (data: PriceUpdateData) => void): () => void {
    const channel = `price:${symbol}`;
    return this.subscribe(channel, callback as WebSocketCallback);
  }

  subscribeToAlerts(callback: (alert: API3Alert) => void): () => void {
    const channel = 'alerts';
    return this.subscribe(channel, callback as WebSocketCallback);
  }

  subscribeToDAPIUpdates(dapiName: string, callback: WebSocketCallback): () => void {
    const channel = `dapi:${dapiName}`;
    return this.subscribe(channel, callback);
  }

  subscribeToOEVAuctions(callback: WebSocketCallback): () => void {
    const channel = 'oev:auctions';
    return this.subscribe(channel, callback);
  }

  subscribeToCoveragePool(callback: WebSocketCallback): () => void {
    const channel = 'coverage-pool';
    return this.subscribe(channel, callback);
  }

  subscribeToNetworkStatus(callback: WebSocketCallback): () => void {
    const channel = 'network:status';
    return this.subscribe(channel, callback);
  }

  getStatus(): WebSocketStatus {
    return { ...this.status };
  }

  onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private handleMessage(message: WebSocketMessage): void {
    const { channel, data } = message;
    const subs = this.subscriptions.get(channel);

    if (subs) {
      subs.forEach((sub) => {
        try {
          sub.callback(data);
        } catch (error) {
          console.error(`Error in subscription callback for ${channel}:`, error);
        }
      });
    }
  }

  private sendSubscribe(channel: string): void {
    this.send(
      {
        type: 'subscribe',
        channel,
      },
      channel
    );
  }

  private sendUnsubscribe(channel: string): void {
    this.send(
      {
        type: 'unsubscribe',
        channel,
      },
      channel
    );
  }

  private send(data: unknown, channel: string = ''): void {
    const message = JSON.stringify(data);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.addToQueue(data, channel);
    }
  }

  private addToQueue(data: unknown, channel: string): void {
    this.cleanupExpiredMessages();

    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
      this.droppedMessages++;
      console.warn('[API3WebSocket] Message queue full, dropping oldest message');
    }

    this.messageQueue.push({
      data,
      timestamp: Date.now(),
      channel,
    });

    this.status.queueSize = this.messageQueue.length;
    this.notifyStatusListeners();
  }

  private cleanupExpiredMessages(): void {
    const now = Date.now();
    const initialLength = this.messageQueue.length;

    this.messageQueue = this.messageQueue.filter((msg) => {
      return now - msg.timestamp < MESSAGE_TTL;
    });

    const removed = initialLength - this.messageQueue.length;
    if (removed > 0) {
      this.droppedMessages += removed;
    }
  }

  private startQueueCleanup(): void {
    this.stopQueueCleanup();
    this.queueCleanupTimer = setInterval(() => {
      this.cleanupExpiredMessages();
    }, 30000);
  }

  private stopQueueCleanup(): void {
    if (this.queueCleanupTimer) {
      clearInterval(this.queueCleanupTimer);
      this.queueCleanupTimer = null;
    }
  }

  private flushMessageQueue(): void {
    this.cleanupExpiredMessages();

    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const queued = this.messageQueue.shift();
      if (queued) {
        this.ws.send(JSON.stringify(queued.data));
      }
    }

    this.status.queueSize = this.messageQueue.length;
    this.notifyStatusListeners();
  }

  getQueueStats(): QueueStats {
    const now = Date.now();
    const oldestTimestamp = this.messageQueue.length > 0 ? this.messageQueue[0].timestamp : now;

    return {
      size: this.messageQueue.length,
      maxSize: this.maxQueueSize,
      oldestMessageAge: now - oldestTimestamp,
      droppedMessages: this.droppedMessages,
    };
  }

  clearQueue(): void {
    this.messageQueue = [];
    this.droppedMessages = 0;
    this.status.queueSize = 0;
    this.notifyStatusListeners();
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((_, channel) => {
      this.sendSubscribe(channel);
    });
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();

    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    this.status.reconnectAttempts = this.reconnectAttempts;
    this.notifyStatusListeners();

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.getStatus());
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }
}

export const api3WebSocketClient = new API3WebSocketClient();
