'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';
import { api3RequestManager } from '@/lib/oracles/api3RequestManager';

import { getAPI3Key } from './types';

import type { API3DataType, CacheStatus } from './types';

export function useCacheStatus(
  dataType: API3DataType,
  params?: Record<string, unknown>
): CacheStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CacheStatus>({
    isStale: false,
    lastUpdated: null,
    source: null,
    isOffline: false,
  });

  const queryKey = getAPI3Key(dataType, params);
  const checkCountRef = useRef(0);

  useEffect(() => {
    const isClient = typeof window !== 'undefined';
    if (!isClient) return;

    const checkStatus = () => {
      checkCountRef.current++;

      if (checkCountRef.current % 2 !== 0) {
        return;
      }

      const queryState = queryClient.getQueryState(queryKey);
      const config = CACHE_CONFIG.api3[dataType as keyof typeof CACHE_CONFIG.api3];

      if (queryState) {
        const now = Date.now();
        const lastUpdated = queryState.dataUpdatedAt;
        const isStale = config && now - lastUpdated > config.staleTime;

        setStatus({
          isStale: isStale || false,
          lastUpdated,
          source: queryState.status === 'success' ? 'network' : null,
          isOffline: !navigator.onLine,
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    const handleOnline = () => setStatus((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, queryKey, dataType]);

  return status;
}

export function useAPI3OfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    const checkOfflineStatus = async () => {
      const status = await api3OfflineStorage.getOfflineDataStatus();
      setIsOffline(status.isOffline);
      setLastSync(status.lastSync);
    };

    checkOfflineStatus();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, lastSync };
}

export function useAPI3CacheActions() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['api3'] });
  }, [queryClient]);

  const invalidateType = useCallback(
    async (type: API3DataType) => {
      await queryClient.invalidateQueries({ queryKey: ['api3', type] });
    },
    [queryClient]
  );

  const clearOfflineCache = useCallback(async () => {
    await api3OfflineStorage.clearAll();
  }, []);

  const precacheCritical = useCallback(async () => {
    await api3OfflineStorage.precacheCriticalData();
  }, []);

  return {
    invalidateAll,
    invalidateType,
    clearOfflineCache,
    precacheCritical,
  };
}
