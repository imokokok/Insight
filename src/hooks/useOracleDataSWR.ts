'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useCallback } from 'react';
import { useSWRGlobal } from '@/providers/SWRProvider';

export interface UseOracleDataSWROptions<T> extends Omit<SWRConfiguration<T>, 'fallback'> {
  key: string;
  staleTime?: number;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  enabled?: boolean;
}

export interface UseOracleDataSWRReturn<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useOracleDataSWR<T>(
  options: UseOracleDataSWROptions<T>
): UseOracleDataSWRReturn<T> {
  const {
    key,
    staleTime = 30000,
    refreshInterval,
    revalidateOnFocus = false,
    enabled = true,
    ...restOptions
  } = options;

  const swrOptions: SWRConfiguration<T> = {
    ...restOptions,
    revalidateOnFocus,
    dedupingInterval: 2000,
    ...(refreshInterval ? { refreshInterval } : {}),
  };

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
  } = useSWR<T>(enabled ? key : null, swrOptions);

  const handleMutate = useCallback(
    async (newData?: T) => {
      await swrMutate(newData, false);
    },
    [swrMutate]
  );

  const refetch = useCallback(async () => {
    await mutate(key, (current: T | undefined) => current, { revalidate: true });
  }, [key]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: handleMutate,
    refetch,
  };
}

export interface UseOraclePrefetchOptions {
  key: string;
  staleTime?: number;
}

export function useOraclePrefetch() {
  const { prefetch } = useSWRGlobal();

  const preloadData = useCallback(
    async (key: string, customStaleTime?: number) => {
      const finalKey = customStaleTime ? `${key}?staleTime=${customStaleTime}` : key;
      await prefetch(finalKey);
    },
    [prefetch]
  );

  return {
    preload: preloadData,
  };
}
