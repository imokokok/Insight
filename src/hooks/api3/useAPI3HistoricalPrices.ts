'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { API3Client } from '@/lib/oracles/api3';
import { PriceData } from '@/types/oracle';
import { Blockchain } from '@/types/oracle';

const api3Client = new API3Client();

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d';

export interface UseAPI3HistoricalPricesOptions {
  symbol: string;
  timeRange?: TimeRange;
  chain?: Blockchain;
  enabled?: boolean;
}

export interface UseAPI3HistoricalPricesReturn {
  data: PriceData[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

const timeRangeToPeriod: Record<TimeRange, number> = {
  '1h': 1,
  '24h': 24,
  '7d': 168,
  '30d': 720,
  '90d': 2160,
};

export function useAPI3HistoricalPrices(
  options: UseAPI3HistoricalPricesOptions
): UseAPI3HistoricalPricesReturn {
  const { symbol, timeRange = '24h', chain, enabled = true } = options;

  const fetcher = useCallback(async (): Promise<PriceData[]> => {
    const period = timeRangeToPeriod[timeRange];
    return api3Client.getHistoricalPrices(symbol, chain, period);
  }, [symbol, chain, timeRange]);

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey: ['api3-historical', symbol, timeRange, chain ?? 'default'],
    queryFn: fetcher,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
