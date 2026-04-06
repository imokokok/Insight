'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client } from '@/lib/oracles/api3';
import type { PriceData, Blockchain } from '@/types/oracle';

const api3Client = new API3Client();

export interface UseAPI3HistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useAPI3Historical(options: UseAPI3HistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = ['api3', 'historical', symbol, chain, period];
  const config = CACHE_CONFIG.api3.historical;

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: async () => {
      return api3Client.getHistoricalPrices(symbol, chain, period);
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch,
    lastUpdated: dataUpdatedAt,
  };
}
