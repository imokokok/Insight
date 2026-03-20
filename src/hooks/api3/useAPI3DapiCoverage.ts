'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { API3Client } from '@/lib/oracles/api3';
import type { DAPICoverage } from '@/lib/oracles/api3';

const api3Client = new API3Client();

export interface UseAPI3DapiCoverageOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseAPI3DapiCoverageReturn {
  data: DAPICoverage | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useAPI3DapiCoverage(
  options: UseAPI3DapiCoverageOptions = {}
): UseAPI3DapiCoverageReturn {
  const { enabled = true, refreshInterval = 300000 } = options;

  const fetcher = useCallback(async (): Promise<DAPICoverage> => {
    return api3Client.getDapiCoverage();
  }, []);

  const { data, error, isLoading, refetch } = useQuery<DAPICoverage, Error>({
    queryKey: ['api3-dapi-coverage'],
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
