'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { API3Client } from '@/lib/oracles/api3';
import { Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const api3Client = new API3Client();

export interface UseAPI3PriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseAPI3PriceReturn {
  data: PriceData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useAPI3Price(options: UseAPI3PriceOptions): UseAPI3PriceReturn {
  const { symbol, chain, enabled = true, refreshInterval = 10000 } = options;

  const fetcher = useCallback(async (): Promise<PriceData> => {
    return api3Client.getPrice(symbol, chain);
  }, [symbol, chain]);

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey: ['api3-price', symbol, chain ?? 'default'],
    queryFn: fetcher,
    enabled,
    staleTime: refreshInterval,
    gcTime: refreshInterval * 2,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    data,
    isLoading,
    error: error ?? undefined,
    refetch: async () => {
      await refetch();
    },
  };
}
