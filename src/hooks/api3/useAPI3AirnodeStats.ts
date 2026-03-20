'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { API3Client } from '@/lib/oracles/api3';
import type { AirnodeNetworkStats } from '@/lib/oracles/api3';

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

  const fetcher = useCallback(async (): Promise<AirnodeNetworkStats> => {
    return api3Client.getAirnodeNetworkStats();
  }, []);

  const { data, error, isLoading, refetch } = useQuery<AirnodeNetworkStats, Error>({
    queryKey: ['api3-airnode-stats'],
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
