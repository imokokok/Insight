'use client';

import { useCallback, useMemo } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { RedStoneApiError } from '@/lib/errors';
import {
  type RedStoneClient,
  type RedStoneProviderInfo,
  type RedStoneMetrics,
  type RedStoneNetworkStats,
  type RedStoneEcosystemData,
  type RedStoneRiskMetrics,
  type RedStoneChainInfo,
} from '@/lib/oracles/redstone';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useLastUpdated } from './useLastUpdated';

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

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }

  if (error instanceof RedStoneApiError) {
    return error.retryable;
  }

  return true;
};

const getRetryDelay = (attemptIndex: number, error: unknown): number => {
  const baseDelay = 1000;
  const maxDelay = 10000;

  if (error instanceof RedStoneApiError && error.errorCode === 'RATE_LIMIT_ERROR') {
    return Math.min(baseDelay * Math.pow(2, attemptIndex + 1), maxDelay);
  }

  return Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
};

interface UseRedStonePriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
  client: RedStoneClient;
}

export function useRedStonePrice(options: UseRedStonePriceOptions) {
  const { symbol, chain, enabled = true, client } = options;
  const queryKey = getRedStoneKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => client.getPrice(symbol, chain),
    enabled,
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
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
  client: RedStoneClient;
}

export function useRedStoneHistorical(options: UseRedStoneHistoricalOptions) {
  const { symbol, chain, period = 30, enabled = true, client } = options;
  const queryKey = getRedStoneKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => client.getHistoricalPrices(symbol, chain, period),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
  });

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneProviders(client: RedStoneClient, enabled = true) {
  const queryKey = getRedStoneKey('providers');

  const { data, error, isLoading, refetch } = useQuery<RedStoneProviderInfo[], Error>({
    queryKey,
    queryFn: () => client.getDataProviders(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
  });

  return {
    providers: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneMetrics(client: RedStoneClient, enabled = true) {
  const queryKey = getRedStoneKey('metrics');

  const { data, error, isLoading, refetch } = useQuery<RedStoneMetrics, Error>({
    queryKey,
    queryFn: () => client.getRedStoneMetrics(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
  });

  return {
    metrics: data,
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneSupportedChains(client: RedStoneClient, enabled = true) {
  const queryKey = getRedStoneKey('chains');

  const { data, error, isLoading, refetch } = useQuery<RedStoneChainInfo[], Error>({
    queryKey,
    queryFn: () => client.getSupportedChains(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
  });

  return {
    chains: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneNetworkStats(client: RedStoneClient, enabled = true) {
  const queryKey = getRedStoneKey('network');

  const { data, error, isLoading, refetch } = useQuery<RedStoneNetworkStats, Error>({
    queryKey,
    queryFn: () => client.getNetworkStats(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
  });

  return {
    networkStats: data,
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneEcosystem(client: RedStoneClient, enabled = true) {
  const queryKey = getRedStoneKey('ecosystem');

  const { data, error, isLoading, refetch } = useQuery<RedStoneEcosystemData, Error>({
    queryKey,
    queryFn: () => client.getEcosystemData(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
  });

  return {
    ecosystem: data,
    error,
    isLoading,
    refetch,
  };
}

export function useRedStoneRiskMetrics(client: RedStoneClient, enabled = true) {
  const queryKey = getRedStoneKey('risk');

  const { data, error, isLoading, refetch } = useQuery<RedStoneRiskMetrics, Error>({
    queryKey,
    queryFn: () => client.getRiskMetrics(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
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
  client: RedStoneClient;
}

export function useRedStoneAllData(options: UseRedStoneAllDataOptions) {
  const { symbol, chain, enabled = true, client } = options;
  const { lastUpdated, updateLastUpdated } = useLastUpdated();

  const results = useQueries({
    queries: [
      {
        queryKey: getRedStoneKey('price', { symbol, chain }),
        queryFn: async () => {
          const result = await client.getPrice(symbol, chain);
          updateLastUpdated();
          return result;
        },
        enabled,
        staleTime: 30000,
        gcTime: 60000,
        refetchInterval: 30000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
      {
        queryKey: getRedStoneKey('historical', { symbol, chain, period: 30 }),
        queryFn: () => client.getHistoricalPrices(symbol, chain, 30),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
      {
        queryKey: getRedStoneKey('network', { symbol, chain }),
        queryFn: () => client.getNetworkStats(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
      {
        queryKey: getRedStoneKey('ecosystem', { symbol, chain }),
        queryFn: () => client.getEcosystemData(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
      {
        queryKey: getRedStoneKey('risk', { symbol, chain }),
        queryFn: () => client.getRiskMetrics(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
      {
        queryKey: getRedStoneKey('providers'),
        queryFn: () => client.getDataProviders(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
      {
        queryKey: getRedStoneKey('metrics'),
        queryFn: () => client.getRedStoneMetrics(),
        enabled,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
    ],
  });

  const [
    priceResult,
    historicalResult,
    networkResult,
    ecosystemResult,
    riskResult,
    providersResult,
    metricsResult,
  ] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isFetching = results.some((r) => r.isFetching);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
  }, [results, updateLastUpdated]);

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data ?? [],
      networkStats: networkResult.data,
      ecosystem: ecosystemResult.data,
      riskMetrics: riskResult.data,
      providers: providersResult.data ?? [],
      metrics: metricsResult.data,
      isLoading,
      isFetching,
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
      providersResult.data,
      metricsResult.data,
      isLoading,
      isFetching,
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
