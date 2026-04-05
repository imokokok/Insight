'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client, type API3Alert, type AlertThreshold } from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';

import { getAPI3Key } from './types';
import { useCacheStatus } from './useAPI3Cache';

const api3Client = new API3Client();

export function useAPI3Alerts(enabled = true) {
  const queryKey = getAPI3Key('alerts');
  const config = CACHE_CONFIG.api3.alerts;

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery<API3Alert[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getActiveAlerts();
        await api3OfflineStorage.setData('alerts', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<API3Alert[]>('alerts');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  const unreadCount = useMemo(() => {
    return data?.filter((alert) => !alert.isRead).length ?? 0;
  }, [data]);

  const criticalCount = useMemo(() => {
    return data?.filter((alert) => alert.severity === 'critical' && !alert.isResolved).length ?? 0;
  }, [data]);

  const warningCount = useMemo(() => {
    return data?.filter((alert) => alert.severity === 'warning' && !alert.isResolved).length ?? 0;
  }, [data]);

  const cacheStatus = useCacheStatus('alerts');

  return {
    alerts: data ?? [],
    unreadCount,
    criticalCount,
    warningCount,
    error,
    isLoading,
    refetch,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3AlertHistory(limit: number = 20, enabled = true) {
  const queryKey = getAPI3Key('alertHistory', { limit });
  const config = CACHE_CONFIG.api3.alertHistory;

  const { data, error, isLoading, refetch } = useQuery<API3Alert[], Error>({
    queryKey,
    queryFn: () => api3Client.getAlertHistory(limit),
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    alertHistory: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3AlertThresholds(enabled = true) {
  const queryKey = getAPI3Key('alertThresholds');
  const config = CACHE_CONFIG.api3.alertThresholds;

  const { data, error, isLoading, refetch } = useQuery<AlertThreshold[], Error>({
    queryKey,
    queryFn: () => api3Client.getAlertThresholds(),
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    thresholds: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
