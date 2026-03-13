'use client';

import useSWR from 'swr';
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

  const key = enabled ? 'api3-staking-data' : null;

  const fetcher = useCallback(async (): Promise<StakingData> => {
    return api3Client.getStakingData();
  }, []);

  const { data, error, isLoading, mutate } = useSWR<StakingData>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
