'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client, type DAPIPriceDeviation, type DataSourceInfo } from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';

import { getAPI3Key } from './types';

import type { UseAPI3QualityMetricsReturn } from './types';

const api3Client = new API3Client();

export function useAPI3QualityMetrics(enabled = true) {
  const queryKey = getAPI3Key('quality');
  const config = CACHE_CONFIG.api3.quality;

  const { data, error, isLoading, refetch } = useQuery<UseAPI3QualityMetricsReturn, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDataQualityMetrics();
        await api3OfflineStorage.setData('quality', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<UseAPI3QualityMetricsReturn>('quality');
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
    qualityMetrics: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3Deviations(enabled = true) {
  const queryKey = getAPI3Key('deviations');
  const config = CACHE_CONFIG.api3.deviations;

  const { data, error, isLoading, refetch } = useQuery<DAPIPriceDeviation[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDapiPriceDeviations();
        await api3OfflineStorage.setData('deviations', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<DAPIPriceDeviation[]>('deviations');
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
    deviations: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3SourceTrace(enabled = true) {
  const queryKey = getAPI3Key('sourceTrace');
  const config = CACHE_CONFIG.api3.sourceTrace;

  const { data, error, isLoading, refetch } = useQuery<DataSourceInfo[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDataSourceTraceability();
        await api3OfflineStorage.setData('sourceTrace', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<DataSourceInfo[]>('sourceTrace');
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
    sourceTrace: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
