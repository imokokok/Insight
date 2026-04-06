'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';

import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';

import { WINkLinkClient } from '@/lib/oracles';
import { type Blockchain } from '@/types/oracle';

const client = new WINkLinkClient();

export interface DataSourceState<T = unknown> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateLastUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  return { lastUpdated, updateLastUpdated };
}

export function useWINkLinkPrice(symbol: string, chain?: Blockchain, enabled = true) {
  return useQuery({
    queryKey: ['winklink', 'price', symbol, chain],
    queryFn: () => client.getPrice(symbol, chain),
    enabled,
    refetchInterval: 60000,
  });
}

export function useWINkLinkHistoricalPrices(symbol: string, chain?: Blockchain, period = 24, enabled = true) {
  return useQuery({
    queryKey: ['winklink', 'historical', symbol, chain, period],
    queryFn: () => client.getHistoricalPrices(symbol, chain, period),
    enabled,
    refetchInterval: 300000,
  });
}

interface UseWINkLinkAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useWINkLinkAllData({ symbol, chain, enabled = true }: UseWINkLinkAllDataOptions) {
  const { lastUpdated, updateLastUpdated } = useLastUpdated();
  const [dataLastUpdated, setDataLastUpdated] = useState<Record<string, Date | null>>({
    price: null,
    historical: null,
  });

  const updateDataLastUpdated = useCallback((key: string) => {
    setDataLastUpdated((prev) => ({ ...prev, [key]: new Date() }));
  }, []);

  const results = useQueries({
    queries: [
      {
        queryKey: ['winklink', 'price', symbol, chain],
        queryFn: async () => {
          const result = await client.getPrice(symbol, chain);
          updateLastUpdated();
          updateDataLastUpdated('price');
          return result;
        },
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'historical', symbol, chain, 24],
        queryFn: async () => {
          const result = await client.getHistoricalPrices(symbol, chain, 24);
          updateDataLastUpdated('historical');
          return result;
        },
        enabled,
        refetchInterval: 300000,
      },
    ],
  });

  const [priceResult, historicalResult] = results;

  useEffect(() => {
    const errors = results.filter((r) => r.isError && r.error);
    if (errors.length > 0) {
      // Errors are handled by the query error handlers
      errors.forEach((_result, _index) => {
        // Error logging removed to avoid console noise
      });
    }
  }, [results]);

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
  }, [results]);

  const createDataSourceState = <T,>(
    result: UseQueryResult<T, Error>,
    key: string,
    refetchFn: () => Promise<void>
  ): DataSourceState<T> => ({
    data: result.data ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    lastUpdated: dataLastUpdated[key],
    refetch: refetchFn,
  });

  const dataStates = useMemo(
    () => ({
      price: createDataSourceState(priceResult, 'price', async () => {
        await priceResult.refetch();
        updateDataLastUpdated('price');
      }),
      historical: createDataSourceState(historicalResult, 'historical', async () => {
        await historicalResult.refetch();
        updateDataLastUpdated('historical');
      }),
    }),
    [priceResult, historicalResult, dataLastUpdated, updateDataLastUpdated]
  );

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data ?? [],
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
      dataStates,
    }),
    [
      priceResult.data,
      historicalResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
      dataStates,
    ]
  );
}
