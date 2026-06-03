'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { getDefaultFactory } from '@/lib/oracles';
import { priceKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

import { type QueryResult } from '../constants';
import { buildQueryTasks, type QueryError } from '../utils/queryTaskUtils';

import { useBatchOracleQuery, type BatchQueryTask } from './usePriceQueries';

const logger = createLogger('usePriceQueryData');

export type { QueryError };

interface UsePriceQueryDataParams {
  urlParamsParsed: boolean;
  selectedOracle: OracleProvider | null;
  selectedChain: Blockchain | null;
  selectedSymbol: string;
  isCompareMode: boolean;
  refetchInterval?: number | false;
}

interface UsePriceQueryDataReturn {
  queryResults: QueryResult[];
  isLoading: boolean;
  isFetching: boolean;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  queryErrors: QueryError[];
  clearErrors: () => void;
  retryDataSource: (provider: OracleProvider, chain: Blockchain) => Promise<void>;
  retryAllErrors: () => Promise<void>;
  refetch: () => Promise<void>;
  compareQueryResults: QueryResult[];
  primaryDataFetchTime: Date | null;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  needsChainSelection: boolean;
}

export function usePriceQueryData(params: UsePriceQueryDataParams): UsePriceQueryDataReturn {
  const {
    urlParamsParsed,
    selectedOracle,
    selectedChain,
    selectedSymbol,
    isCompareMode,
    refetchInterval = false,
  } = params;

  const queryClient = useQueryClient();
  const [dismissedErrorKeys, setDismissedErrorKeys] = useState<Set<string>>(new Set());
  const [dismissedSignature, setDismissedSignature] = useState('');
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const queryStartTimeRef = useRef<number | null>(null);

  const selectionSignature = `${selectedOracle ?? ''}-${selectedChain ?? ''}-${selectedSymbol}`;

  const effectiveDismissedKeys = useMemo(
    () => (dismissedSignature === selectionSignature ? dismissedErrorKeys : new Set<string>()),
    [dismissedSignature, selectionSignature, dismissedErrorKeys]
  );

  const { primaryTasks, compareTasks, needsChainSelection } = useMemo(
    () =>
      buildQueryTasks(
        selectedOracle,
        selectedChain,
        selectedSymbol,
        isCompareMode,
        getDefaultFactory()
      ),
    [selectedOracle, selectedChain, selectedSymbol, isCompareMode]
  );

  const batchTasks: BatchQueryTask[] = useMemo(
    () => [
      ...primaryTasks.map((t) => ({
        provider: t.provider,
        symbol: selectedSymbol,
        chain: t.chain,
        isCompare: false,
      })),
      ...compareTasks.map((t) => ({
        provider: t.provider,
        symbol: selectedSymbol,
        chain: t.chain,
        isCompare: true,
      })),
    ],
    [primaryTasks, compareTasks, selectedSymbol]
  );

  const batchResult = useBatchOracleQuery(
    batchTasks,
    urlParamsParsed && !!selectedSymbol,
    refetchInterval
  );

  const isLoading = batchResult.isLoading;
  const isFetching = batchResult.isFetching;

  useEffect(() => {
    if (isLoading && queryStartTimeRef.current === null) {
      queryStartTimeRef.current = Date.now();
    }
    if (!isLoading && queryStartTimeRef.current !== null) {
      const duration = Date.now() - queryStartTimeRef.current;
      queryStartTimeRef.current = null;
      setQueryDuration(duration);
    }
  }, [isLoading]);

  const { queryResults, compareQueryResults } = useMemo(() => {
    const qResults: QueryResult[] = [];
    const cResults: QueryResult[] = [];

    for (const result of batchResult.results) {
      if (!result.priceData) continue;
      if (result.isCompare) {
        cResults.push({
          provider: result.provider,
          chain: result.chain,
          priceData: result.priceData,
        });
      } else {
        qResults.push({
          provider: result.provider,
          chain: result.chain,
          priceData: result.priceData,
        });
      }
    }

    return {
      queryResults: qResults,
      compareQueryResults: cResults,
    };
  }, [batchResult.results]);

  const queryErrors: QueryError[] = useMemo(() => {
    return batchResult.errors
      .filter((e) => !effectiveDismissedKeys.has(`${e.provider}-${e.chain}`))
      .map((e) => ({
        provider: e.provider,
        chain: e.chain,
        error: e.error?.message ?? 'Unknown error',
      }));
  }, [batchResult.errors, effectiveDismissedKeys]);

  const currentQueryTarget = useMemo(() => {
    const fetching = batchResult.results.find((r) => r.isFetching);
    if (fetching) return { oracle: fetching.provider, chain: fetching.chain };
    return { oracle: null as OracleProvider | null, chain: null as Blockchain | null };
  }, [batchResult.results]);

  const primaryDataFetchTime = useMemo(() => {
    const primary = batchResult.results.filter((r) => !r.isCompare && r.priceData);
    if (primary.length === 0) return null;
    const maxTime = Math.max(...primary.map((r) => r.dataUpdatedAt));
    return maxTime > 0 ? new Date(maxTime) : null;
  }, [batchResult.results]);

  const supportedChainsBySelectedOracles = useMemo(() => {
    if (!selectedOracle) return new Set<Blockchain>();
    try {
      const supported = new Set<Blockchain>();
      const client = getDefaultFactory().getClient(selectedOracle);
      client.supportedChains.forEach((chain) => supported.add(chain));
      return supported;
    } catch (error) {
      logger.warn('Failed to get supported chains for oracle', {
        selectedOracle,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Set<Blockchain>();
    }
  }, [selectedOracle]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: priceKeys.bySymbol(selectedSymbol) });
  }, [queryClient, selectedSymbol]);

  const retryDataSource = useCallback(
    async (provider: OracleProvider, chain: Blockchain) => {
      setDismissedErrorKeys((prev) => {
        const next = new Set(prev);
        next.delete(`${provider}-${chain}`);
        return next;
      });
      setDismissedSignature(selectionSignature);

      await queryClient.refetchQueries({
        queryKey: priceKeys.byProvider(provider, selectedSymbol, chain),
      });
    },
    [queryClient, selectedSymbol, selectionSignature]
  );

  const retryAllErrors = useCallback(async () => {
    await Promise.allSettled(
      queryErrors.map((error) => retryDataSource(error.provider, error.chain))
    );
  }, [queryErrors, retryDataSource]);

  const clearErrors = useCallback(() => {
    const keys = batchResult.errors.map((e) => `${e.provider}-${e.chain}`);
    setDismissedErrorKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => next.add(key));
      return next;
    });
    setDismissedSignature(selectionSignature);
  }, [batchResult.errors, selectionSignature]);

  return {
    queryResults,
    isLoading,
    isFetching,
    queryDuration,
    queryProgress: batchResult.queryProgress,
    currentQueryTarget,
    queryErrors,
    clearErrors,
    retryDataSource,
    retryAllErrors,
    refetch,
    compareQueryResults,
    primaryDataFetchTime,
    supportedChainsBySelectedOracles,
    needsChainSelection: !!needsChainSelection,
  };
}
