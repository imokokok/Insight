'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('API3WebSocket');

// API3 WebSocket 配置
export const API3_WEBSOCKET_CONFIG = {
  url: process.env.NEXT_PUBLIC_API3_WS_URL || 'wss://stream.api3.org/price',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
};

// API3 价格数据接口
export interface API3PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  change24h?: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
}

// API3 WebSocket 消息类型
export type API3MessageType = 'price' | 'trade' | 'ticker' | 'ping' | 'pong' | 'error';

export interface API3WebSocketMessage {
  type: API3MessageType;
  channel?: string;
  data?: API3PriceData | API3PriceData[];
  error?: string;
  timestamp: number;
}

// 订阅选项
export interface API3SubscribeOptions {
  symbol?: string;
  symbols?: string[];
  updateInterval?: number; // 毫秒
}

// 价格更新回调类型
export type PriceUpdateCallback = (data: API3PriceData) => void;
export type PriceUpdatesCallback = (data: API3PriceData[]) => void;

/**
 * API3 WebSocket 服务类
 * 封装 WebSocket 连接管理、消息处理和错误处理
 */
export class API3WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private priceCallbacks: Map<string, Set<PriceUpdateCallback>> = new Map();
  private allPricesCallbacks: Set<PriceUpdatesCallback> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private messageQueue: string[] = [];
  private isManualDisconnect = false;

  private status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error' =
    'disconnected';
  private statusListeners: Set<(status: typeof this.status) => void> = new Set();

  constructor(private config = API3_WEBSOCKET_CONFIG) {}

  // 获取当前状态
  getStatus(): typeof this.status {
    return this.status;
  }

  // 监听状态变化
  onStatusChange(listener: (status: typeof this.status) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  // 设置状态并通知监听器
  private setStatus(status: typeof this.status): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  // 指数退避计算
  private calculateBackoffDelay(attempt: number): number {
    const maxDelay = 30000;
    const delay = Math.min(this.config.reconnectInterval * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000;
  }

  // 建立连接
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      logger.warn('API3 WebSocket already connected or connecting');
      return;
    }

    this.isManualDisconnect = false;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        logger.info('API3 WebSocket connected');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushMessageQueue();
        this.resubscribeSymbols();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        logger.warn('API3 WebSocket closed');
        this.setStatus('disconnected');
        this.stopHeartbeat();
        if (!this.isManualDisconnect) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        logger.error('API3 WebSocket error', new Error(String(error)));
        this.setStatus('error');
      };
    } catch (error) {
      logger.error('Failed to create API3 WebSocket connection', error as Error);
      this.setStatus('error');
      this.attemptReconnect();
    }
  }

  // 断开连接
  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
    logger.info('API3 WebSocket disconnected manually');
  }

  // 重连
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    setTimeout(() => this.connect(), 100);
  }

  // 订阅价格更新
  subscribePrice(symbol: string, callback: PriceUpdateCallback): () => void {
    const upperSymbol = symbol.toUpperCase();

    if (!this.priceCallbacks.has(upperSymbol)) {
      this.priceCallbacks.set(upperSymbol, new Set());
    }

    this.priceCallbacks.get(upperSymbol)!.add(callback);

    // 如果已连接，发送订阅消息
    if (this.status === 'connected') {
      this.send({
        type: 'subscribe',
        channel: 'price',
        symbol: upperSymbol,
        timestamp: Date.now(),
      });
    }

    this.subscribedSymbols.add(upperSymbol);

    // 返回取消订阅函数
    return () => {
      this.unsubscribePrice(upperSymbol, callback);
    };
  }

  // 取消订阅价格更新
  unsubscribePrice(symbol: string, callback: PriceUpdateCallback): void {
    const upperSymbol = symbol.toUpperCase();
    const callbacks = this.priceCallbacks.get(upperSymbol);

    if (callbacks) {
      callbacks.delete(callback);

      // 如果没有回调了，取消订阅该币种
      if (callbacks.size === 0) {
        this.priceCallbacks.delete(upperSymbol);
        this.subscribedSymbols.delete(upperSymbol);

        if (this.status === 'connected') {
          this.send({
            type: 'unsubscribe',
            channel: 'price',
            symbol: upperSymbol,
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  // 订阅所有价格更新
  subscribeAllPrices(callback: PriceUpdatesCallback): () => void {
    this.allPricesCallbacks.add(callback);

    if (this.status === 'connected') {
      this.send({
        type: 'subscribe',
        channel: 'ticker',
        timestamp: Date.now(),
      });
    }

    return () => {
      this.allPricesCallbacks.delete(callback);

      if (this.allPricesCallbacks.size === 0 && this.status === 'connected') {
        this.send({
          type: 'unsubscribe',
          channel: 'ticker',
          timestamp: Date.now(),
        });
      }
    };
  }

  // 发送消息
  private send(message: Record<string, unknown>): void {
    const messageStr = JSON.stringify(message);

    if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(messageStr);
    } else {
      this.messageQueue.push(messageStr);
      logger.warn('API3 WebSocket not connected, message queued');
    }
  }

  // 处理消息
  private handleMessage(data: string): void {
    try {
      const message: API3WebSocketMessage = JSON.parse(data);

      // 处理心跳响应
      if (message.type === 'pong') {
        this.handlePong();
        return;
      }

      // 处理错误消息
      if (message.type === 'error') {
        logger.error('API3 WebSocket error message:', new Error(message.error || 'Unknown error'));
        return;
      }

      // 处理价格更新
      if (message.type === 'price' && message.data) {
        const priceData = Array.isArray(message.data) ? message.data : [message.data];

        priceData.forEach((price) => {
          // 通知特定币种的回调
          const callbacks = this.priceCallbacks.get(price.symbol.toUpperCase());
          if (callbacks) {
            callbacks.forEach((callback) => {
              try {
                callback(price);
              } catch (error) {
                logger.error('Error in price callback', error as Error);
              }
            });
          }
        });

        // 通知所有价格更新的回调
        this.allPricesCallbacks.forEach((callback) => {
          try {
            callback(priceData);
          } catch (error) {
            logger.error('Error in all prices callback', error as Error);
          }
        });
      }

      // 处理交易更新
      if (message.type === 'trade' && message.data) {
        const tradeData = Array.isArray(message.data) ? message.data : [message.data];
        logger.debug('Received trade data', { tradeData });
      }
    } catch (error) {
      logger.error('Failed to parse API3 WebSocket message', error as Error);
    }
  }

  // 启动心跳
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: Date.now(),
        });

        // 设置心跳超时
        this.heartbeatTimeoutTimer = setTimeout(() => {
          logger.warn('API3 WebSocket heartbeat timeout, reconnecting...');
          this.ws?.close();
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  // 停止心跳
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

  // 处理心跳响应
  private handlePong(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // 尝试重连
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('API3 WebSocket max reconnect attempts reached');
      this.setStatus('error');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus('reconnecting');

    const delay = this.calculateBackoffDelay(this.reconnectAttempts - 1);
    logger.info(
      `API3 WebSocket reconnecting in ${delay}ms... Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // 清除重连定时器
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // 刷新消息队列
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  // 重新订阅所有币种
  private resubscribeSymbols(): void {
    // 重新订阅单个币种价格
    this.subscribedSymbols.forEach((symbol) => {
      this.send({
        type: 'subscribe',
        channel: 'price',
        symbol,
        timestamp: Date.now(),
      });
    });

    // 重新订阅所有价格
    if (this.allPricesCallbacks.size > 0) {
      this.send({
        type: 'subscribe',
        channel: 'ticker',
        timestamp: Date.now(),
      });
    }
  }
}

// 单例实例
let api3WebSocketInstance: API3WebSocketService | null = null;

// 获取 API3 WebSocket 服务实例
export function getAPI3WebSocketService(): API3WebSocketService {
  if (!api3WebSocketInstance) {
    api3WebSocketInstance = new API3WebSocketService();
  }
  return api3WebSocketInstance;
}

// 重置实例（用于测试）
export function resetAPI3WebSocketService(): void {
  if (api3WebSocketInstance) {
    api3WebSocketInstance.disconnect();
    api3WebSocketInstance = null;
  }
}

// 格式化价格数据
export function formatAPI3PriceData(data: API3PriceData): API3PriceData {
  return {
    ...data,
    price: Number(data.price.toFixed(6)),
    timestamp: data.timestamp || Date.now(),
    change24h: data.change24h !== undefined ? Number(data.change24h.toFixed(2)) : undefined,
    volume24h: data.volume24h !== undefined ? Number(data.volume24h.toFixed(2)) : undefined,
    high24h: data.high24h !== undefined ? Number(data.high24h.toFixed(6)) : undefined,
    low24h: data.low24h !== undefined ? Number(data.low24h.toFixed(6)) : undefined,
  };
}

// 计算价格变化百分比
export function calculatePriceChangePercent(currentPrice: number, previousPrice: number): number {
  if (previousPrice === 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

// 验证价格数据
export function validatePriceData(data: unknown): data is API3PriceData {
  if (typeof data !== 'object' || data === null) return false;

  const priceData = data as Record<string, unknown>;

  return (
    typeof priceData.symbol === 'string' &&
    typeof priceData.price === 'number' &&
    typeof priceData.timestamp === 'number' &&
    !isNaN(priceData.price) &&
    priceData.price > 0
  );
}

export default API3WebSocketService;
