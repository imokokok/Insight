'use client';

import { useCallback, useMemo } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { ChainlinkClient } from '@/lib/oracles/chainlink';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useLastUpdated } from './useLastUpdated';

const chainlinkClient = new ChainlinkClient({ useRealData: true });

type ChainlinkDataType = 'price' | 'historical' | 'network';

const getChainlinkKey = (type: ChainlinkDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['chainlink', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseChainlinkPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useChainlinkPrice(options: UseChainlinkPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getChainlinkKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => chainlinkClient.getPrice(symbol, chain),
    enabled,
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    price: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseChainlinkHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useChainlinkHistorical(options: UseChainlinkHistoricalOptions) {
  const { symbol, chain, period = 30, enabled = true } = options;
  const queryKey = getChainlinkKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => chainlinkClient.getHistoricalPrices(symbol, chain, period),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseChainlinkAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useChainlinkAllData(options: UseChainlinkAllDataOptions) {
  const { symbol, chain, enabled = true } = options;
  const { lastUpdated, updateLastUpdated } = useLastUpdated();

  const results = useQueries({
    queries: [
      {
        queryKey: getChainlinkKey('price', { symbol, chain }),
        queryFn: async () => {
          const result = await chainlinkClient.getPrice(symbol, chain);
          updateLastUpdated();
          return result;
        },
        enabled,
        staleTime: 30000,
        gcTime: 60000,
        refetchInterval: 30000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getChainlinkKey('historical', { symbol, chain, period: 30 }),
        queryFn: () => chainlinkClient.getHistoricalPrices(symbol, chain, 30),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getChainlinkKey('network', { symbol, chain }),
        queryFn: () => chainlinkClient.getNetworkStats(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    ],
  });

  const [priceResult, historicalResult, networkResult] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data ?? [],
      networkStats: networkResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    }),
    [
      priceResult.data,
      historicalResult.data,
      networkResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    ]
  );
}
