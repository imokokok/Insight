'use client';

import useSWR from 'swr';
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

  const key = enabled ? 'api3-quality-metrics' : null;

  const fetcher = useCallback(async (): Promise<API3QualityMetrics> => {
    return api3Client.getDataQualityMetrics();
  }, []);

  const { data, error, isLoading, mutate } = useSWR<API3QualityMetrics>(key, fetcher, {
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
