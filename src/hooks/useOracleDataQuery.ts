'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface UseOracleDataQueryOptions<T> {
  key: string;
  staleTime?: number;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  enabled?: boolean;
}

export interface UseOracleDataQueryReturn<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useOracleDataQuery<T>(
  options: UseOracleDataQueryOptions<T>
): UseOracleDataQueryReturn<T> {
  const {
    key,
    staleTime = 30000,
    refreshInterval,
    revalidateOnFocus = false,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  const { data, error, isLoading, isFetching, refetch } = useQuery<T, Error>({
    queryKey: [key],
    queryFn: async () => {
      const response = await fetch(key);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }
      return response.json();
    },
    enabled,
    staleTime,
    gcTime: staleTime * 2,
    refetchOnWindowFocus: revalidateOnFocus,
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleMutate = useCallback(
    async (newData?: T) => {
      if (newData !== undefined) {
        queryClient.setQueryData([key], newData);
      }
    },
    [queryClient, key]
  );

  return {
    data,
    error: error ?? undefined,
    isLoading,
    isValidating: isFetching,
    mutate: handleMutate,
    refetch: async () => {
      await refetch();
    },
  };
}

export interface UseOraclePrefetchOptions {
  key: string;
  staleTime?: number;
}

export function useOraclePrefetch() {
  const queryClient = useQueryClient();

  const preloadData = useCallback(
    async (key: string, customStaleTime?: number) => {
      const staleTime = customStaleTime || 30000;
      await queryClient.prefetchQuery({
        queryKey: [key],
        queryFn: async () => {
          const response = await fetch(key);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch data');
          }
          return response.json();
        },
        staleTime,
      });
    },
    [queryClient]
  );

  return {
    preload: preloadData,
  };
}

export const useOracleDataSWR = useOracleDataQuery;
export type UseOracleDataSWROptions<T> = UseOracleDataQueryOptions<T>;
export type UseOracleDataSWRReturn<T> = UseOracleDataQueryReturn<T>;
