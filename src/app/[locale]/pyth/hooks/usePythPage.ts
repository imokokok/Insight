'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { useRefresh, useExport, usePythAllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { getPythDataService } from '@/lib/oracles';
import type { WebSocketConnectionState } from '@/lib/oracles/pythDataService';
import { OracleProvider } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { type PythTabId } from '../types';

export interface RealtimeState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  lastUpdateLatency: number;
  priceUpdateAnimation: 'up' | 'down' | 'none';
}

const ANIMATION_RESET_DELAY = 500;
const FALLBACK_POLLING_INTERVAL = 10000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function usePythPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<PythTabId>('market');
  const [realtimePrice, setRealtimePrice] = useState<PriceData | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    lastUpdateLatency: 0,
    priceUpdateAnimation: 'none',
  });
  const [wsError, setWsError] = useState<Error | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const config = useMemo(() => getOracleConfig(OracleProvider.PYTH), []);
  const previousPriceRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribePriceRef = useRef<(() => void) | null>(null);
  const unsubscribeConnectionRef = useRef<(() => void) | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const {
    price: initialPrice,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = usePythAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const price = realtimePrice || initialPrice;

  const clearAnimationTimeout = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  const updatePriceAnimation = useCallback(
    (newPrice: number) => {
      clearAnimationTimeout();

      if (previousPriceRef.current !== null) {
        if (newPrice > previousPriceRef.current) {
          setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'up' }));
        } else if (newPrice < previousPriceRef.current) {
          setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'down' }));
        } else {
          setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'none' }));
        }

        animationTimeoutRef.current = setTimeout(() => {
          setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'none' }));
        }, ANIMATION_RESET_DELAY);
      }

      previousPriceRef.current = newPrice;
    },
    [clearAnimationTimeout]
  );

  const handlePriceUpdate = useCallback(
    (updatedPrice: PriceData) => {
      const now = Date.now();
      const latency = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;

      setRealtimePrice(updatedPrice);
      setRealtimeState((prev) => ({
        ...prev,
        lastUpdateLatency: latency,
      }));
      setWsError(null);
      setIsUsingFallback(false);

      updatePriceAnimation(updatedPrice.price);
    },
    [updatePriceAnimation]
  );

  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }

    setIsUsingFallback(true);
    setRealtimeState((prev) => ({
      ...prev,
      connectionStatus: 'disconnected',
      isConnected: false,
    }));

    fallbackIntervalRef.current = setInterval(async () => {
      try {
        const pythService = getPythDataService();
        const latestPrice = await pythService.getLatestPrice(config.symbol);
        if (latestPrice) {
          handlePriceUpdate(latestPrice);
        }
      } catch (error) {
        console.error('Fallback polling error:', error);
      }
    }, FALLBACK_POLLING_INTERVAL);
  }, [config.symbol, handlePriceUpdate]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    setIsUsingFallback(false);
  }, []);

  useEffect(() => {
    const pythService = getPythDataService();

    unsubscribeConnectionRef.current = pythService.subscribeToConnectionState(
      (state: WebSocketConnectionState) => {
        setRealtimeState((prev) => ({
          ...prev,
          isConnected: state.isConnected,
          connectionStatus: state.status,
          lastUpdateLatency: state.lastUpdateLatency,
        }));

        if (state.error) {
          setWsError(state.error);
        }

        if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && state.status === 'disconnected') {
          startFallbackPolling();
        }
      }
    );

    try {
      unsubscribePriceRef.current = pythService.subscribeToPriceUpdates(
        config.symbol,
        handlePriceUpdate
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setTimeout(() => {
        setWsError(err);
        startFallbackPolling();
      }, 0);
    }

    return () => {
      if (unsubscribePriceRef.current) {
        unsubscribePriceRef.current();
        unsubscribePriceRef.current = null;
      }
      if (unsubscribeConnectionRef.current) {
        unsubscribeConnectionRef.current();
        unsubscribeConnectionRef.current = null;
      }
      stopFallbackPolling();
      clearAnimationTimeout();
    };
  }, [
    config.symbol,
    handlePriceUpdate,
    startFallbackPolling,
    stopFallbackPolling,
    clearAnimationTimeout,
  ]);

  const lastUpdated = useMemo(() => {
    if (realtimePrice?.timestamp) {
      return new Date(realtimePrice.timestamp);
    }
    if (price?.timestamp) {
      return new Date(price.timestamp);
    }
    return new Date();
  }, [realtimePrice, price]);

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
      publishers,
      validators,
      realtimeState,
    },
    filename: 'pyth-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
      if (isUsingFallback) {
        try {
          const pythService = getPythDataService();
          const latestPrice = await pythService.getLatestPrice(config.symbol);
          if (latestPrice) {
            handlePriceUpdate(latestPrice);
          }
        } catch (error) {
          console.error('Manual refresh error:', error);
        }
      }
    },
    minLoadingTime: 500,
  });

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

  const handleTabChange = useCallback((tab: PythTabId) => {
    setActiveTab(tab);
  }, []);

  const manualReconnect = useCallback(() => {
    setWsError(null);
    stopFallbackPolling();

    if (unsubscribePriceRef.current) {
      unsubscribePriceRef.current();
      unsubscribePriceRef.current = null;
    }

    const pythService = getPythDataService();
    unsubscribePriceRef.current = pythService.subscribeToPriceUpdates(
      config.symbol,
      handlePriceUpdate
    );
  }, [config.symbol, handlePriceUpdate, stopFallbackPolling]);

  const reconnectAttempts = useMemo(() => {
    const pythService = getPythDataService();
    return pythService.getConnectionState().reconnectAttempts;
  }, []);

  return {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading,
    isError,
    error: errors[0] || wsError || null,
    lastUpdated,
    isRefreshing,
    dataFreshnessStatus,
    shouldRefreshData: dataFreshnessStatus.status === 'expired',
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
    realtimeState,
    isUsingFallback,
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    manualReconnect,
  };
}
