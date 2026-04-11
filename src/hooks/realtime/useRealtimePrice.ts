'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import type { PriceUpdatePayload } from '@/lib/supabase/realtime';
import { useConnectionStatus, useRealtimeActions } from '@/stores/realtimeStore';
import type { OracleProvider, Blockchain } from '@/types/oracle';

export interface RealtimePriceData {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  price: number;
  timestamp: number;
  confidence?: number;
  source?: string;
}

export interface UseRealtimePriceOptions {
  provider?: OracleProvider;
  symbol?: string;
  chain?: Blockchain;
  enabled?: boolean;
  onPriceUpdate?: (data: RealtimePriceData) => void;
}

export interface UseRealtimePriceReturn {
  priceData: RealtimePriceData | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
  error: Error | null;
}

export function useRealtimePrice(options: UseRealtimePriceOptions): UseRealtimePriceReturn {
  const { provider, symbol, chain, enabled = true, onPriceUpdate } = options;
  const connectionStatus = useConnectionStatus();
  const { subscribeToPriceUpdates } = useRealtimeActions();
  const [priceData, setPriceData] = useState<RealtimePriceData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 使用 ref 存储 onPriceUpdate 回调，避免依赖循环
  const onPriceUpdateRef = useRef(onPriceUpdate);

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);

  const handlePriceUpdate = useCallback(
    (payload: PriceUpdatePayload) => {
      try {
        if (payload.eventType === 'DELETE') {
          return;
        }

        const newPrice = payload.new;

        if (provider && newPrice.provider !== provider) {
          return;
        }

        if (symbol && newPrice.symbol !== symbol) {
          return;
        }

        if (chain && newPrice.chain !== chain) {
          return;
        }

        const data: RealtimePriceData = {
          provider: newPrice.provider as OracleProvider,
          symbol: newPrice.symbol,
          chain: newPrice.chain as Blockchain | undefined,
          price: newPrice.price,
          timestamp:
            typeof newPrice.timestamp === 'string'
              ? new Date(newPrice.timestamp).getTime()
              : newPrice.timestamp,
          confidence: newPrice.confidence ?? undefined,
          source: newPrice.source ?? undefined,
        };

        setPriceData(data);
        setLastUpdate(new Date());
        setError(null);

        // 使用 ref 调用回调，避免依赖循环
        onPriceUpdateRef.current?.(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to process price update'));
      }
    },
    [provider, symbol, chain] // 移除 onPriceUpdate 依赖
  );

  // 使用 ref 存储 handlePriceUpdate，避免 effect 重复执行
  const handlePriceUpdateRef = useRef(handlePriceUpdate);

  useEffect(() => {
    handlePriceUpdateRef.current = handlePriceUpdate;
  }, [handlePriceUpdate]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const filters: { provider?: string; symbol?: string; chain?: string } = {};
    if (provider) filters.provider = provider;
    if (symbol) filters.symbol = symbol;
    if (chain) filters.chain = chain;

    // 使用 ref 中的回调，避免依赖变化导致重复订阅
    const unsubscribe = subscribeToPriceUpdates(
      (payload) => handlePriceUpdateRef.current(payload),
      filters
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, provider, symbol, chain, subscribeToPriceUpdates]);

  return {
    priceData,
    connectionStatus,
    lastUpdate,
    error,
  };
}

export function useRealtimePrices(
  symbols: Array<{ provider?: OracleProvider; symbol: string; chain?: Blockchain }>,
  options?: { enabled?: boolean; maxCacheSize?: number }
): {
  prices: Map<string, RealtimePriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
} {
  const { enabled = true, maxCacheSize = 1000 } = options || {};
  const connectionStatus = useConnectionStatus();
  const { subscribeToPriceUpdates } = useRealtimeActions();
  const [prices, setPrices] = useState<Map<string, RealtimePriceData>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 使用 ref 存储 handlePriceUpdate，避免 effect 重复执行
  const handlePriceUpdateRef = useRef((payload: PriceUpdatePayload) => {
    if (payload.eventType === 'DELETE') {
      return;
    }

    const newPrice = payload.new;
    const key = `${newPrice.provider}:${newPrice.symbol}:${newPrice.chain || 'default'}`;

    const data: RealtimePriceData = {
      provider: newPrice.provider as OracleProvider,
      symbol: newPrice.symbol,
      chain: newPrice.chain as Blockchain | undefined,
      price: newPrice.price,
      timestamp:
        typeof newPrice.timestamp === 'string'
          ? new Date(newPrice.timestamp).getTime()
          : newPrice.timestamp,
      confidence: newPrice.confidence ?? undefined,
      source: newPrice.source ?? undefined,
    };

    setPrices((prevPrices) => {
      const newPrices = new Map(prevPrices);
      newPrices.set(key, data);

      // 限制 Map 大小，防止内存泄漏
      if (newPrices.size > maxCacheSize) {
        const firstKey = newPrices.keys().next().value;
        if (firstKey !== undefined) {
          newPrices.delete(firstKey);
        }
      }

      return newPrices;
    });
    setLastUpdate(new Date());
  });

  const symbolsKey = useMemo(() => {
    return symbols
      .map((s) => `${s.provider || ''}:${s.symbol}:${s.chain || ''}`)
      .sort()
      .join(',');
  }, [symbols]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      return;
    }

    // 使用 ref 中的回调，避免依赖变化导致重复订阅
    const unsubscribe = subscribeToPriceUpdates((payload) => handlePriceUpdateRef.current(payload));

    return () => {
      unsubscribe();
    };
  }, [enabled, symbolsKey, symbols.length, subscribeToPriceUpdates]);

  return {
    prices,
    connectionStatus,
    lastUpdate,
  };
}
