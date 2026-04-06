'use client';

import { useMemo, useCallback } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { UMAClient } from '@/lib/oracles/uma';
import { type Blockchain, type PriceData } from '@/types/oracle';
import type { UMANetworkStats, ValidatorData, DisputeData } from '@/types/oracle/uma';

import { useLastUpdated } from './useLastUpdated';

const umaClient = new UMAClient({ useRealData: true });

type UMADataType = 'price' | 'historical' | 'network' | 'validators' | 'disputes';

const getUMAKey = (type: UMADataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['uma', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseUMAPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useUMAPrice(options: UseUMAPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getUMAKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => umaClient.getPrice(symbol, chain),
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

interface UseUMAHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useUMAHistorical(options: UseUMAHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getUMAKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => umaClient.getHistoricalPrices(symbol, chain, period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
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

export function useUMANetworkStats(enabled = true) {
  const queryKey = getUMAKey('network');

  const { data, error, isLoading, refetch } = useQuery<UMANetworkStats, Error>({
    queryKey,
    queryFn: () => umaClient.getNetworkStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
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

export function useUMAValidators(enabled = true) {
  const queryKey = getUMAKey('validators');

  const { data, error, isLoading, refetch } = useQuery<ValidatorData[], Error>({
    queryKey,
    queryFn: () => umaClient.getValidators(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    validators: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useUMADisputes(enabled = true) {
  const queryKey = getUMAKey('disputes');

  const { data, error, isLoading, refetch } = useQuery<DisputeData[], Error>({
    queryKey,
    queryFn: () => umaClient.getDisputes(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    disputes: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseUMAAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useUMAAllData({ symbol, chain, enabled = true }: UseUMAAllDataOptions) {
  const { lastUpdated, updateLastUpdated } = useLastUpdated();

  const results = useQueries({
    queries: [
      {
        queryKey: getUMAKey('price', { symbol, chain }),
        queryFn: async () => {
          const result = await umaClient.getPrice(symbol, chain);
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
        queryKey: getUMAKey('historical', { symbol, chain, period: 7 }),
        queryFn: () => umaClient.getHistoricalPrices(symbol, chain, 7),
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getUMAKey('network'),
        queryFn: () => umaClient.getNetworkStats(),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getUMAKey('validators'),
        queryFn: () => umaClient.getValidators(),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getUMAKey('disputes'),
        queryFn: () => umaClient.getDisputes(),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    ],
  });

  const [priceResult, historicalResult, networkResult, validatorsResult, disputesResult] = results;

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
      validators: validatorsResult.data ?? [],
      disputes: disputesResult.data ?? [],
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
      validatorsResult.data,
      disputesResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    ]
  );
}
