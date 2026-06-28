'use client';

import { useMemo, useCallback, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { Blockchain } from '@/types/oracle';

interface OnChainDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface OnChainDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

const ON_CHAIN_DATA_QUERY_OPTIONS = {
  // staleTime: 0 preserves the "always fetch latest on focus/remount" semantics
  // that on-chain price data requires. Trade-off: more requests, but freshest
  // data wins. The 60s polling interval still bounds the steady-state rate.
  staleTime: 0,
  gcTime: 300000,
  refetchInterval: 60000,
  refetchOnWindowFocus: true,
  retry: 2,
};

export function createOnChainDataHookFromService<T>(
  providerName: string,
  createService: () => {
    getTokenOnChainData: (symbol: string, chain?: Blockchain) => Promise<T | null>;
    destroy?: () => void;
  },
  hookOptions?: { ownsService?: boolean }
): (options: OnChainDataOptions) => OnChainDataReturn<T> {
  return function useOnChainData(options: OnChainDataOptions): OnChainDataReturn<T> {
    const { symbol, chain, enabled = true } = options;
    const queryKey = [providerName, 'onchain-data', symbol.toUpperCase(), chain || 'default'];

    const service = useMemo(() => createService(), []);

    // Only destroy the service on unmount when this hook actually owns the
    // instance (i.e. createService returns a fresh `new Client()`). For hooks
    // that return a shared singleton (getDIADataService / getWINkLinkRealDataService),
    // destroying would wipe the global cache and break other consumers — so
    // ownsService defaults to false.
    const ownsService = hookOptions?.ownsService ?? false;

    useEffect(() => {
      if (!ownsService) return;
      return () => {
        service.destroy?.();
      };
    }, [service, ownsService]);

    const queryFn = () => service.getTokenOnChainData(symbol, chain);

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

export function createOnChainDataHookFromQueryFn<T>(
  providerName: string,
  customQueryFn: (
    symbol: string,
    chain: Blockchain | undefined,
    signal?: AbortSignal
  ) => Promise<T | null>
): (options: OnChainDataOptions) => OnChainDataReturn<T> {
  return function useOnChainData(options: OnChainDataOptions): OnChainDataReturn<T> {
    const { symbol, chain, enabled = true } = options;
    const queryKey = [providerName, 'onchain-data', symbol.toUpperCase(), chain || 'default'];

    const queryFn = ({ signal }: { signal?: AbortSignal }) => customQueryFn(symbol, chain, signal);

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
