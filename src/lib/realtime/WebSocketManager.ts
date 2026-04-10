/**
 * 优化的 WebSocket 连接管理器
 * 提供连接复用、重连机制、性能监控等功能
 */

import { WEBSOCKET_CONFIG } from '@/lib/config/queryConfig';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('WebSocketManager');

// ==================== 类型定义 ====================

export type WebSocketStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

export interface WebSocketMessage<T = unknown> {
  type: string;
  channel: string;
  data: T;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  useExponentialBackoff?: boolean;
  batchSize?: number;
  batchWindowMs?: number;
  throttleMs?: number;
  connectionTimeout?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempt: number) => void;
}

export interface ConnectionStats {
  connectionCount: number;
  reconnectionCount: number;
  messageCount: number;
  errorCount: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  totalUptime: number;
  averageLatency: number;
}

export type MessageHandler<T = unknown> = (message: WebSocketMessage<T>) => void;
export type StatusHandler = (status: WebSocketStatus) => void;

interface BatchedUpdate {
  channel: string;
  messages: WebSocketMessage[];
  firstTimestamp: number;
}

// ==================== WebSocket 管理器 ====================

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private connectionTimeoutTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private statusHandlers: Set<StatusHandler> = new Set();
  private subscribedChannels: Set<string> = new Set();
  private messageQueue: string[] = [];
  private batchedUpdates: Map<string, BatchedUpdate> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private lastProcessTime: Map<string, number> = new Map();
  private isManualDisconnect = false;
  private connectionStartTime = 0;
  private stats: ConnectionStats = {
    connectionCount: 0,
    reconnectionCount: 0,
    messageCount: 0,
    errorCount: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    totalUptime: 0,
    averageLatency: 0,
  };
  private latencyMeasurements: number[] = [];
  private messageCountWindow: number[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: WEBSOCKET_CONFIG.RECONNECT_INTERVAL,
      maxReconnectAttempts: WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
      heartbeatInterval: WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL,
      heartbeatTimeout: WEBSOCKET_CONFIG.HEARTBEAT_TIMEOUT,
      useExponentialBackoff: true,
      batchSize: WEBSOCKET_CONFIG.BATCH_SIZE,
      batchWindowMs: WEBSOCKET_CONFIG.BATCH_WINDOW_MS,
      throttleMs: WEBSOCKET_CONFIG.THROTTLE_MS,
      connectionTimeout: 10000,
      onConnect: () => {},
      onDisconnect: () => {},
      onError: () => {},
      onReconnect: () => {},
      ...config,
    };
  }

  // ==================== 公共方法 ====================

  /**
   * 获取当前连接状态
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * 获取连接统计信息
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * 建立 WebSocket 连接
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.warn('WebSocket already connected');
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      logger.warn('WebSocket already connecting');
      return;
    }

    this.isManualDisconnect = false;
    this.setStatus('connecting');
    this.connectionStartTime = Date.now();

    // 设置连接超时
    this.connectionTimeoutTimer = setTimeout(() => {
      if (this.status === 'connecting') {
        logger.error('WebSocket connection timeout');
        this.ws?.close();
        this.handleConnectionError(new Error('Connection timeout'));
      }
    }, this.config.connectionTimeout);

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.clearConnectionTimeout();
        const latency = Date.now() - this.connectionStartTime;
        this.recordLatency(latency);

        logger.info(`WebSocket connected in ${latency}ms`);
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.stats.connectionCount++;
        this.stats.lastConnectedAt = Date.now();

        this.startHeartbeat();
        this.flushMessageQueue();
        this.resubscribeChannels();
        this.config.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        this.clearConnectionTimeout();
        this.stopHeartbeat();
        this.flushAllBatches();

        this.stats.lastDisconnectedAt = Date.now();
        if (this.stats.lastConnectedAt) {
          this.stats.totalUptime += Date.now() - this.stats.lastConnectedAt;
        }

        logger.warn(`WebSocket closed: ${event.code} - ${event.reason}`);
        this.setStatus('disconnected');
        this.config.onDisconnect?.();

        if (!this.isManualDisconnect && !event.wasClean) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.clearConnectionTimeout();
        this.stats.errorCount++;
        logger.error('WebSocket error', error instanceof Error ? error : new Error(String(error)));
        this.setStatus('error');
        this.config.onError?.(new Error('WebSocket connection error'));
      };
    } catch (error) {
      this.clearConnectionTimeout();
      this.handleConnectionError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.clearConnectionTimeout();
    this.flushAllBatches();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
    logger.info('WebSocket disconnected manually');
  }

  /**
   * 重新连接
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    setTimeout(() => this.connect(), 100);
  }

  /**
   * 订阅频道
   */
  subscribe<T>(channel: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());

      if (this.status === 'connected') {
        this.send({
          type: 'subscribe',
          channel,
          timestamp: Date.now(),
        });
      }

      this.subscribedChannels.add(channel);
    }

    const handlers = this.messageHandlers.get(channel)!;
    const typedHandler = handler as MessageHandler;
    handlers.add(typedHandler);

    return () => {
      handlers.delete(typedHandler);
      if (handlers.size === 0) {
        this.unsubscribe(channel);
      }
    };
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channel: string): void {
    this.messageHandlers.delete(channel);
    this.subscribedChannels.delete(channel);

    if (this.status === 'connected') {
      this.send({
        type: 'unsubscribe',
        channel,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 发送消息
   */
  send(message: Record<string, unknown>): void {
    const messageStr = JSON.stringify(message);

    if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(messageStr);
    } else {
      this.messageQueue.push(messageStr);
      logger.debug('Message queued (WebSocket not connected)');
    }
  }

  /**
   * 注册状态监听器
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  // ==================== 私有方法 ====================

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private handleConnectionError(error: Error): void {
    this.setStatus('error');
    this.config.onError?.(error);
    this.attemptReconnect();
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  private calculateBackoffDelay(attempt: number): number {
    const maxDelay = 30000;
    const baseDelay = Math.min(this.config.reconnectInterval * Math.pow(2, attempt), maxDelay);
    // 添加抖动: ±20% 的随机变化，避免多个客户端同时重连
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    return Math.max(1000, baseDelay + jitter);
  }

  // 使用实例级别的重连限制，避免静态属性在多标签页场景下的问题
  private reconnectCount = 0;
  private lastReconnectTime = 0;
  private readonly RECONNECT_WINDOW = 60000; // 1分钟窗口
  private readonly MAX_RECONNECTS_PER_WINDOW = 10; // 每分钟最大重连数

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      this.setStatus('error');
      return;
    }

    // 实例级别的重连限制检查
    const now = Date.now();
    if (now - this.lastReconnectTime > this.RECONNECT_WINDOW) {
      this.reconnectCount = 0;
      this.lastReconnectTime = now;
    }

    if (this.reconnectCount >= this.MAX_RECONNECTS_PER_WINDOW) {
      logger.warn('Reconnect limit reached for this instance, delaying reconnection');
      const extraDelay = 5000 + Math.random() * 5000; // 5-10秒额外延迟
      setTimeout(() => this.attemptReconnect(), extraDelay);
      return;
    }

    this.reconnectCount++;
    this.reconnectAttempts++;
    this.stats.reconnectionCount++;
    this.setStatus('reconnecting');

    const delay = this.config.useExponentialBackoff
      ? this.calculateBackoffDelay(this.reconnectAttempts - 1)
      : this.config.reconnectInterval;

    logger.info(
      `Reconnecting in ${delay.toFixed(0)}ms... Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} (instance: ${this.reconnectCount}/${this.MAX_RECONNECTS_PER_WINDOW})`
    );

    this.config.onReconnect?.(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: Date.now(),
        });

        if (this.heartbeatTimeoutTimer) {
          clearTimeout(this.heartbeatTimeoutTimer);
        }

        this.heartbeatTimeoutTimer = setTimeout(() => {
          logger.warn('Heartbeat timeout, reconnecting...');
          this.ws?.close();
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      this.stats.messageCount++;

      // 记录消息时间窗口
      const now = Date.now();
      this.messageCountWindow.push(now);
      const oneSecondAgo = now - 1000;
      this.messageCountWindow = this.messageCountWindow.filter((t) => t > oneSecondAgo);

      if (message.type === 'pong') {
        if (this.heartbeatTimeoutTimer) {
          clearTimeout(this.heartbeatTimeoutTimer);
          this.heartbeatTimeoutTimer = null;
        }
        return;
      }

      const channel = message.channel;

      if (this.shouldThrottle(channel)) {
        logger.debug(`Message throttled for channel: ${channel}`);
        return;
      }

      this.updateLastProcessTime(channel);
      this.addToBatch(message);
    } catch (error) {
      logger.error('Failed to parse WebSocket message', error as Error);
    }
  }

  private shouldThrottle(channel: string): boolean {
    const now = Date.now();
    const lastTime = this.lastProcessTime.get(channel) || 0;
    return now - lastTime < this.config.throttleMs;
  }

  private updateLastProcessTime(channel: string): void {
    this.lastProcessTime.set(channel, Date.now());
  }

  private addToBatch(message: WebSocketMessage): void {
    const channel = message.channel;
    const now = Date.now();

    if (!this.batchedUpdates.has(channel)) {
      this.batchedUpdates.set(channel, {
        channel,
        messages: [],
        firstTimestamp: now,
      });
    }

    const batch = this.batchedUpdates.get(channel)!;
    batch.messages.push(message);

    if (batch.messages.length >= this.config.batchSize) {
      this.flushBatch(channel);
      return;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.batchTimer = setTimeout(() => {
      this.flushAllBatches();
    }, this.config.batchWindowMs);
  }

  private flushBatch(channel: string): void {
    const batch = this.batchedUpdates.get(channel);
    if (!batch || batch.messages.length === 0) return;

    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      // 只发送最新的消息
      const latestMessage = batch.messages[batch.messages.length - 1];
      handlers.forEach((handler) => {
        try {
          handler(latestMessage);
        } catch (error) {
          logger.error('Error in message handler', error as Error);
        }
      });
    }

    this.batchedUpdates.delete(channel);
  }

  private flushAllBatches(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const channels = Array.from(this.batchedUpdates.keys());
    channels.forEach((channel) => this.flushBatch(channel));
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  private resubscribeChannels(): void {
    this.subscribedChannels.forEach((channel) => {
      this.send({
        type: 'subscribe',
        channel,
        timestamp: Date.now(),
      });
    });
  }

  private recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    // 只保留最近 100 个测量值
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }
    this.stats.averageLatency =
      this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
  }
}

// ==================== 连接池管理 ====================

interface PooledConnection {
  manager: WebSocketManager;
  refCount: number;
  lastUsed: number;
}

class WebSocketConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private maxConnections: number;
  private maxIdleTime: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxConnections = 5, maxIdleTime = 300000) {
    this.maxConnections = maxConnections;
    this.maxIdleTime = maxIdleTime;
    this.startCleanupInterval();
  }

  getConnection(url: string, config: Omit<WebSocketConfig, 'url'>): WebSocketManager {
    const key = this.createConnectionKey(url, config);
    const existing = this.connections.get(key);

    if (existing) {
      existing.refCount++;
      existing.lastUsed = Date.now();
      return existing.manager;
    }

    // 如果达到最大连接数，清理最老的连接
    if (this.connections.size >= this.maxConnections) {
      this.cleanupOldestConnection();
    }

    const manager = new WebSocketManager({ url, ...config });
    this.connections.set(key, {
      manager,
      refCount: 1,
      lastUsed: Date.now(),
    });

    return manager;
  }

  releaseConnection(url: string, config: Omit<WebSocketConfig, 'url'>): void {
    const key = this.createConnectionKey(url, config);
    const existing = this.connections.get(key);

    if (existing) {
      existing.refCount--;
      if (existing.refCount <= 0) {
        existing.manager.disconnect();
        this.connections.delete(key);
      }
    }
  }

  private createConnectionKey(url: string, config: Omit<WebSocketConfig, 'url'>): string {
    return `${url}:${JSON.stringify(config)}`;
  }

  private cleanupOldestConnection(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.connections.forEach((conn, key) => {
      if (conn.lastUsed < oldestTime) {
        oldestTime = conn.lastUsed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      const conn = this.connections.get(oldestKey);
      if (conn && conn.refCount <= 0) {
        conn.manager.disconnect();
        this.connections.delete(oldestKey);
      }
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.connections.forEach((conn, key) => {
        if (conn.refCount <= 0 && now - conn.lastUsed > this.maxIdleTime) {
          conn.manager.disconnect();
          this.connections.delete(key);
        }
      });
    }, 60000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.forEach((conn) => {
      conn.manager.disconnect();
    });
    this.connections.clear();
  }
}

// ==================== 单例导出 ====================

export const webSocketConnectionPool = new WebSocketConnectionPool();

export function createWebSocketManager(config: WebSocketConfig): WebSocketManager {
  return webSocketConnectionPool.getConnection(config.url, config);
}

export function releaseWebSocketManager(config: WebSocketConfig): void {
  webSocketConnectionPool.releaseConnection(config.url, config);
}

export { WebSocketConnectionPool };
