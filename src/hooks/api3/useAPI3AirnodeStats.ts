'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { API3Client, AirnodeNetworkStats } from '@/lib/oracles/api3';

const api3Client = new API3Client();

export interface UseAPI3AirnodeStatsOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseAPI3AirnodeStatsReturn {
  data: AirnodeNetworkStats | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useAPI3AirnodeStats(
  options: UseAPI3AirnodeStatsOptions = {}
): UseAPI3AirnodeStatsReturn {
  const { enabled = true, refreshInterval = 60000 } = options;

  const key = enabled ? 'api3-airnode-stats' : null;

  const fetcher = useCallback(async (): Promise<AirnodeNetworkStats> => {
    return api3Client.getAirnodeNetworkStats();
  }, []);

  const { data, error, isLoading, mutate } = useSWR<AirnodeNetworkStats>(key, fetcher, {
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
