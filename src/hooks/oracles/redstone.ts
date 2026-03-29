'use client';

import { useCallback, useMemo } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import {
  RedStoneClient,
  type RedStoneProviderInfo,
  type RedStoneMetrics,
  type RedStoneNetworkStats,
  type RedStoneEcosystemData,
  type RedStoneRiskMetrics,
  type RedStoneChainInfo,
} from '@/lib/oracles/redstone';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useLastUpdated } from './useLastUpdated';

const redstoneClient = new RedStoneClient();

type RedStoneDataType =
  | 'price'
  | 'historical'
  | 'network'
  | 'ecosystem'
  | 'risk'
  | 'providers'
  | 'metrics'
  | 'chains';

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

export function useRedStoneProviders(enabled = true) {
  const queryKey = getRedStoneKey('providers');

  const { data, error, isLoading, refetch } = useQuery<RedStoneProviderInfo[], Error>({
    queryKey,
    queryFn: () => redstoneClient.getDataProviders(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    providers: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneMetrics(enabled = true) {
  const queryKey = getRedStoneKey('metrics');

  const { data, error, isLoading, refetch } = useQuery<RedStoneMetrics, Error>({
    queryKey,
    queryFn: () => redstoneClient.getRedStoneMetrics(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    metrics: data,
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneSupportedChains(enabled = true) {
  const queryKey = getRedStoneKey('chains');

  const { data, error, isLoading, refetch } = useQuery<RedStoneChainInfo[], Error>({
    queryKey,
    queryFn: () => redstoneClient.getSupportedChains(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    chains: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneNetworkStats(enabled = true) {
  const queryKey = getRedStoneKey('network');

  const { data, error, isLoading, refetch } = useQuery<RedStoneNetworkStats, Error>({
    queryKey,
    queryFn: () => redstoneClient.getNetworkStats(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    networkStats: data,
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneEcosystem(enabled = true) {
  const queryKey = getRedStoneKey('ecosystem');

  const { data, error, isLoading, refetch } = useQuery<RedStoneEcosystemData, Error>({
    queryKey,
    queryFn: () => redstoneClient.getEcosystemData(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    ecosystem: data,
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneRiskMetrics(enabled = true) {
  const queryKey = getRedStoneKey('risk');

  const { data, error, isLoading, refetch } = useQuery<RedStoneRiskMetrics, Error>({
    queryKey,
    queryFn: () => redstoneClient.getRiskMetrics(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    riskMetrics: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseRedStoneAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useRedStoneAllData(options: UseRedStoneAllDataOptions) {
  const { symbol, chain, enabled = true } = options;
  const { lastUpdated, updateLastUpdated } = useLastUpdated();

  const results = useQueries({
    queries: [
      {
        queryKey: getRedStoneKey('price', { symbol, chain }),
        queryFn: async () => {
          const result = await redstoneClient.getPrice(symbol, chain);
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
        queryKey: getRedStoneKey('historical', { symbol, chain, period: 30 }),
        queryFn: () => redstoneClient.getHistoricalPrices(symbol, chain, 30),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getRedStoneKey('network', { symbol, chain }),
        queryFn: () => redstoneClient.getNetworkStats(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getRedStoneKey('ecosystem', { symbol, chain }),
        queryFn: () => redstoneClient.getEcosystemData(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getRedStoneKey('risk', { symbol, chain }),
        queryFn: () => redstoneClient.getRiskMetrics(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    ],
  });

  const [priceResult, historicalResult, networkResult, ecosystemResult, riskResult] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
  }, []);

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data ?? [],
      networkStats: networkResult.data,
      ecosystem: ecosystemResult.data,
      riskMetrics: riskResult.data,
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
      ecosystemResult.data,
      riskResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    ]
  );
}

export type {
  RedStoneProviderInfo,
  RedStoneMetrics,
  RedStoneNetworkStats,
  RedStoneEcosystemData,
  RedStoneRiskMetrics,
  RedStoneChainInfo,
};
