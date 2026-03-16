'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { RedStoneClient } from '@/lib/oracles/redstone';
import { PriceData, Blockchain } from '@/types/oracle';

const redstoneClient = new RedStoneClient();

type RedStoneDataType = 'price' | 'historical' | 'network' | 'ecosystem' | 'risk';

const getRedStoneKey = (type: RedStoneDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['redstone', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseRedStonePriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useRedStonePrice(options: UseRedStonePriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getRedStoneKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => redstoneClient.getPrice(symbol, chain),
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

interface UseRedStoneHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useRedStoneHistorical(options: UseRedStoneHistoricalOptions) {
  const { symbol, chain, period = 30, enabled = true } = options;
  const queryKey = getRedStoneKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => redstoneClient.getHistoricalPrices(symbol, chain, period),
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

interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
}

interface EcosystemData {
  integrations: Array<{
    name: string;
    description: string;
  }>;
}

interface RiskMetrics {
  centralizationRisk: number;
  liquidityRisk: number;
  technicalRisk: number;
  overallRisk: number;
}

interface UseRedStoneAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useRedStoneAllData(options: UseRedStoneAllDataOptions) {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useRedStonePrice({ symbol, chain, enabled });
  const historicalQuery = useRedStoneHistorical({ symbol, chain, enabled });

  const networkQuery = useQuery<NetworkStats, Error>({
    queryKey: getRedStoneKey('network', { symbol, chain }),
    queryFn: async () => {
      return {
        activeNodes: 25,
        dataFeeds: 1000,
        nodeUptime: 99.9,
        avgResponseTime: 200,
      };
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const ecosystemQuery = useQuery<EcosystemData, Error>({
    queryKey: getRedStoneKey('ecosystem', { symbol, chain }),
    queryFn: async () => {
      return {
        integrations: [
          { name: 'Arweave', description: 'Permanent data storage' },
          { name: 'Ethereum', description: 'Smart contract platform' },
          { name: 'Avalanche', description: 'High-throughput blockchain' },
        ],
      };
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const riskQuery = useQuery<RiskMetrics, Error>({
    queryKey: getRedStoneKey('risk', { symbol, chain }),
    queryFn: async () => {
      return {
        centralizationRisk: 30,
        liquidityRisk: 25,
        technicalRisk: 20,
        overallRisk: 25,
      };
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const isLoading =
    priceQuery.isLoading ||
    historicalQuery.isLoading ||
    networkQuery.isLoading ||
    ecosystemQuery.isLoading ||
    riskQuery.isLoading;
  const isError =
    priceQuery.error !== null ||
    historicalQuery.error !== null ||
    networkQuery.error !== null ||
    ecosystemQuery.error !== null ||
    riskQuery.error !== null;
  const errors = [
    priceQuery.error,
    historicalQuery.error,
    networkQuery.error,
    ecosystemQuery.error,
    riskQuery.error,
  ].filter(Boolean) as Error[];

  const refetchAll = useCallback(() => {
    priceQuery.refetch();
    historicalQuery.refetch();
    networkQuery.refetch();
    ecosystemQuery.refetch();
    riskQuery.refetch();
  }, [priceQuery, historicalQuery, networkQuery, ecosystemQuery, riskQuery]);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    networkStats: networkQuery.data,
    ecosystem: ecosystemQuery.data,
    riskMetrics: riskQuery.data,
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
