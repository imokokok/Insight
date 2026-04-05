'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import type { OHLCVDataPoint } from '@/lib/indicators';
import { API3Client } from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';
import type { PriceData } from '@/types/oracle';

import { getAPI3Key } from './types';
import { useCacheStatus } from './useAPI3Cache';

import type { UseAPI3OHLCOptions, UseAPI3PriceOptions } from './types';

const api3Client = new API3Client();

export function useAPI3Price(options: UseAPI3PriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getAPI3Key('price', { symbol, chain });
  const config = CACHE_CONFIG.api3.price;

  const { data, error, isLoading, refetch, isStale, dataUpdatedAt } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getPrice(symbol, chain);
        await api3OfflineStorage.setData(
          `price-${symbol}-${chain || 'default'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<PriceData>(
          `price-${symbol}-${chain || 'default'}`
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

  const cacheStatus = useCacheStatus('price', { symbol, chain });

  return {
    price: data,
    error,
    isLoading,
    refetch,
    isStale: isStale || cacheStatus.isStale,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3OHLC(options: UseAPI3OHLCOptions) {
  const { symbol, chain, period = 30, enabled = true } = options;
  const queryKey = getAPI3Key('ohlc', { symbol, chain, period });
  const config = CACHE_CONFIG.api3.ohlc;

  const { data, error, isLoading, refetch } = useQuery<OHLCVDataPoint[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getOHLCPrices(symbol, chain, period);
        const ohlcData = 'data' in result ? result.data : result;
        await api3OfflineStorage.setData(
          `ohlc-${symbol}-${chain || 'default'}-${period}`,
          ohlcData,
          config.gcTime
        );
        return ohlcData;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<OHLCVDataPoint[]>(
          `ohlc-${symbol}-${chain || 'default'}-${period}`
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

  return {
    ohlc: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
