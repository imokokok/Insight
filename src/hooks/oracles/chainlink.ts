'use client';

import { useCallback, useState, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { ChainlinkClient } from '@/lib/oracles/chainlink';
import { type Blockchain, type PriceData } from '@/types/oracle';

const chainlinkClient = new ChainlinkClient();

type ChainlinkDataType = 'price' | 'historical' | 'network';

const getChainlinkKey = (type: ChainlinkDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['chainlink', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
}

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const priceQuery = useChainlinkPrice({ symbol, chain, enabled });
  const historicalQuery = useChainlinkHistorical({ symbol, chain, enabled });

  const networkQuery = useQuery<NetworkStats, Error>({
    queryKey: getChainlinkKey('network', { symbol, chain }),
    queryFn: async () => {
      return {
        activeNodes: 1847,
        dataFeeds: 1243,
        nodeUptime: 99.9,
        avgResponseTime: 245,
        latency: 120,
      };
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  useEffect(() => {
    if (priceQuery.price && !priceQuery.isLoading) {
      setLastUpdated(new Date());
    }
  }, [priceQuery.price, priceQuery.isLoading]);

  const isLoading = priceQuery.isLoading || historicalQuery.isLoading || networkQuery.isLoading;
  const isError = Boolean(priceQuery.error || historicalQuery.error || networkQuery.error);
  const errors = [priceQuery.error, historicalQuery.error, networkQuery.error].filter(
    Boolean
  ) as Error[];

  const refetchAll = useCallback(() => {
    priceQuery.refetch();
    historicalQuery.refetch();
    networkQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    networkStats: networkQuery.data,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  };
}
