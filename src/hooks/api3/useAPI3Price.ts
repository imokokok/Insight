'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { API3Client } from '@/lib/oracles/api3';
import { PriceData } from '@/lib/types/oracle';
import { Blockchain } from '@/lib/types/oracle';

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

  const key = enabled ? `api3-price-${symbol}-${chain || 'default'}` : null;

  const fetcher = useCallback(async (): Promise<PriceData> => {
    return api3Client.getPrice(symbol, chain);
  }, [symbol, chain]);

  const { data, error, isLoading, mutate } = useSWR<PriceData>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
