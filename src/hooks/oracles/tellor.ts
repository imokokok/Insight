'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getTellorClient } from '@/lib/oracles/tellorClientSingleton';
import { type Blockchain, type PriceData } from '@/types/oracle';

const tellorClient = getTellorClient();

type TellorDataType = 'price' | 'historical';

const getTellorKey = (type: TellorDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['tellor', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseTellorPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useTellorPrice(options: UseTellorPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getTellorKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => tellorClient.getPrice(symbol, chain),
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

interface UseTellorHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useTellorHistorical(options: UseTellorHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getTellorKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => tellorClient.getHistoricalPrices(symbol, chain, period),
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

interface UseTellorAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseTellorAllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
}

export function useTellorAllData(options: UseTellorAllDataOptions): UseTellorAllDataReturn {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useTellorPrice({ symbol, chain, enabled });
  const historicalQuery = useTellorHistorical({ symbol, chain, period: 7, enabled });

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
