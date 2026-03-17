'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAPI3WebSocketService, API3PriceData } from '@/lib/services/api3WebSocket';

export type API3ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

export interface UseAPI3PriceOptions {
  symbol: string;
  enabled?: boolean;
  onPriceUpdate?: (data: API3PriceData) => void;
  updateInterval?: number;
}

export interface UseAPI3PriceReturn {
  priceData: API3PriceData | null;
  status: API3ConnectionStatus;
  lastUpdate: Date | null;
  error: Error | null;
  reconnect: () => void;
}

export function useAPI3Price(options: UseAPI3PriceOptions): UseAPI3PriceReturn {
  const { symbol, enabled = true, onPriceUpdate, updateInterval = 0 } = options;

  const [priceData, setPriceData] = useState<API3PriceData | null>(null);
  const [status, setStatus] = useState<API3ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef(getAPI3WebSocketService());
  const lastUpdateTimeRef = useRef(0);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePriceUpdate = useCallback(
    (data: API3PriceData) => {
      const now = Date.now();

      if (updateInterval > 0) {
        if (now - lastUpdateTimeRef.current < updateInterval) {
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
          }
          throttleTimerRef.current = setTimeout(
            () => {
              handlePriceUpdate(data);
            },
            updateInterval - (now - lastUpdateTimeRef.current)
          );
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

  const reconnect = useCallback(() => {
    serviceRef.current.reconnect();
  }, []);

  useEffect(() => {
    const unsubscribe = serviceRef.current.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!enabled || !symbol) return;

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

export default useAPI3Price;
