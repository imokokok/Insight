'use client';

import { useMemo } from 'react';

import { useQueries, type UseQueryResult } from '@tanstack/react-query';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { priceKeys } from '@/lib/queryKeys';
import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';

export interface BatchQueryTask {
  provider: OracleProvider;
  symbol: string;
  chain: Blockchain;
  isCompare: boolean;
}

interface BatchQueryResultItem {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData | null;
  isCompare: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  dataUpdatedAt: number;
}

export function useBatchOracleQuery(
  tasks: BatchQueryTask[],
  enabled = true,
  refetchInterval: number | false = false
) {
  const queryConfigs = useMemo(() => {
    if (!enabled || tasks.length === 0) return [];

    return tasks.map((task) => ({
      queryKey: priceKeys.byProvider(task.provider, task.symbol, task.chain),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        oracleApiClient.fetchPrice({
          provider: task.provider,
          symbol: task.symbol,
          chain: task.chain,
          signal,
          forceRefresh: true,
        }),
      staleTime: 0,
      enabled: !!task.provider && !!task.symbol,
      refetchInterval,
      refetchIntervalInBackground: false,
      retry: 1,
      retryDelay: 1000,
    }));
  }, [tasks, enabled, refetchInterval]);

  const queryResults = useQueries({ queries: queryConfigs });

  const results: BatchQueryResultItem[] = useMemo(() => {
    if (tasks.length === 0) return [];

    return tasks.map((task, i) => {
      const priceResult = queryResults[i] as UseQueryResult<PriceData, Error> | undefined;

      return {
        provider: task.provider,
        chain: task.chain,
        priceData: priceResult?.data ?? null,
        isCompare: task.isCompare,
        isLoading: priceResult?.isLoading ?? false,
        isFetching: priceResult?.isFetching ?? false,
        error: priceResult?.error || null,
        dataUpdatedAt: priceResult?.dataUpdatedAt ?? 0,
      };
    });
  }, [tasks, queryResults]);

  const isLoading = tasks.length > 0 && results.some((r) => r.isLoading);
  const isFetching = tasks.length > 0 && results.some((r) => r.isFetching);
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
