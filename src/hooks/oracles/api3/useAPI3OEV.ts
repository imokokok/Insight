'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client, type OEVNetworkStats, type OEVAuction } from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';

import { getAPI3Key } from './types';

const api3Client = new API3Client();

export function useAPI3OEVStats(enabled = true) {
  const queryKey = getAPI3Key('oevStats');
  const config = CACHE_CONFIG.api3.oev;

  const { data, error, isLoading, refetch } = useQuery<OEVNetworkStats, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getOEVNetworkStats();
        const oevStats = 'data' in result ? result.data : result;
        await api3OfflineStorage.setData('oevStats', oevStats, config.gcTime);
        return oevStats;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<OEVNetworkStats>('oevStats');
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
    oevStats: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3OEVAuctions(limit?: number, enabled = true) {
  const queryKey = getAPI3Key('oevAuctions', { limit });
  const config = CACHE_CONFIG.api3.oevAuctions;

  const { data, error, isLoading, refetch } = useQuery<OEVAuction[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getOEVAuctions(limit);
        await api3OfflineStorage.setData(
          `oevAuctions-${limit || 'default'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<OEVAuction[]>(
          `oevAuctions-${limit || 'default'}`
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
    auctions: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
