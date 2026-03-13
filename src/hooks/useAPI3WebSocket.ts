'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAPI3WebSocketService,
  API3PriceData,
  API3_WEBSOCKET_CONFIG,
} from '@/lib/services/api3WebSocket';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useAPI3WebSocket');

export type API3ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface UseAPI3PriceOptions {
  symbol: string;
  enabled?: boolean;
  onPriceUpdate?: (data: API3PriceData) => void;
  updateInterval?: number; // 最小更新间隔（毫秒），用于节流
}

export interface UseAPI3PriceReturn {
  priceData: API3PriceData | null;
  status: API3ConnectionStatus;
  lastUpdate: Date | null;
  error: Error | null;
  reconnect: () => void;
}

/**
 * Hook: 订阅单个 API3 价格
 * 支持实时价格更新、自动重连、更新频率控制
 */
export function useAPI3Price(options: UseAPI3PriceOptions): UseAPI3PriceReturn {
  const { symbol, enabled = true, onPriceUpdate, updateInterval = 0 } = options;

  const [priceData, setPriceData] = useState<API3PriceData | null>(null);
  const [status, setStatus] = useState<API3ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef(getAPI3WebSocketService());
  const lastUpdateTimeRef = useRef(0);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理价格更新（带节流控制）
  const handlePriceUpdate = useCallback(
    (data: API3PriceData) => {
      const now = Date.now();

      // 节流控制
      if (updateInterval > 0) {
        if (now - lastUpdateTimeRef.current < updateInterval) {
          // 如果还在节流期内，清除之前的定时器并设置新的
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
          }
          throttleTimerRef.current = setTimeout(() => {
            handlePriceUpdate(data);
          }, updateInterval - (now - lastUpdateTimeRef.current));
          return;
        }
      }

      lastUpdateTimeRef.current = now;
      setPriceData(data);
      setLastUpdate(new Date());
      setError(null);
      onPriceUpdate?.(data);
    },
    [updateInterval, onPriceUpdate]
  );

  // 重连
  const reconnect = useCallback(() => {
    serviceRef.current.reconnect();
  }, []);

  // 监听连接状态
  useEffect(() => {
    const unsubscribe = serviceRef.current.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 订阅价格
  useEffect(() => {
    if (!enabled || !symbol) return;

    // 确保连接已建立
    if (serviceRef.current.getStatus() === 'disconnected') {
      serviceRef.current.connect();
    }

    const unsubscribe = serviceRef.current.subscribePrice(symbol, handlePriceUpdate);

    return () => {
      unsubscribe();
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [enabled, symbol, handlePriceUpdate]);

  return {
    priceData,
    status,
    lastUpdate,
    error,
    reconnect,
  };
}

export interface UseAPI3PricesOptions {
  symbols: string[];
  enabled?: boolean;
  onPricesUpdate?: (data: API3PriceData[]) => void;
  updateInterval?: number;
}

export interface UseAPI3PricesReturn {
  prices: Map<string, API3PriceData>;
  status: API3ConnectionStatus;
  lastUpdate: Date | null;
  error: Error | null;
  getPrice: (symbol: string) => API3PriceData | undefined;
  reconnect: () => void;
}

/**
 * Hook: 订阅多个 API3 价格
 */
export function useAPI3Prices(options: UseAPI3PricesOptions): UseAPI3PricesReturn {
  const { symbols, enabled = true, onPricesUpdate, updateInterval = 0 } = options;

  const [prices, setPrices] = useState<Map<string, API3PriceData>>(new Map());
  const [status, setStatus] = useState<API3ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef(getAPI3WebSocketService());
  const lastUpdateTimeRef = useRef(0);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<API3PriceData[]>([]);

  // 批量处理价格更新
  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length === 0) return;

    setPrices((prevPrices) => {
      const newPrices = new Map(prevPrices);
      pendingUpdatesRef.current.forEach((data) => {
        newPrices.set(data.symbol.toUpperCase(), data);
      });
      return newPrices;
    });

    setLastUpdate(new Date());
    onPricesUpdate?.(pendingUpdatesRef.current);
    pendingUpdatesRef.current = [];
  }, [onPricesUpdate]);

  // 处理价格更新
  const handlePriceUpdate = useCallback(
    (data: API3PriceData) => {
      const now = Date.now();

      pendingUpdatesRef.current.push(data);

      if (updateInterval > 0) {
        if (now - lastUpdateTimeRef.current < updateInterval) {
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
          }
          throttleTimerRef.current = setTimeout(() => {
            lastUpdateTimeRef.current = Date.now();
            flushUpdates();
          }, updateInterval - (now - lastUpdateTimeRef.current));
          return;
        }
      }

      lastUpdateTimeRef.current = now;
      flushUpdates();
    },
    [updateInterval, flushUpdates]
  );

  // 获取特定币种价格
  const getPrice = useCallback(
    (symbol: string) => {
      return prices.get(symbol.toUpperCase());
    },
    [prices]
  );

  // 重连
  const reconnect = useCallback(() => {
    serviceRef.current.reconnect();
  }, []);

  // 监听连接状态
  useEffect(() => {
    const unsubscribe = serviceRef.current.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 订阅多个币种价格
  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    // 确保连接已建立
    if (serviceRef.current.getStatus() === 'disconnected') {
      serviceRef.current.connect();
    }

    const unsubscribes: (() => void)[] = [];

    symbols.forEach((symbol) => {
      const unsubscribe = serviceRef.current.subscribePrice(symbol, handlePriceUpdate);
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [enabled, symbols, handlePriceUpdate]);

  return {
    prices,
    status,
    lastUpdate,
    error,
    getPrice,
    reconnect,
  };
}

export interface UseAPI3RealtimeOptions {
  enabled?: boolean;
  onPriceUpdate?: (data: API3PriceData) => void;
  updateInterval?: number;
}

export interface UseAPI3RealtimeReturn {
  prices: API3PriceData[];
  status: API3ConnectionStatus;
  lastUpdate: Date | null;
  error: Error | null;
  reconnect: () => void;
}

/**
 * Hook: 订阅所有 API3 实时价格（ticker 模式）
 */
export function useAPI3Realtime(options: UseAPI3RealtimeOptions = {}): UseAPI3RealtimeReturn {
  const { enabled = true, onPriceUpdate, updateInterval = 0 } = options;

  const [prices, setPrices] = useState<API3PriceData[]>([]);
  const [status, setStatus] = useState<API3ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef(getAPI3WebSocketService());
  const lastUpdateTimeRef = useRef(0);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<API3PriceData[]>([]);

  // 批量处理价格更新
  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length === 0) return;

    setPrices((prevPrices) => {
      const priceMap = new Map(prevPrices.map((p) => [p.symbol, p]));
      pendingUpdatesRef.current.forEach((data) => {
        priceMap.set(data.symbol, data);
      });
      return Array.from(priceMap.values());
    });

    setLastUpdate(new Date());
    pendingUpdatesRef.current.forEach((data) => {
      onPriceUpdate?.(data);
    });
    pendingUpdatesRef.current = [];
  }, [onPriceUpdate]);

  // 处理批量价格更新
  const handlePricesUpdate = useCallback(
    (data: API3PriceData[]) => {
      const now = Date.now();

      pendingUpdatesRef.current.push(...data);

      if (updateInterval > 0) {
        if (now - lastUpdateTimeRef.current < updateInterval) {
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
          }
          throttleTimerRef.current = setTimeout(() => {
            lastUpdateTimeRef.current = Date.now();
            flushUpdates();
          }, updateInterval - (now - lastUpdateTimeRef.current));
          return;
        }
      }

      lastUpdateTimeRef.current = now;
      flushUpdates();
    },
    [updateInterval, flushUpdates]
  );

  // 重连
  const reconnect = useCallback(() => {
    serviceRef.current.reconnect();
  }, []);

  // 监听连接状态
  useEffect(() => {
    const unsubscribe = serviceRef.current.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 订阅所有价格
  useEffect(() => {
    if (!enabled) return;

    // 确保连接已建立
    if (serviceRef.current.getStatus() === 'disconnected') {
      serviceRef.current.connect();
    }

    const unsubscribe = serviceRef.current.subscribeAllPrices(handlePricesUpdate);

    return () => {
      unsubscribe();
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [enabled, handlePricesUpdate]);

  return {
    prices,
    status,
    lastUpdate,
    error,
    reconnect,
  };
}

export default useAPI3Price;
