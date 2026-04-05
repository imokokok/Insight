'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import {
  API3Client,
  type DAPICoverage,
  type CoveragePoolEvent,
  type CoveragePoolDetails,
  type CoveragePoolClaim,
} from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';

import { getAPI3Key } from './types';

const api3Client = new API3Client();

export function useAPI3DapiCoverage(enabled = true) {
  const queryKey = getAPI3Key('dapiCoverage');
  const config = CACHE_CONFIG.api3.dapiCoverage;

  const { data, error, isLoading, refetch } = useQuery<DAPICoverage, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDapiCoverage();
        await api3OfflineStorage.setData('dapiCoverage', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<DAPICoverage>('dapiCoverage');
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
    dapiCoverage: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CoverageEvents(enabled = true) {
  const queryKey = getAPI3Key('coverageEvents');
  const config = CACHE_CONFIG.api3.coverageEvents;

  const { data, error, isLoading, refetch } = useQuery<CoveragePoolEvent[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCoveragePoolEvents();
        await api3OfflineStorage.setData('coverageEvents', result.data, config.gcTime);
        return result.data;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<CoveragePoolEvent[]>('coverageEvents');
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
    coverageEvents: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CoveragePoolDetails(enabled = true) {
  const queryKey = getAPI3Key('coveragePoolDetails');
  const config = CACHE_CONFIG.api3.coveragePoolDetails;

  const { data, error, isLoading, refetch } = useQuery<CoveragePoolDetails, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCoveragePoolDetails();
        await api3OfflineStorage.setData('coveragePoolDetails', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData =
          await api3OfflineStorage.getData<CoveragePoolDetails>('coveragePoolDetails');
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
    coveragePoolDetails: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CoveragePoolClaims(status?: string, enabled = true) {
  const queryKey = getAPI3Key('coveragePoolClaims', { status });
  const config = CACHE_CONFIG.api3.coveragePoolClaims;

  const { data, error, isLoading, refetch } = useQuery<CoveragePoolClaim[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCoveragePoolClaims(status);
        await api3OfflineStorage.setData(
          `coveragePoolClaims-${status || 'all'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<CoveragePoolClaim[]>(
          `coveragePoolClaims-${status || 'all'}`
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
    claims: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
