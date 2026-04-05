'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import {
  API3Client,
  type AirnodeNetworkStats,
  type FirstPartyOracleData,
} from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';
import type { GasFeeData } from '@/types/comparison';
import type { OracleProvider } from '@/types/oracle';

import { getAPI3Key } from './types';
import { useCacheStatus } from './useAPI3Cache';

const api3Client = new API3Client();

export function useAPI3AirnodeStats(enabled = true) {
  const queryKey = getAPI3Key('airnodeStats');
  const config = CACHE_CONFIG.api3.airnodeStats;

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery<AirnodeNetworkStats, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getAirnodeNetworkStats();
        await api3OfflineStorage.setData('airnodeStats', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<AirnodeNetworkStats>('airnodeStats');
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

  const cacheStatus = useCacheStatus('airnodeStats');

  return {
    airnodeStats: data,
    error,
    isLoading,
    refetch,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3Latency(enabled = true) {
  const queryKey = getAPI3Key('latency');
  const config = CACHE_CONFIG.api3.latency;

  const { data, error, isLoading, refetch } = useQuery<number[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getLatencyDistribution();
        await api3OfflineStorage.setData('latency', result.data, config.gcTime);
        return result.data;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<number[]>('latency');
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
    latency: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3GasFees(enabled = true) {
  const queryKey = getAPI3Key('gasFees');
  const config = CACHE_CONFIG.api3.gasFees;

  const { data, error, isLoading, refetch } = useQuery<GasFeeData[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getGasFeeData();
        await api3OfflineStorage.setData('gasFees', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<GasFeeData[]>('gasFees');
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
    gasFees: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3FirstParty(enabled = true) {
  const queryKey = getAPI3Key('firstParty');
  const config = CACHE_CONFIG.api3.firstParty;

  const { data, error, isLoading, refetch } = useQuery<FirstPartyOracleData, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getFirstPartyOracleData();
        await api3OfflineStorage.setData('firstParty', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<FirstPartyOracleData>('firstParty');
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
    firstParty: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CrossOracle(enabled = true) {
  const queryKey = getAPI3Key('crossOracle');
  const config = CACHE_CONFIG.api3.crossOracle;

  const { data, error, isLoading, refetch } = useQuery<
    {
      oracle: OracleProvider;
      responseTime: number;
      accuracy: number;
      availability: number;
      costEfficiency: number;
      updateFrequency: number;
    }[],
    Error
  >({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCrossOracleComparison();
        await api3OfflineStorage.setData('crossOracle', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<
          {
            oracle: OracleProvider;
            responseTime: number;
            accuracy: number;
            availability: number;
            costEfficiency: number;
            updateFrequency: number;
          }[]
        >('crossOracle');
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
    crossOracle: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
