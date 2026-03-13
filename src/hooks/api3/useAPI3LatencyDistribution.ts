'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { API3Client } from '@/lib/oracles/api3';

const api3Client = new API3Client();

export interface UseAPI3LatencyDistributionOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseAPI3LatencyDistributionReturn {
  data: number[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useAPI3LatencyDistribution(
  options: UseAPI3LatencyDistributionOptions = {}
): UseAPI3LatencyDistributionReturn {
  const { enabled = true, refreshInterval = 120000 } = options;

  const key = enabled ? 'api3-latency-distribution' : null;

  const fetcher = useCallback(async (): Promise<number[]> => {
    return api3Client.getLatencyDistribution();
  }, []);

  const { data, error, isLoading, mutate } = useSWR<number[]>(key, fetcher, {
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
