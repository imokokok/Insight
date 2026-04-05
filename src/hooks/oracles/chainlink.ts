'use client';

import { useCallback, useMemo } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import type { NetworkStats } from '@/app/[locale]/chainlink/types';
import { ChainlinkClient, type ChainlinkMarketData } from '@/lib/oracles/chainlink';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useLastUpdated } from './useLastUpdated';

const chainlinkClient = new ChainlinkClient({ useRealData: true });

type ChainlinkDataType = 'price' | 'historical' | 'network' | 'market';

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

export function useChainlinkMarketData(symbol: string = 'LINK', enabled: boolean = true) {
  const queryKey = getChainlinkKey('market', { symbol });

  const { data, error, isLoading, refetch } = useQuery<ChainlinkMarketData | null, Error>({
    queryKey,
    queryFn: () => chainlinkClient.getMarketData(symbol),
    enabled,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    marketData: data,
    error,
    isLoading,
    refetch,
  };
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
        queryFn: () => chainlinkClient.getHistoricalPricesFromCoinGecko(symbol, 30),
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
      {
        queryKey: getChainlinkKey('market', { symbol }),
        queryFn: () => chainlinkClient.getMarketData(symbol),
        enabled,
        staleTime: 60000,
        gcTime: 300000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    ],
  });

  const [priceResult, historicalResult, networkResult, marketResult] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => {
    // Convert ChainlinkNetworkStats to NetworkStats
    const chainlinkNetworkStats = networkResult.data;
    const networkStats: NetworkStats | undefined = chainlinkNetworkStats
      ? {
          activeNodes: chainlinkNetworkStats.activeNodes,
          dataFeeds: chainlinkNetworkStats.dataFeeds,
          nodeUptime: chainlinkNetworkStats.nodeUptime,
          avgResponseTime: chainlinkNetworkStats.avgResponseTime,
          latency: chainlinkNetworkStats.latency,
          updateFrequency: chainlinkNetworkStats.updateFrequency,
          activeChains: chainlinkNetworkStats.activeChains,
        }
      : undefined;

    return {
      price: priceResult.data,
      historicalData: historicalResult.data ?? [],
      networkStats,
      marketData: marketResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    };
  }, [
    priceResult.data,
    historicalResult.data,
    networkResult.data,
    marketResult.data,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  ]);
}
