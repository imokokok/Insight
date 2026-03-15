'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { PythClient } from '@/lib/oracles/pythNetwork';
import { PriceData, Blockchain } from '@/types/oracle';

const pythClient = new PythClient();

type PythDataType = 'price' | 'historical' | 'network' | 'publishers';

const getPythKey = (type: PythDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['pyth', type];
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
  updateFrequency: number;
}

interface PublisherData {
  id: string;
  name: string;
  stake: number;
  accuracy: number;
}

interface UsePythPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function usePythPrice(options: UsePythPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getPythKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => pythClient.getPrice(symbol, chain),
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

interface UsePythHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function usePythHistorical(options: UsePythHistoricalOptions) {
  const { symbol, chain, period = 30, enabled = true } = options;
  const queryKey = getPythKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => pythClient.getHistoricalPrices(symbol, chain, period),
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

interface UsePythAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function usePythAllData(options: UsePythAllDataOptions) {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = usePythPrice({ symbol, chain, enabled });
  const historicalQuery = usePythHistorical({ symbol, chain, enabled });

  const networkQuery = useQuery<NetworkStats, Error>({
    queryKey: getPythKey('network', { symbol, chain }),
    queryFn: async () => {
      return {
        activeNodes: 100,
        dataFeeds: 500,
        nodeUptime: 99.9,
        avgResponseTime: 100,
        updateFrequency: 1,
      };
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const publishersQuery = useQuery<PublisherData[], Error>({
    queryKey: getPythKey('publishers', { symbol, chain }),
    queryFn: async () => {
      return [
        { id: '1', name: 'Publisher A', stake: 1000000, accuracy: 98 },
        { id: '2', name: 'Publisher B', stake: 800000, accuracy: 97 },
        { id: '3', name: 'Publisher C', stake: 600000, accuracy: 96 },
      ];
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const isLoading = priceQuery.isLoading || historicalQuery.isLoading || networkQuery.isLoading || publishersQuery.isLoading;
  const isError = priceQuery.error !== null || historicalQuery.error !== null || networkQuery.error !== null || publishersQuery.error !== null;
  const errors = [priceQuery.error, historicalQuery.error, networkQuery.error, publishersQuery.error].filter(Boolean) as Error[];

  const refetchAll = useCallback(() => {
    priceQuery.refetch();
    historicalQuery.refetch();
    networkQuery.refetch();
    publishersQuery.refetch();
  }, [priceQuery, historicalQuery, networkQuery, publishersQuery]);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    networkStats: networkQuery.data,
    publishers: publishersQuery.data ?? [],
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
