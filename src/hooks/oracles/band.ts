'use client';

import { useMemo, useCallback } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import type {
  BandNetworkStats,
  ValidatorInfo,
  CrossChainStats,
} from '@/lib/oracles/bandProtocol';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useLastUpdated } from './useLastUpdated';

const bandClient = new BandProtocolClient();

type BandDataType =
  | 'price'
  | 'historical'
  | 'network'
  | 'validators'
  | 'crossChain';

const getBandKey = (type: BandDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['band', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseBandPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useBandPrice(options: UseBandPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getBandKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => bandClient.getPrice(symbol, chain),
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

interface UseBandHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useBandHistorical(options: UseBandHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getBandKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => bandClient.getHistoricalPrices(symbol, chain, period),
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

export function useBandNetworkStats(enabled = true) {
  const queryKey = getBandKey('network');

  const { data, error, isLoading, refetch } = useQuery<BandNetworkStats, Error>({
    queryKey,
    queryFn: () => bandClient.getNetworkStats(),
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

interface UseBandValidatorsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useBandValidators(options: UseBandValidatorsOptions = {}) {
  const { limit = 20, enabled = true } = options;
  const queryKey = getBandKey('validators', { limit });

  const { data, error, isLoading, refetch } = useQuery<ValidatorInfo[], Error>({
    queryKey,
    queryFn: () => bandClient.getValidators(limit),
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

export function useBandCrossChainStats(enabled = true) {
  const queryKey = getBandKey('crossChain');

  const { data, error, isLoading, refetch } = useQuery<CrossChainStats, Error>({
    queryKey,
    queryFn: () => bandClient.getCrossChainStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    crossChainStats: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseBandProtocolAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useBandProtocolAllData({
  symbol,
  chain,
  enabled = true,
}: UseBandProtocolAllDataOptions) {
  const { lastUpdated, updateLastUpdated } = useLastUpdated();

  const results = useQueries({
    queries: [
      {
        queryKey: getBandKey('price', { symbol, chain }),
        queryFn: async () => {
          const result = await bandClient.getPrice(symbol, chain);
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
        queryKey: getBandKey('historical', { symbol, chain, period: 7 }),
        queryFn: () => bandClient.getHistoricalPrices(symbol, chain, 7),
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getBandKey('network'),
        queryFn: () => bandClient.getNetworkStats(),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getBandKey('validators', { limit: 20 }),
        queryFn: () => bandClient.getValidators(20),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getBandKey('crossChain'),
        queryFn: () => bandClient.getCrossChainStats(),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    ],
  });

  const [priceResult, historicalResult, networkResult, validatorsResult, crossChainResult] =
    results;

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
      crossChainStats: crossChainResult.data,
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
      crossChainResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    ]
  );
}
