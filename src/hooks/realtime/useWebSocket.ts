'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import {
  type WebSocketManager,
  type WebSocketStatus,
  type WebSocketMessage,
  type ConnectionStats,
  type WebSocketConfig,
  createWebSocketManager,
  releaseWebSocketManager,
} from '@/lib/realtime/WebSocketManager';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useWebSocket');

// ==================== Type Definitions ====================

export interface UseWebSocketOptions {
  url: string;
  channels?: string[];
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempt: number) => void;
}

export interface UseWebSocketReturn<T = unknown> {
  status: WebSocketStatus;
  lastMessage: WebSocketMessage<T> | null;
  lastUpdated: Date | null;
  stats: ConnectionStats;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  subscribe: (channel: string, handler: (message: WebSocketMessage<T>) => void) => () => void;
  send: (message: Record<string, unknown>) => void;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
}

// ==================== Hook Implementation ====================

/**
 * Optimized WebSocket Hook
 * Provides type safety, performance monitoring, and automatic reconnection
 */
export function useWebSocket<T = unknown>(options: UseWebSocketOptions): UseWebSocketReturn<T> {
  const {
    url,
    channels = [],
    autoConnect = true,
    reconnectInterval,
    maxReconnectAttempts,
    heartbeatInterval,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  } = options;

  const managerRef = useRef<WebSocketManager | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stats, setStats] = useState<ConnectionStats>({
    connectionCount: 0,
    reconnectionCount: 0,
    messageCount: 0,
    errorCount: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    totalUptime: 0,
    averageLatency: 0,
  });

  // 使用 ref 存储回调函数，避免依赖变化导致 manager 重建
  const callbacksRef = useRef({
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  });
  callbacksRef.current = { onConnect, onDisconnect, onError, onReconnect };

  // Create WebSocket manager
  useEffect(() => {
    const config: WebSocketConfig = {
      url,
      reconnectInterval,
      maxReconnectAttempts,
      heartbeatInterval,
      onConnect: () => {
        logger.debug('WebSocket connected');
        callbacksRef.current.onConnect?.();
      },
      onDisconnect: () => {
        logger.debug('WebSocket disconnected');
        callbacksRef.current.onDisconnect?.();
      },
      onError: (error) => {
        logger.error('WebSocket error', error);
        callbacksRef.current.onError?.(error);
      },
      onReconnect: (attempt) => {
        logger.debug(`WebSocket reconnecting, attempt ${attempt}`);
        callbacksRef.current.onReconnect?.(attempt);
      },
    };

    managerRef.current = createWebSocketManager(config);

    // Listen for status changes
    const unsubscribeStatus = managerRef.current.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setStats(managerRef.current!.getStats());
    });

    if (autoConnect) {
      managerRef.current.connect();
    }

    return () => {
      unsubscribeStatus();
      if (managerRef.current) {
        releaseWebSocketManager(config);
        managerRef.current = null;
      }
    };
    // 移除回调函数依赖，使用 ref 存储
  }, [url, autoConnect, reconnectInterval, maxReconnectAttempts, heartbeatInterval]);

  // Subscribe to channels
  const channelsKey = useMemo(() => channels.join(','), [channels]);

  useEffect(() => {
    if (!managerRef.current || channels.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    channels.forEach((channel) => {
      const unsubscribe = managerRef.current!.subscribe<T>(channel, (message) => {
        setLastMessage(message);
        setLastUpdated(new Date());
        setStats(managerRef.current!.getStats());
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [channelsKey, channels]);

  // Control methods
  const connect = useCallback(() => {
    managerRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    managerRef.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    managerRef.current?.reconnect();
  }, []);

  const subscribe = useCallback(
    (channel: string, handler: (message: WebSocketMessage<T>) => void) => {
      if (!managerRef.current) {
        return () => {};
      }
      return managerRef.current.subscribe<T>(channel, handler);
    },
    []
  );

  const send = useCallback((message: Record<string, unknown>) => {
    managerRef.current?.send(message);
  }, []);

  return {
    status,
    lastMessage,
    lastUpdated,
    stats,
    connect,
    disconnect,
    reconnect,
    subscribe,
    send,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
  };
}

// ==================== Specialized Hooks ====================

/**
 * Price data WebSocket hook for real-time price updates
 */
export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  change24h?: number;
  volume24h?: number;
}

export interface UsePriceWebSocketOptions {
  symbols: string[];
  autoConnect?: boolean;
  onPriceUpdate?: (update: PriceUpdate) => void;
}

export function usePriceWebSocket(options: UsePriceWebSocketOptions) {
  const { symbols, autoConnect = true, onPriceUpdate } = options;
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());

  // 使用 ref 存储 symbols 和 onPriceUpdate，避免依赖变化
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  const onPriceUpdateRef = useRef(onPriceUpdate);
  onPriceUpdateRef.current = onPriceUpdate;

  // 使用 useMemo 稳定 channels 数组
  const symbolsKey = symbols.sort().join(',');
  const channels = useMemo(
    () => symbols.map((s) => `price:${s}`),
    [symbolsKey]
  );

  const ws = useWebSocket<PriceUpdate>({
    url: process.env.NEXT_PUBLIC_WS_URL || '',
    channels,
    autoConnect,
  });

  // 使用 ref 存储 subscribe 函数
  const subscribeRef = useRef(ws.subscribe);
  subscribeRef.current = ws.subscribe;

  useEffect(() => {
    if (!ws.isConnected) return;

    // 使用 ref 获取最新的 symbols
    const currentSymbols = symbolsRef.current;

    const unsubscribes = currentSymbols.map((symbol) =>
      subscribeRef.current(`price:${symbol}`, (message) => {
        const update = message.data;
        setPrices((prev) => {
          const next = new Map(prev);
          next.set(update.symbol, update);
          // 限制 Map 大小
          if (next.size > 1000) {
            const firstKey = next.keys().next().value;
            if (firstKey !== undefined) {
              next.delete(firstKey);
            }
          }
          return next;
        });
        onPriceUpdateRef.current?.(update);
      })
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // 移除 symbols 和 onPriceUpdate 依赖，使用 ref 避免重复订阅
  }, [ws.isConnected]);

  return {
    ...ws,
    prices,
    getPrice: (symbol: string) => prices.get(symbol),
  };
}

/**
 * Alert WebSocket hook for real-time alert notifications
 */
export interface AlertUpdate {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
}

export interface UseAlertWebSocketOptions {
  autoConnect?: boolean;
  onAlert?: (alert: AlertUpdate) => void;
  filter?: (alert: AlertUpdate) => boolean;
}

export function useAlertWebSocket(options: UseAlertWebSocketOptions = {}) {
  const { autoConnect = true, onAlert, filter } = options;
  const [alerts, setAlerts] = useState<AlertUpdate[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const ws = useWebSocket<AlertUpdate>({
    url: process.env.NEXT_PUBLIC_WS_URL || '',
    channels: ['alerts'],
    autoConnect,
  });

  useEffect(() => {
    if (!ws.isConnected) return;

    const unsubscribe = ws.subscribe('alerts', (message) => {
      const alert = message.data;

      if (filter && !filter(alert)) return;

      setAlerts((prev) => [alert, ...prev].slice(0, 100));
      setUnreadCount((prev) => prev + 1);
      onAlert?.(alert);
    });

    return () => {
      unsubscribe();
    };
  }, [ws.isConnected, ws.subscribe, filter, onAlert]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  return {
    ...ws,
    alerts,
    unreadCount,
    markAsRead,
    clearAlerts,
  };
}

/**
 * Network statistics WebSocket hook for real-time network metrics
 */
export interface NetworkStatsUpdate {
  totalTVS: number;
  activeNodes: number;
  totalChains: number;
  avgLatency: number;
  timestamp: number;
}

export interface UseNetworkStatsWebSocketOptions {
  autoConnect?: boolean;
  onStatsUpdate?: (stats: NetworkStatsUpdate) => void;
}

export function useNetworkStatsWebSocket(options: UseNetworkStatsWebSocketOptions = {}) {
  const { autoConnect = true, onStatsUpdate } = options;
  const [stats, setStats] = useState<NetworkStatsUpdate | null>(null);

  const ws = useWebSocket<NetworkStatsUpdate>({
    url: process.env.NEXT_PUBLIC_WS_URL || '',
    channels: ['network:stats'],
    autoConnect,
  });

  useEffect(() => {
    if (!ws.isConnected) return;

    const unsubscribe = ws.subscribe('network:stats', (message) => {
      const update = message.data;
      setStats(update);
      onStatsUpdate?.(update);
    });

    return () => {
      unsubscribe();
    };
  }, [ws.isConnected, ws.subscribe, onStatsUpdate]);

  return {
    ...ws,
    networkStats: stats,
  };
}

// ==================== Utility Functions ====================

/**
 * Creates a WebSocket URL with query parameters
 * @param baseUrl - The base WebSocket URL
 * @param params - Optional query parameters
 * @returns Complete WebSocket URL with parameters
 */
export function createWebSocketUrl(baseUrl: string, params?: Record<string, string>): string {
  const url = new URL(baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

/**
 * Checks if WebSocket is supported in the current environment
 * @returns Boolean indicating WebSocket support
 */
export function isWebSocketSupported(): boolean {
  return typeof WebSocket !== 'undefined';
}

/**
 * Gets human-readable status text for WebSocket status
 * @param status - WebSocket status
 * @returns Localized status text
 */
export function getWebSocketStatusText(status: WebSocketStatus): string {
  const statusMap: Record<WebSocketStatus, string> = {
    connecting: 'Connecting',
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting',
    error: 'Error',
  };
  return statusMap[status];
}

/**
 * Gets color code for WebSocket status (for UI indicators)
 * @param status - WebSocket status
 * @returns Color name for the status
 */
export function getWebSocketStatusColor(status: WebSocketStatus): string {
  const colorMap: Record<WebSocketStatus, string> = {
    connecting: 'yellow',
    connected: 'green',
    disconnected: 'gray',
    reconnecting: 'orange',
    error: 'red',
  };
  return colorMap[status];
}
