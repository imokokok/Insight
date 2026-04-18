'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { FlareClient, type FlareTokenOnChainData } from '@/lib/oracles/clients/flare';

interface UseFlareOnChainDataOptions {
  symbol: string;
  enabled?: boolean;
}

export interface UseFlareOnChainDataReturn {
  data: FlareTokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string): string[] => {
  return ['flare', 'onchain-data', symbol.toUpperCase()];
};

export function useFlareOnChainData(
  options: UseFlareOnChainDataOptions
): UseFlareOnChainDataReturn {
  const { symbol, enabled = true } = options;
  const flareClient = useMemo(() => new FlareClient(), []);
  const queryKey = getQueryKey(symbol);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<FlareTokenOnChainData | null, Error>({
    queryKey,
    queryFn: () => flareClient.getTokenOnChainData(symbol),
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
