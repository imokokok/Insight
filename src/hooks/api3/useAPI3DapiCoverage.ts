'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { API3Client, DapiCoverage } from '@/lib/oracles/api3';

const api3Client = new API3Client();

export interface UseAPI3DapiCoverageOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseAPI3DapiCoverageReturn {
  data: DapiCoverage | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useAPI3DapiCoverage(
  options: UseAPI3DapiCoverageOptions = {}
): UseAPI3DapiCoverageReturn {
  const { enabled = true, refreshInterval = 300000 } = options;

  const key = enabled ? 'api3-dapi-coverage' : null;

  const fetcher = useCallback(async (): Promise<DapiCoverage> => {
    return api3Client.getDapiCoverage();
  }, []);

  const { data, error, isLoading, mutate } = useSWR<DapiCoverage>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
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
