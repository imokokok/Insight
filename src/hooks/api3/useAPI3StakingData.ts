'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { API3Client, StakingData } from '@/lib/oracles/api3';

const api3Client = new API3Client();

export interface UseAPI3StakingDataOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseAPI3StakingDataReturn {
  data: StakingData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useAPI3StakingData(
  options: UseAPI3StakingDataOptions = {}
): UseAPI3StakingDataReturn {
  const { enabled = true, refreshInterval = 60000 } = options;

  const fetcher = useCallback(async (): Promise<StakingData> => {
    return api3Client.getStakingData();
  }, []);

  const { data, error, isLoading, refetch } = useQuery<StakingData, Error>({
    queryKey: ['api3-staking-data'],
    queryFn: fetcher,
    enabled,
    staleTime: refreshInterval,
    gcTime: refreshInterval * 2,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    data,
    isLoading,
    error: error ?? undefined,
    refetch: async () => {
      await refetch();
    },
  };
}
