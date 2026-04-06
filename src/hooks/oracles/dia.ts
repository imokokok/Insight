'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { DIAClient } from '@/lib/oracles/dia';
import { type Blockchain, type PriceData } from '@/types/oracle';

type DIADataType = 'price' | 'historical';

const getDIAKey = (type: DIADataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['dia', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseDIAPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useDIAPrice(options: UseDIAPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const diaClient = useMemo(() => new DIAClient(), []);
  const queryKey = getDIAKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => diaClient.getPrice(symbol, chain),
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

interface UseDIAHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useDIAHistorical(options: UseDIAHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const diaClient = useMemo(() => new DIAClient(), []);
  const queryKey = getDIAKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => diaClient.getHistoricalPrices(symbol, chain, period),
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

interface UseDIAAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseDIAAllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
}

export function useDIAAllData(options: UseDIAAllDataOptions): UseDIAAllDataReturn {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useDIAPrice({ symbol, chain, enabled });
  const historicalQuery = useDIAHistorical({ symbol, chain, period: 7, enabled });

  const isLoading = useMemo(() => {
    if (!enabled) return false;
    return priceQuery.isLoading || historicalQuery.isLoading;
  }, [enabled, priceQuery.isLoading, historicalQuery.isLoading]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    if (priceQuery.error) errs.push(priceQuery.error);
    if (historicalQuery.error) errs.push(historicalQuery.error);
    return errs;
  }, [priceQuery.error, historicalQuery.error]);

  const isError = errors.length > 0;

  const refetchAll = useCallback(async () => {
    await Promise.all([priceQuery.refetch(), historicalQuery.refetch()]);
  }, [priceQuery.refetch, historicalQuery.refetch]);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
