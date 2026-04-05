'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client, type StakingData, type StakerReward } from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';

import { getAPI3Key } from './types';

const api3Client = new API3Client();

export function useAPI3Staking(enabled = true) {
  const queryKey = getAPI3Key('staking');
  const config = CACHE_CONFIG.api3.staking;

  const { data, error, isLoading, refetch } = useQuery<StakingData, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getStakingData();
        await api3OfflineStorage.setData('staking', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<StakingData>('staking');
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
    staking: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3StakerRewards(address?: string, enabled = true) {
  const queryKey = getAPI3Key('stakerRewards', { address });
  const config = CACHE_CONFIG.api3.stakerRewards;

  const { data, error, isLoading, refetch } = useQuery<StakerReward[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getStakerRewards(address);
        await api3OfflineStorage.setData(
          `stakerRewards-${address || 'all'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<StakerReward[]>(
          `stakerRewards-${address || 'all'}`
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
    stakerRewards: data ?? [],
    error,
    isLoading,
    refetch,
  };
}
