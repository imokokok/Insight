'use client';

import { useQuery } from '@tanstack/react-query';

import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client } from '@/lib/oracles/api3';
import type { PriceData, Blockchain } from '@/types/oracle';

const api3Client = new API3Client();

export interface UseAPI3PriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useAPI3Price(options: UseAPI3PriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = ['api3', 'price', symbol, chain];
  const config = CACHE_CONFIG.api3.price;

  const { data, error, isLoading, refetch, isStale, dataUpdatedAt } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: async () => {
      return api3Client.getPrice(symbol, chain);
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    price: data,
    error,
    isLoading,
    refetch,
    isStale,
    lastUpdated: dataUpdatedAt,
  };
}
