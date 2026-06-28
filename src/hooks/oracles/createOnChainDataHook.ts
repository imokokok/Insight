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

/**
 * Shared react-query wiring for on-chain data hooks: builds the query key,
 * runs the query with the project-wide on-chain options, and wraps refetch in
 * a stable callback. Both factories below delegate to this so the
 * useQuery/return boilerplate lives in exactly one place.
 */
function useOnChainQuery<T>(
  providerName: string,
  symbol: string,
  chain: Blockchain | undefined,
  enabled: boolean,
  queryFn: (context: { signal?: AbortSignal }) => Promise<T | null>
): OnChainDataReturn<T> {
  const queryKey = [providerName, 'onchain-data', symbol.toUpperCase(), chain || 'default'];

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
}

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

    return useOnChainQuery<T>(providerName, symbol, chain, enabled, () =>
      service.getTokenOnChainData(symbol, chain)
    );
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
    return useOnChainQuery<T>(providerName, symbol, chain, enabled, ({ signal }) =>
      customQueryFn(symbol, chain, signal)
    );
  };
}
