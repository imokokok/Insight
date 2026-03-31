'use client';

import { useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

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

  const fetcher = useCallback(async (): Promise<number[]> => {
    const result = await api3Client.getLatencyDistribution();
    return result.data;
  }, []);

  const { data, error, isLoading, refetch } = useQuery<number[], Error>({
    queryKey: ['api3-latency-distribution'],
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
