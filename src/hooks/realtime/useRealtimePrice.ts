'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnectionStatus, useRealtimeActions } from '@/stores/realtimeStore';
import type { PriceUpdatePayload } from '@/lib/supabase/realtime';
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

  const handlePriceUpdate = useCallback(
    (payload: PriceUpdatePayload) => {
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

      if (onPriceUpdate) {
        onPriceUpdate(data);
      }
    },
    [provider, symbol, chain, onPriceUpdate]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const filters: { provider?: string; symbol?: string; chain?: string } = {};
    if (provider) filters.provider = provider;
    if (symbol) filters.symbol = symbol;
    if (chain) filters.chain = chain;

    const unsubscribe = subscribeToPriceUpdates(handlePriceUpdate, filters);

    return () => {
      unsubscribe();
    };
  }, [enabled, provider, symbol, chain, handlePriceUpdate, subscribeToPriceUpdates]);

  return {
    priceData,
    connectionStatus,
    lastUpdate,
    error,
  };
}

export function useRealtimePrices(
  symbols: Array<{ provider?: OracleProvider; symbol: string; chain?: Blockchain }>,
  options?: { enabled?: boolean }
): {
  prices: Map<string, RealtimePriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
} {
  const { enabled = true } = options || {};
  const connectionStatus = useConnectionStatus();
  const { subscribeToPriceUpdates } = useRealtimeActions();
  const [prices, setPrices] = useState<Map<string, RealtimePriceData>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handlePriceUpdate = useCallback((payload: PriceUpdatePayload) => {
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
      return newPrices;
    });
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      return;
    }

    const unsubscribe = subscribeToPriceUpdates(handlePriceUpdate);

    return () => {
      unsubscribe();
    };
  }, [enabled, symbols, handlePriceUpdate, subscribeToPriceUpdates]);

  return {
    prices,
    connectionStatus,
    lastUpdate,
  };
}
