'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { Blockchain } from '@/types/oracle';

export interface OnChainDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface OnChainDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export const ON_CHAIN_DATA_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 300000,
  refetchInterval: 60000,
  refetchOnWindowFocus: true,
  retry: 2,
};

export const EMPTY_ON_CHAIN_RESULT = {
  data: null,
  isLoading: false,
  isError: false,
  error: null,
  refetch: async () => {},
};

export function createOnChainDataHook<T>(
  providerName: string,
  createService: () => {
    getTokenOnChainData: (symbol: string, chain?: Blockchain) => Promise<T | null>;
  }
): (options: OnChainDataOptions) => OnChainDataReturn<T>;
export function createOnChainDataHook<T>(
  providerName: string,
  customQueryFn: (
    symbol: string,
    chain: Blockchain | undefined,
    signal?: AbortSignal
  ) => Promise<T | null>
): (options: OnChainDataOptions) => OnChainDataReturn<T>;
export function createOnChainDataHook<T>(
  providerName: string,
  serviceOrQueryFn:
    | (() => {
        getTokenOnChainData: (symbol: string, chain?: Blockchain) => Promise<T | null>;
      })
    | ((symbol: string, chain: Blockchain | undefined, signal?: AbortSignal) => Promise<T | null>)
): (options: OnChainDataOptions) => OnChainDataReturn<T> {
  const isCustomQueryFn = typeof serviceOrQueryFn === 'function' && serviceOrQueryFn.length >= 2;

  return function useOnChainData(options: OnChainDataOptions): OnChainDataReturn<T> {
    const { symbol, chain, enabled = true } = options;
    const queryKey = [providerName, 'onchain-data', symbol.toUpperCase(), chain || 'default'];

    const service = useMemo(() => {
      if (!isCustomQueryFn) {
        return (
          serviceOrQueryFn as () => {
            getTokenOnChainData: (symbol: string, chain?: Blockchain) => Promise<T | null>;
          }
        )();
      }
      return null;
    }, []);

    const queryFn = isCustomQueryFn
      ? ({ signal }: { signal?: AbortSignal }) =>
          (
            serviceOrQueryFn as (
              symbol: string,
              chain: Blockchain | undefined,
              signal?: AbortSignal
            ) => Promise<T | null>
          )(symbol, chain, signal)
      : () => service!.getTokenOnChainData(symbol, chain);

    const {
      data,
      error,
      isLoading,
      isError,
      refetch: queryRefetch,
    } = useQuery<T | null, Error>({
      queryKey,
      queryFn,
      enabled: enabled && !!symbol,
      ...ON_CHAIN_DATA_QUERY_OPTIONS,
    });

    const refetch = useCallback(async () => {
      await queryRefetch();
    }, [queryRefetch]);

    return {
      data: data ?? null,
      isLoading,
      isError,
      error: error ?? null,
      refetch,
    };
  };
}
