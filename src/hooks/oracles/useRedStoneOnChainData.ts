'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { RedStoneClient, type RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';

interface UseRedStoneOnChainDataOptions {
  symbol: string;
  enabled?: boolean;
}

export interface UseRedStoneOnChainDataReturn {
  data: RedStoneTokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string): string[] => {
  return ['redstone', 'onchain-data', symbol.toUpperCase()];
};

/**
 * Get token on-chain data from RedStone oracle
 * Including 24h change, bid-ask spread, data sources and other price-related data
 */
export function useRedStoneOnChainData(
  options: UseRedStoneOnChainDataOptions
): UseRedStoneOnChainDataReturn {
  const { symbol, enabled = true } = options;
  const redstoneClient = useMemo(() => new RedStoneClient(), []);
  const queryKey = getQueryKey(symbol);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<RedStoneTokenOnChainData | null, Error>({
    queryKey,
    queryFn: () => redstoneClient.getTokenOnChainData(symbol),
    enabled: enabled && !!symbol,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchInterval: 60000, // Auto-refresh every minute
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
