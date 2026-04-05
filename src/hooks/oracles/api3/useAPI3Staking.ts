'use client';

import { useQuery } from '@tanstack/react-query';

import { API3Client, type StakingData } from '@/lib/oracles/api3';

const api3Client = new API3Client();

/**
 * useAPI3Staking - Fetches staking pool aggregate data
 */
export function useAPI3Staking(enabled = true) {
  const { data, error, isLoading, refetch } = useQuery<StakingData, Error>({
    queryKey: ['api3-staking'],
    queryFn: async () => {
      return api3Client.getStakingData();
    },
    enabled,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
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
