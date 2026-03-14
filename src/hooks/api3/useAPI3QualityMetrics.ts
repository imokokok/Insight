'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { API3Client } from '@/lib/oracles/api3';

const api3Client = new API3Client();

export interface API3QualityMetrics {
  freshness: {
    lastUpdated: Date;
    updateInterval: number;
  };
  completeness: {
    successCount: number;
    totalCount: number;
  };
  reliability: {
    historicalAccuracy: number;
    responseSuccessRate: number;
    uptime: number;
  };
}

export interface UseAPI3QualityMetricsOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseAPI3QualityMetricsReturn {
  data: API3QualityMetrics | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useAPI3QualityMetrics(
  options: UseAPI3QualityMetricsOptions = {}
): UseAPI3QualityMetricsReturn {
  const { enabled = true, refreshInterval = 60000 } = options;

  const fetcher = useCallback(async (): Promise<API3QualityMetrics> => {
    return api3Client.getDataQualityMetrics();
  }, []);

  const { data, error, isLoading, refetch } = useQuery<API3QualityMetrics, Error>({
    queryKey: ['api3-quality-metrics'],
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
