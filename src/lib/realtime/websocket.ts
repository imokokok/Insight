'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import { createLogger } from '@/lib/utils/logger';

// ==================== Hook 工厂函数 ====================

const logger = createLogger('WebSocketManager');

export function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000;
}

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

export interface PerformanceMetrics {
  connectionLatency: number;
  messageProcessingTime: number;
  messagesPerSecond: number;
  lastMessageTimestamp: number;
  averageBatchSize: number;
  throttleCount: number;
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
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
}

interface BatchedUpdate {
  channel: string;
  messages: WebSocketMessage[];
  firstTimestamp: number;
}

export type MessageHandler<T = unknown> = (message: WebSocketMessage<T>) => void;
export type StatusHandler = (status: WebSocketStatus) => void;

export default class WebSocketManager {
  protected ws: WebSocket | null = null;
  protected config: Omit<
    Required<WebSocketConfig>,
    'onConnect' | 'onDisconnect' | 'onError' | 'onPerformanceMetrics'
  > & {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
  };
  protected status: WebSocketStatus = 'disconnected';
  protected reconnectAttempts = 0;
  protected reconnectTimer: NodeJS.Timeout | null = null;
  protected heartbeatTimer: NodeJS.Timeout | null = null;
  protected heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  protected messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  protected statusHandlers: Set<StatusHandler> = new Set();
  protected subscribedChannels: Set<string> = new Set();
  protected messageQueue: string[] = [];

  protected batchedUpdates: Map<string, BatchedUpdate> = new Map();
  protected batchTimer: NodeJS.Timeout | null = null;
  protected lastProcessTime: Map<string, number> = new Map();
  protected performanceMetrics: PerformanceMetrics = {
    connectionLatency: 0,
    messageProcessingTime: 0,
    messagesPerSecond: 0,
    lastMessageTimestamp: 0,
    averageBatchSize: 0,
    throttleCount: 0,
  };
  protected messageCountWindow: number[] = [];
  protected connectionStartTime: number = 0;
  protected totalMessagesProcessed = 0;
  protected totalBatchesProcessed = 0;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,
      useExponentialBackoff: true,
      batchSize: 10,
      batchWindowMs: 100,
      throttleMs: 100,
      ...config,
    };
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  protected updatePerformanceMetrics(processingTime: number, batchSize: number): void {
    const now = Date.now();
    this.messageCountWindow.push(now);

    const oneSecondAgo = now - 1000;
    this.messageCountWindow = this.messageCountWindow.filter((t) => t > oneSecondAgo);

    this.totalMessagesProcessed += batchSize;
    this.totalBatchesProcessed++;

    this.performanceMetrics = {
      connectionLatency: this.performanceMetrics.connectionLatency,
      messageProcessingTime: processingTime,
      messagesPerSecond: this.messageCountWindow.length,
      lastMessageTimestamp: now,
      averageBatchSize: this.totalMessagesProcessed / this.totalBatchesProcessed,
      throttleCount: this.performanceMetrics.throttleCount,
    };

    this.config.onPerformanceMetrics?.(this.performanceMetrics);
  }

  protected shouldThrottle(channel: string): boolean {
    const now = Date.now();
    const lastTime = this.lastProcessTime.get(channel) || 0;
    return now - lastTime < this.config.throttleMs;
  }

  protected updateLastProcessTime(channel: string): void {
    this.lastProcessTime.set(channel, Date.now());
  }

  protected addToBatch(message: WebSocketMessage): void {
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

  protected flushBatch(channel: string): void {
    const batch = this.batchedUpdates.get(channel);
    if (!batch || batch.messages.length === 0) return;

    const startTime = performance.now();

    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      const latestMessage = batch.messages[batch.messages.length - 1];
      handlers.forEach((handler) => {
        try {
          handler(latestMessage);
        } catch (error) {
          logger.error('Error in message handler', error as Error);
        }
      });
    }

    const processingTime = performance.now() - startTime;
    this.updatePerformanceMetrics(processingTime, batch.messages.length);

    this.lastProcessTime.set(channel, Date.now());
    this.batchedUpdates.delete(channel);

    logger.debug(
      `Batch processed for channel ${channel}: ${batch.messages.length} messages in ${processingTime.toFixed(2)}ms`
    );
  }

  protected flushAllBatches(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const channels = Array.from(this.batchedUpdates.keys());
    channels.forEach((channel) => this.flushBatch(channel));
  }

  protected recordThrottle(): void {
    this.performanceMetrics.throttleCount++;
  }

  connect(): void {
    if (!this.config.url) {
      throw new Error(
        'WebSocket URL is not configured. Please set NEXT_PUBLIC_WS_URL environment variable.'
      );
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.warn('WebSocket already connected');
      return;
    }

    this.setStatus('connecting');
    this.connectionStartTime = Date.now();

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        const connectionLatency = Date.now() - this.connectionStartTime;
        this.performanceMetrics.connectionLatency = connectionLatency;

        logger.info(`WebSocket connected in ${connectionLatency}ms`);
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushMessageQueue();
        this.resubscribeChannels();
        this.config.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        logger.warn('WebSocket closed');
        this.ws = null;
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.flushAllBatches();
        this.config.onDisconnect?.();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', new Error(String(error)));
        this.setStatus('error');
        this.config.onError?.(new Error('WebSocket connection error'));
      };
    } catch (error) {
      logger.error(
        'Failed to create WebSocket connection',
        error instanceof Error ? error : new Error(String(error))
      );
      this.setStatus('error');
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.flushAllBatches();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
    logger.info('WebSocket disconnected manually');
  }

  // 订阅频道
  subscribe<T>(channel: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());

      // 发送订阅消息
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

    // 返回取消订阅函数
    return () => {
      handlers.delete(typedHandler);
      if (handlers.size === 0) {
        this.unsubscribe(channel);
      }
    };
  }

  // 取消订阅
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

  // 发送消息
  send(message: Record<string, unknown>): void {
    const messageStr = JSON.stringify(message);

    if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(messageStr);
    } else {
      // 将消息加入队列
      this.messageQueue.push(messageStr);
      logger.warn('WebSocket not connected, message queued');
    }
  }

  // 注册状态监听器
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  // 手动重连
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  // 保护方法：设置状态
  protected setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  protected handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      if (message.type === 'pong') {
        this.handlePong();
        return;
      }

      const channel = message.channel;

      if (this.shouldThrottle(channel)) {
        this.recordThrottle();
        logger.debug(`Message throttled for channel: ${channel}`);
        return;
      }

      this.updateLastProcessTime(channel);
      this.addToBatch(message);
    } catch (error) {
      logger.error('Failed to parse WebSocket message', error as Error);
    }
  }

  // 保护方法：启动心跳
  protected startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: Date.now(),
        });

        // 清理旧的心跳超时定时器
        if (this.heartbeatTimeoutTimer) {
          clearTimeout(this.heartbeatTimeoutTimer);
        }

        // 设置心跳超时
        this.heartbeatTimeoutTimer = setTimeout(() => {
          logger.warn('Heartbeat timeout, reconnecting...');
          this.ws?.close();
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  // 保护方法：停止心跳
  protected stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // 保护方法：处理心跳响应
  protected handlePong(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  protected attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      this.setStatus('error');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus('reconnecting');

    const delay = this.config.useExponentialBackoff
      ? calculateBackoffDelay(this.reconnectAttempts - 1, this.config.reconnectInterval)
      : this.config.reconnectInterval;

    logger.info(
      `Reconnecting in ${delay}ms... Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} (exponential backoff: ${this.config.useExponentialBackoff})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // 保护方法：清除重连定时器
  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // 保护方法：刷新消息队列
  protected flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  // 保护方法：重新订阅频道
  protected resubscribeChannels(): void {
    this.subscribedChannels.forEach((channel) => {
      this.send({
        type: 'subscribe',
        channel,
        timestamp: Date.now(),
      });
    });
  }
}

// ==================== 模拟 WebSocket 实现 ====================

export class MockWebSocketManager extends WebSocketManager {
  private mockInterval: NodeJS.Timeout | null = null;
  private mockDataGenerators: Map<string, () => unknown> = new Map();

  constructor(config: WebSocketConfig) {
    super(config);
    this.setupMockDataGenerators();
  }

  connect(): void {
    this.setStatus('connecting');

    setTimeout(() => {
      this.setStatus('connected');
      this.startMockDataStream();
      this.resubscribeChannels();
    }, 500);
  }

  disconnect(): void {
    this.stopMockDataStream();
    this.setStatus('disconnected');
  }

  send(message: Record<string, unknown>): void {
    // 模拟发送消息
    logger.debug('Mock WebSocket send:', message);
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  private setupMockDataGenerators(): void {
    // 价格数据生成器
    this.mockDataGenerators.set('prices', () => ({
      symbol: ['BTC', 'ETH', 'LINK', 'PYTH', 'BAND'][Math.floor(Math.random() * 5)],
      price: 10000 + Math.random() * 50000,
      change24h: (Math.random() - 0.5) * 10,
      timestamp: Date.now(),
    }));

    // TVS 数据生成器
    this.mockDataGenerators.set('tvs', () => ({
      oracle: ['Chainlink', 'Pyth Network', 'API3'][Math.floor(Math.random() * 3)],
      tvs: 1 + Math.random() * 10,
      change24h: (Math.random() - 0.5) * 5,
      timestamp: Date.now(),
    }));

    // 市场统计生成器
    this.mockDataGenerators.set('marketStats', () => ({
      totalTVS: 15 + Math.random() * 5,
      totalChains: 10 + Math.floor(Math.random() * 5),
      totalProtocols: 100 + Math.floor(Math.random() * 50),
      marketDominance: 45 + Math.random() * 10,
      avgUpdateLatency: 200 + Math.floor(Math.random() * 100),
      timestamp: Date.now(),
    }));
  }

  private startMockDataStream(): void {
    this.mockInterval = setInterval(() => {
      this.subscribedChannels.forEach((channel) => {
        const generator = this.mockDataGenerators.get(channel);
        if (generator) {
          const mockMessage: WebSocketMessage = {
            type: 'update',
            channel,
            data: generator(),
            timestamp: Date.now(),
          };

          if (this.shouldThrottle(channel)) {
            this.recordThrottle();
            logger.debug(`Mock message throttled for channel: ${channel}`);
          }

          this.addToBatch(mockMessage);
        }
      });
    }, 2000);
  }

  private stopMockDataStream(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }
}

export interface UseWebSocketOptions {
  url?: string;
  channels?: string[];
  autoConnect?: boolean;
  useMock?: boolean;
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
}

export function createWebSocketHook(defaultConfig: WebSocketConfig) {
  return function useWebSocket<T = unknown>(options: UseWebSocketOptions = {}) {
    const {
      url = defaultConfig.url,
      channels = [],
      autoConnect = true,
      useMock = false,
      onPerformanceMetrics,
    } = options;

    const managerRef = useRef<WebSocketManager | null>(null);
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
      connectionLatency: 0,
      messageProcessingTime: 0,
      messagesPerSecond: 0,
      lastMessageTimestamp: 0,
      averageBatchSize: 0,
      throttleCount: 0,
    });

    useEffect(() => {
      const ManagerClass = useMock ? MockWebSocketManager : WebSocketManager;
      managerRef.current = new ManagerClass({
        ...defaultConfig,
        url,
        onPerformanceMetrics: (metrics) => {
          setPerformanceMetrics(metrics);
          onPerformanceMetrics?.(metrics);
        },
      });

      const unsubscribeStatus = managerRef.current.onStatusChange((newStatus) => {
        setStatus(newStatus);
      });

      if (autoConnect) {
        managerRef.current.connect();
      }

      return () => {
        unsubscribeStatus();
        managerRef.current?.disconnect();
      };
    }, [url, autoConnect, useMock, onPerformanceMetrics]);

    const channelsKey = useMemo(() => channels.join(','), [channels]);

    useEffect(() => {
      if (!managerRef.current || channels.length === 0) return;

      const unsubscribes: (() => void)[] = [];

      channels.forEach((channel) => {
        const unsubscribe = managerRef.current!.subscribe<T>(channel, (message) => {
          setLastMessage(message);
          setLastUpdated(new Date());
        });
        unsubscribes.push(unsubscribe);
      });

      return () => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      };
    }, [channelsKey, channels]);

    const connect = useCallback(() => {
      managerRef.current?.connect();
    }, []);

    const disconnect = useCallback(() => {
      managerRef.current?.disconnect();
    }, []);

    const reconnect = useCallback(() => {
      managerRef.current?.reconnect();
    }, []);

    const send = useCallback((message: Record<string, unknown>) => {
      managerRef.current?.send(message);
    }, []);

    const subscribe = useCallback(<U = T>(channel: string, handler: MessageHandler<U>) => {
      return managerRef.current?.subscribe(channel, handler as MessageHandler);
    }, []);

    const getPerformanceMetrics = useCallback(() => {
      return managerRef.current?.getPerformanceMetrics() || performanceMetrics;
    }, [performanceMetrics]);

    return {
      status,
      lastMessage,
      lastUpdated,
      performanceMetrics,
      connect,
      disconnect,
      reconnect,
      send,
      subscribe,
      getPerformanceMetrics,
      isConnected: status === 'connected',
      isConnecting: status === 'connecting',
      isReconnecting: status === 'reconnecting',
    };
  };
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

if (!WS_URL) {
  logger.warn('NEXT_PUBLIC_WS_URL is not configured. Real-time features will be disabled.');
}

function validateWebSocketUrl(url: string | undefined): string | null {
  if (!url || url.trim() === '') {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      logger.error(`Invalid WebSocket URL protocol: ${parsed.protocol}. Expected ws: or wss:`);
      return null;
    }
    return url;
  } catch {
    logger.error(`Invalid WebSocket URL: ${url}`);
    return null;
  }
}

const validatedWsUrl = validateWebSocketUrl(WS_URL);

export const useWebSocket = createWebSocketHook({
  url: validatedWsUrl || 'wss://fallback.invalid',
  reconnectInterval: 3000,
  maxReconnectAttempts: validatedWsUrl ? 5 : 0,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  useExponentialBackoff: true,
  batchSize: 10,
  batchWindowMs: 100,
  throttleMs: 100,
});

export function isWebSocketEnabled(): boolean {
  return validatedWsUrl !== null;
}
