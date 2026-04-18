'use client';

import { useMemo } from 'react';

import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { priceKeys } from '@/lib/queryKeys';
import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';

interface UseOraclePriceQueryParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
}

export function useOraclePriceQuery({ provider, symbol, chain }: UseOraclePriceQueryParams) {
  return useQuery<PriceData, Error>({
    queryKey: priceKeys.byProvider(provider, symbol, chain ?? ''),
    queryFn: ({ signal }) => oracleApiClient.fetchPrice({ provider, symbol, chain, signal }),
    staleTime: 30_000,
    enabled: !!provider && !!symbol,
  });
}

interface UseOracleHistoricalQueryParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  period: number;
}

export function useOracleHistoricalQuery({
  provider,
  symbol,
  chain,
  period,
}: UseOracleHistoricalQueryParams) {
  return useQuery<PriceData[], Error>({
    queryKey: priceKeys.historical(provider, symbol, chain ?? '', String(period)),
    queryFn: ({ signal }) =>
      oracleApiClient.fetchHistorical({ provider, symbol, chain, period, signal }),
    staleTime: 60_000,
    enabled: !!provider && !!symbol && !!period,
  });
}

export interface BatchQueryTask {
  provider: OracleProvider;
  symbol: string;
  chain: Blockchain;
  period: number;
  isCompare: boolean;
}

export interface BatchQueryResultItem {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData | null;
  history: PriceData[];
  isCompare: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  dataUpdatedAt: number;
}

export function useBatchOracleQuery(tasks: BatchQueryTask[], enabled = true) {
  const queryConfigs = useMemo(() => {
    if (!enabled || tasks.length === 0) return [];

    return tasks.flatMap((task) => [
      {
        queryKey: priceKeys.byProvider(task.provider, task.symbol, task.chain),
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          oracleApiClient.fetchPrice({
            provider: task.provider,
            symbol: task.symbol,
            chain: task.chain,
            signal,
          }),
        staleTime: 30_000,
        enabled: !!task.provider && !!task.symbol,
      },
      {
        queryKey: priceKeys.historical(task.provider, task.symbol, task.chain, String(task.period)),
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          oracleApiClient.fetchHistorical({
            provider: task.provider,
            symbol: task.symbol,
            chain: task.chain,
            period: task.period,
            signal,
          }),
        staleTime: 60_000,
        enabled: !!task.provider && !!task.symbol && !!task.period,
      },
    ]);
  }, [tasks, enabled]);

  const queryResults = useQueries({ queries: queryConfigs });

  const results: BatchQueryResultItem[] = useMemo(() => {
    if (tasks.length === 0) return [];

    return tasks.map((task, i) => {
      const priceResult = queryResults[i * 2] as UseQueryResult<PriceData, Error> | undefined;
      const historicalResult = queryResults[i * 2 + 1] as
        | UseQueryResult<PriceData[], Error>
        | undefined;

      return {
        provider: task.provider,
        chain: task.chain,
        priceData: priceResult?.data ?? null,
        history: historicalResult?.data ?? [],
        isCompare: task.isCompare,
        isLoading: (priceResult?.isLoading ?? false) || (historicalResult?.isLoading ?? false),
        isFetching: (priceResult?.isFetching ?? false) || (historicalResult?.isFetching ?? false),
        error: priceResult?.error || historicalResult?.error || null,
        dataUpdatedAt: Math.max(
          priceResult?.dataUpdatedAt ?? 0,
          historicalResult?.dataUpdatedAt ?? 0
        ),
      };
    });
  }, [tasks, queryResults]);

  const isLoading = results.length > 0 && results.some((r) => r.isLoading);
  const isFetching = results.length > 0 && results.some((r) => r.isFetching);
  const errors = results.filter((r) => r.error !== null);
  const completedCount = results.filter((r) => !r.isFetching).length;

  return {
    results,
    isLoading,
    isFetching,
    errors,
    queryProgress: { completed: completedCount, total: tasks.length },
  };
}
