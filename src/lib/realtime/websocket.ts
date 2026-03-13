'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('WebSocketManager');

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
}

export type MessageHandler<T = unknown> = (message: WebSocketMessage<T>) => void;
export type StatusHandler = (status: WebSocketStatus) => void;

export default class WebSocketManager {
  protected ws: WebSocket | null = null;
  protected config: Required<WebSocketConfig>;
  protected status: WebSocketStatus = 'disconnected';
  protected reconnectAttempts = 0;
  protected reconnectTimer: NodeJS.Timeout | null = null;
  protected heartbeatTimer: NodeJS.Timeout | null = null;
  protected heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  protected messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  protected statusHandlers: Set<StatusHandler> = new Set();
  protected subscribedChannels: Set<string> = new Set();
  protected messageQueue: string[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,
      ...config,
    };
  }

  // 获取当前状态
  getStatus(): WebSocketStatus {
    return this.status;
  }

  // 连接 WebSocket
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.warn('WebSocket already connected');
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        logger.info('WebSocket connected');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushMessageQueue();
        this.resubscribeChannels();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        logger.warn('WebSocket closed');
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', new Error(String(error)));
        this.setStatus('error');
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

  // 断开连接
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();

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

  // 保护方法：处理消息
  protected handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // 处理心跳响应
      if (message.type === 'pong') {
        this.handlePong();
        return;
      }

      // 分发到对应的处理器
      const handlers = this.messageHandlers.get(message.channel);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            logger.error('Error in message handler', error as Error);
          }
        });
      }
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

  // 保护方法：尝试重连
  protected attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      this.setStatus('error');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus('reconnecting');

    logger.info(
      `Reconnecting... Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
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

    // 模拟连接延迟
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
      oracle: ['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'UMA'][
        Math.floor(Math.random() * 5)
      ],
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

          const handlers = this.messageHandlers.get(channel);
          if (handlers) {
            handlers.forEach((handler) => {
              try {
                handler(mockMessage);
              } catch (error) {
                logger.error('Error in mock message handler', error as Error);
              }
            });
          }
        }
      });
    }, 2000); // 每2秒推送一次模拟数据
  }

  private stopMockDataStream(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }
}

// ==================== Hook 工厂函数 ====================

import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseWebSocketOptions {
  url?: string;
  channels?: string[];
  autoConnect?: boolean;
  useMock?: boolean;
}

export function createWebSocketHook(defaultConfig: WebSocketConfig) {
  return function useWebSocket<T = unknown>(options: UseWebSocketOptions = {}) {
    const { url = defaultConfig.url, channels = [], autoConnect = true, useMock = false } = options;

    const managerRef = useRef<WebSocketManager | null>(null);
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
      const ManagerClass = useMock ? MockWebSocketManager : WebSocketManager;
      managerRef.current = new ManagerClass({
        ...defaultConfig,
        url,
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
    }, [url, autoConnect, useMock]);

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
    }, [channels.join(',')]);

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

    return {
      status,
      lastMessage,
      lastUpdated,
      connect,
      disconnect,
      reconnect,
      send,
      subscribe,
      isConnected: status === 'connected',
      isConnecting: status === 'connecting',
      isReconnecting: status === 'reconnecting',
    };
  };
}

// 默认导出配置好的 hook
export const useWebSocket = createWebSocketHook({
  url: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.example.com/ws',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
});
