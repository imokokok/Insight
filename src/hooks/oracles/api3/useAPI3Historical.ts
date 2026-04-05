'use client';

import { useQuery } from '@tanstack/react-query';

import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client } from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';
import type { PriceData } from '@/types/oracle';

import { getAPI3Key } from './types';
import { useCacheStatus } from './useAPI3Cache';

import type { UseAPI3HistoricalOptions } from './types';

const api3Client = new API3Client();

export function useAPI3Historical(options: UseAPI3HistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getAPI3Key('historical', { symbol, chain, period });
  const config = CACHE_CONFIG.api3.historical;

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getHistoricalPrices(symbol, chain, period);
        await api3OfflineStorage.setData(
          `historical-${symbol}-${chain || 'default'}-${period}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<PriceData[]>(
          `historical-${symbol}-${chain || 'default'}-${period}`
        );
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
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const cacheStatus = useCacheStatus('historical', { symbol, chain, period });

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3QualityHistory(enabled = true) {
  const queryKey = getAPI3Key('qualityHistory');
  const config = CACHE_CONFIG.api3.qualityHistory;

  const { data, error, isLoading, refetch } = useQuery<QualityDataPoint[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getQualityHistory();
        await api3OfflineStorage.setData('qualityHistory', result.data, config.gcTime);
        return result.data;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<QualityDataPoint[]>('qualityHistory');
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
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    qualityHistory: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
