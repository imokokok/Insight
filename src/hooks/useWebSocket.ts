'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useWebSocket');

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

export interface WebSocketOptions {
  url: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface UseWebSocketReturn<T = unknown> {
  status: WebSocketStatus;
  lastMessage: WebSocketMessage<T> | null;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  send: (message: Record<string, unknown>) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

// 指数退避计算
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const maxDelay = 30000; // 最大延迟30秒
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // 添加随机抖动，避免重连风暴
  return delay + Math.random() * 1000;
}

export function useWebSocket<T = unknown>(options: WebSocketOptions): UseWebSocketReturn<T> {
  const {
    url,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    heartbeatTimeout = 10000,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());
  const messageQueueRef = useRef<string[]>([]);
  const isManualDisconnectRef = useRef(false);

  // 清理所有定时器
  const clearAllTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // 启动心跳检测
  const startHeartbeat = useCallback(() => {
    clearAllTimers();

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // 发送心跳 ping
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

        // 设置心跳超时检测
        heartbeatTimeoutRef.current = setTimeout(() => {
          logger.warn('Heartbeat timeout, closing connection...');
          wsRef.current?.close();
        }, heartbeatTimeout);
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, heartbeatTimeout, clearAllTimers]);

  // 处理心跳响应
  const handlePong = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // 刷新消息队列
  const flushMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      if (message) {
        wsRef.current.send(message);
      }
    }
  }, []);

  // 重新订阅频道
  const resubscribeChannels = useCallback(() => {
    subscribedChannelsRef.current.forEach((channel) => {
      wsRef.current?.send(
        JSON.stringify({
          type: 'subscribe',
          channel,
          timestamp: Date.now(),
        })
      );
    });
  }, []);

  // 处理 WebSocket 消息
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage<T> = JSON.parse(event.data);

        // 处理心跳响应
        if (message.type === 'pong') {
          handlePong();
          return;
        }

        setLastMessage(message);
        onMessage?.(message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', error as Error);
      }
    },
    [onMessage, handlePong]
  );

  // 尝试重连（指数退避）
  const attemptReconnect = useCallback(() => {
    if (isManualDisconnectRef.current) return;

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      setStatus('error');
      return;
    }

    reconnectAttemptsRef.current++;
    setStatus('reconnecting');

    const delay = calculateBackoffDelay(reconnectAttemptsRef.current - 1, reconnectInterval);
    logger.info(`Reconnecting in ${delay}ms... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);

    reconnectTimerRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }, [maxReconnectAttempts, reconnectInterval]);

  // 建立 WebSocket 连接
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      logger.warn('WebSocket already connected or connecting');
      return;
    }

    isManualDisconnectRef.current = false;
    setStatus('connecting');

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        logger.info('WebSocket connected');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
        flushMessageQueue();
        resubscribeChannels();
        onConnect?.();
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = () => {
        logger.warn('WebSocket closed');
        setStatus('disconnected');
        clearAllTimers();
        if (!isManualDisconnectRef.current) {
          attemptReconnect();
        }
        onDisconnect?.();
      };

      wsRef.current.onerror = (error) => {
        logger.error('WebSocket error', new Error(String(error)));
        setStatus('error');
        onError?.(new Error('WebSocket connection error'));
      };
    } catch (error) {
      logger.error('Failed to create WebSocket connection', error as Error);
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error(String(error)));
      attemptReconnect();
    }
  }, [url, startHeartbeat, flushMessageQueue, resubscribeChannels, handleMessage, attemptReconnect, onConnect, onDisconnect, onError, clearAllTimers]);

  // 断开连接
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearAllTimers();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
    logger.info('WebSocket disconnected manually');
  }, [clearAllTimers]);

  // 连接
  const connect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  // 重连
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connectWebSocket, 100);
  }, [disconnect, connectWebSocket]);

  // 发送消息
  const send = useCallback((message: Record<string, unknown>) => {
    const messageStr = JSON.stringify(message);

    if (status === 'connected' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(messageStr);
    } else {
      messageQueueRef.current.push(messageStr);
      logger.warn('WebSocket not connected, message queued');
    }
  }, [status]);

  // 订阅频道
  const subscribe = useCallback(
    (channel: string) => {
      subscribedChannelsRef.current.add(channel);

      if (status === 'connected') {
        send({
          type: 'subscribe',
          channel,
          timestamp: Date.now(),
        });
      }
    },
    [status, send]
  );

  // 取消订阅
  const unsubscribe = useCallback(
    (channel: string) => {
      subscribedChannelsRef.current.delete(channel);

      if (status === 'connected') {
        send({
          type: 'unsubscribe',
          channel,
          timestamp: Date.now(),
        });
      }
    },
    [status, send]
  );

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connectWebSocket();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connectWebSocket, disconnect]);

  return {
    status,
    lastMessage,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    connect,
    disconnect,
    reconnect,
    send,
    subscribe,
    unsubscribe,
  };
}

// Hook 用于订阅特定频道
export function useWebSocketChannel<T = unknown>(
  url: string,
  channel: string,
  onMessage: (data: T) => void,
  options?: Omit<WebSocketOptions, 'url' | 'onMessage'>
) {
  const { subscribe, unsubscribe, status, ...rest } = useWebSocket<T>({
    url,
    ...options,
  });

  useEffect(() => {
    if (status === 'connected') {
      subscribe(channel);
    }

    return () => {
      unsubscribe(channel);
    };
  }, [status, channel, subscribe, unsubscribe]);

  useEffect(() => {
    if (rest.lastMessage && rest.lastMessage.type === 'update') {
      onMessage(rest.lastMessage.data as T);
    }
  }, [rest.lastMessage, onMessage]);

  return {
    status,
    ...rest,
  };
}

export default useWebSocket;
