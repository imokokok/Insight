'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { useRefresh, useExport, usePythAllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { getPythDataService } from '@/lib/oracles';
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const config = useMemo(() => getOracleConfig(OracleProvider.PYTH), []);
  const previousPriceRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

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

  const updatePriceAnimation = useCallback((newPrice: number) => {
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
  }, [clearAnimationTimeout]);

  const handlePriceUpdate = useCallback((updatedPrice: PriceData) => {
    const now = Date.now();
    const latency = now - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = now;

    setRealtimePrice(updatedPrice);
    setRealtimeState((prev) => ({
      ...prev,
      isConnected: true,
      connectionStatus: 'connected',
      lastUpdateLatency: latency,
    }));
    setWsError(null);
    setReconnectAttempts(0);
    setIsUsingFallback(false);

    updatePriceAnimation(updatedPrice.price);
  }, [updatePriceAnimation]);

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

    setRealtimeState((prev) => ({
      ...prev,
      connectionStatus: 'connecting',
    }));

    const handleWsError = (error: Error) => {
      setWsError(error);
      setReconnectAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts >= MAX_RECONNECT_ATTEMPTS) {
          startFallbackPolling();
        }
        return newAttempts;
      });
    };

    try {
      unsubscribeRef.current = pythService.subscribeToPriceUpdates(
        config.symbol,
        handlePriceUpdate
      );

      const connectionTimeout = setTimeout(() => {
        if (!realtimeState.isConnected && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          handleWsError(new Error('Connection timeout'));
        }
      }, 5000);

      return () => {
        clearTimeout(connectionTimeout);
      };
    } catch (error) {
      handleWsError(error instanceof Error ? error : new Error(String(error)));
      startFallbackPolling();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      stopFallbackPolling();
      clearAnimationTimeout();
    };
  }, [config.symbol, handlePriceUpdate, startFallbackPolling, stopFallbackPolling, clearAnimationTimeout, realtimeState.isConnected, reconnectAttempts]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      stopFallbackPolling();
      clearAnimationTimeout();
    };
  }, [stopFallbackPolling, clearAnimationTimeout]);

  const lastUpdated = useMemo(() => {
    if (realtimePrice?.timestamp) {
      return new Date(realtimePrice.timestamp);
    }
    if (price?.timestamp) {
      return new Date(price.timestamp);
    }
    return new Date();
  }, [realtimePrice?.timestamp, price?.timestamp]);

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
    setReconnectAttempts(0);
    setWsError(null);
    stopFallbackPolling();

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setRealtimeState((prev) => ({
      ...prev,
      connectionStatus: 'connecting',
    }));

    const pythService = getPythDataService();
    unsubscribeRef.current = pythService.subscribeToPriceUpdates(
      config.symbol,
      handlePriceUpdate
    );
  }, [config.symbol, handlePriceUpdate, stopFallbackPolling]);

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
