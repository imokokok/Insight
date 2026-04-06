'use client';

import { useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { PythClient } from '@/lib/oracles/pythNetwork';
import { type Blockchain, type PriceData } from '@/types/oracle';

const pythClient = new PythClient();

type PythDataType = 'price' | 'historical';

const getPythKey = (type: PythDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['pyth', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

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

  const isLoading = priceQuery.isLoading || historicalQuery.isLoading;
  const isError = Boolean(priceQuery.error || historicalQuery.error);
  const errors = [priceQuery.error, historicalQuery.error].filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all([priceQuery.refetch(), historicalQuery.refetch()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
