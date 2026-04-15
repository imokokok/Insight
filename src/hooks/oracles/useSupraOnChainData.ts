'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { SupraClient, type SupraTokenOnChainData } from '@/lib/oracles/clients/supra';

export interface UseSupraOnChainDataOptions {
  symbol: string;
  enabled?: boolean;
}

export interface UseSupraOnChainDataReturn {
  data: SupraTokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string): string[] => {
  return ['supra', 'onchain-data', symbol.toUpperCase()];
};

export function useSupraOnChainData(
  options: UseSupraOnChainDataOptions
): UseSupraOnChainDataReturn {
  const { symbol, enabled = true } = options;
  const supraClient = useMemo(() => new SupraClient(), []);
  const queryKey = getQueryKey(symbol);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<SupraTokenOnChainData | null, Error>({
    queryKey,
    queryFn: () => supraClient.getTokenOnChainData(symbol),
    enabled: enabled && !!symbol,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    data: data || null,
    isLoading,
    isError,
    error: error || null,
    refetch,
  };
}
