'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { getDefaultFactory } from '@/lib/oracles';
import { priceKeys } from '@/lib/queryKeys';
import { performanceMetricsCalculator } from '@/lib/services/marketData';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { type QueryResult } from '../constants';
import { usePerformanceMonitoring } from '../utils/performanceMonitoring';
import {
  validatePrice,
  validateTimestamp,
  validateTimeSeries,
  type AnomalyInfo,
} from '../utils/priceValidator';
import { buildQueryTasks, type QueryError } from '../utils/queryTaskUtils';

import { useBatchOracleQuery, type BatchQueryTask } from './usePriceQueries';

export type { QueryError };

interface UsePriceQueryDataParams {
  urlParamsParsed: boolean;
  selectedOracle: OracleProvider | null;
  selectedChain: Blockchain | null;
  selectedSymbol: string;
  selectedTimeRange: number;
  isCompareMode: boolean;
  compareTimeRange: number;
  refetchInterval?: number | false;
}

interface UsePriceQueryDataReturn {
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
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
  compareHistoricalData: Partial<Record<string, PriceData[]>>;
  compareQueryResults: QueryResult[];
  primaryDataFetchTime: Date | null;
  compareDataFetchTime: Date | null;
  validationWarnings: string[];
  dataAnomalies: AnomalyInfo[];
  hasDataQualityIssues: boolean;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  performanceMetrics: {
    queryResponseTime: number | null;
    dataProcessingTime: number | null;
    validationTime: number | null;
  };
}

export function usePriceQueryData(params: UsePriceQueryDataParams): UsePriceQueryDataReturn {
  const {
    urlParamsParsed,
    selectedOracle,
    selectedChain,
    selectedSymbol,
    selectedTimeRange,
    isCompareMode,
    compareTimeRange,
    refetchInterval = false,
  } = params;

  const queryClient = useQueryClient();
  const [dismissedErrorKeys, setDismissedErrorKeys] = useState<Set<string>>(new Set());
  const [dismissedSignature, setDismissedSignature] = useState('');
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const queryStartTimeRef = useRef<number | null>(null);
  const metricsCollectedRef = useRef(false);

  const { startQueryMeasure, endQueryMeasure } = usePerformanceMonitoring();

  const selectionSignature = JSON.stringify({
    selectedOracle,
    selectedChain,
    selectedSymbol,
    selectedTimeRange,
  });

  const effectiveDismissedKeys = useMemo(
    () => (dismissedSignature === selectionSignature ? dismissedErrorKeys : new Set<string>()),
    [dismissedSignature, selectionSignature, dismissedErrorKeys]
  );

  const { primaryTasks, compareTasks } = useMemo(
    () =>
      buildQueryTasks(
        selectedOracle,
        selectedChain,
        selectedSymbol,
        selectedTimeRange,
        isCompareMode,
        compareTimeRange,
        getDefaultFactory()
      ),
    [
      selectedOracle,
      selectedChain,
      selectedSymbol,
      selectedTimeRange,
      isCompareMode,
      compareTimeRange,
    ]
  );

  const batchTasks: BatchQueryTask[] = useMemo(
    () => [
      ...primaryTasks.map((t) => ({
        provider: t.provider,
        symbol: selectedSymbol,
        chain: t.chain,
        period: t.timeRange,
        isCompare: false,
      })),
      ...compareTasks.map((t) => ({
        provider: t.provider,
        symbol: selectedSymbol,
        chain: t.chain,
        period: t.timeRange,
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

  const isLoading = batchResult.isLoading || batchResult.isFetching;
  const isFetching = batchResult.isFetching;

  useEffect(() => {
    if (isLoading && queryStartTimeRef.current === null) {
      queryStartTimeRef.current = Date.now();
      startQueryMeasure();
    }
    if (!isLoading && queryStartTimeRef.current !== null) {
      const duration = Date.now() - queryStartTimeRef.current;
      queryStartTimeRef.current = null;
      setQueryDuration(duration);
      endQueryMeasure();
    }
  }, [isLoading, startQueryMeasure, endQueryMeasure]);

  useEffect(() => {
    if (isLoading) {
      metricsCollectedRef.current = false;
      return;
    }
    if (metricsCollectedRef.current || batchResult.results.length === 0) return;
    metricsCollectedRef.current = true;

    for (const result of batchResult.results) {
      if (!result.priceData) continue;
      performanceMetricsCalculator.addPriceData({
        oracle: result.provider,
        asset: selectedSymbol,
        price: result.priceData.price,
        timestamp: Date.now(),
        confidence: result.priceData.confidence,
      });
      if (result.history.length > 0) {
        for (const dp of result.history) {
          performanceMetricsCalculator.addPriceData({
            oracle: result.provider,
            asset: selectedSymbol,
            price: dp.price,
            timestamp: new Date(dp.timestamp).getTime(),
            confidence: dp.confidence,
          });
        }
      }
    }
  }, [isLoading, batchResult.results, selectedSymbol]);

  const { queryResults, historicalData, compareQueryResults, compareHistoricalData } =
    useMemo(() => {
      const qResults: QueryResult[] = [];
      const hData: Partial<Record<string, PriceData[]>> = {};
      const cResults: QueryResult[] = [];
      const cData: Partial<Record<string, PriceData[]>> = {};

      for (const result of batchResult.results) {
        if (!result.priceData) continue;
        const key = `${result.provider}-${result.chain}`;
        if (result.isCompare) {
          cResults.push({
            provider: result.provider,
            chain: result.chain,
            priceData: result.priceData,
          });
          if (result.history.length > 0) cData[key] = result.history;
        } else {
          qResults.push({
            provider: result.provider,
            chain: result.chain,
            priceData: result.priceData,
          });
          if (result.history.length > 0) hData[key] = result.history;
        }
      }

      return {
        queryResults: qResults,
        historicalData: hData,
        compareQueryResults: cResults,
        compareHistoricalData: cData,
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

  const { validationWarnings, dataAnomalies } = useMemo(() => {
    const allWarnings: string[] = [];
    const allAnomalies: AnomalyInfo[] = [];

    for (const result of queryResults) {
      if (!result.priceData) continue;
      const priceValidation = validatePrice(result.priceData.price);
      const timestampValidation = validateTimestamp(result.priceData.timestamp);
      allWarnings.push(...priceValidation.warnings, ...timestampValidation.warnings);
      allAnomalies.push(...priceValidation.anomalies, ...timestampValidation.anomalies);
    }

    for (const [key, history] of Object.entries(historicalData)) {
      if (history && history.length > 0) {
        const seriesValidation = validateTimeSeries(history);
        allWarnings.push(...seriesValidation.warnings.map((w) => `[${key}] ${w}`));
        allAnomalies.push(...seriesValidation.anomalies);
      }
    }

    return { validationWarnings: allWarnings, dataAnomalies: allAnomalies };
  }, [queryResults, historicalData]);

  const primaryDataFetchTime = useMemo(() => {
    const primary = batchResult.results.filter((r) => !r.isCompare && r.priceData);
    if (primary.length === 0) return null;
    const maxTime = Math.max(...primary.map((r) => r.dataUpdatedAt));
    return maxTime > 0 ? new Date(maxTime) : null;
  }, [batchResult.results]);

  const compareDataFetchTime = useMemo(() => {
    const compare = batchResult.results.filter((r) => r.isCompare && r.priceData);
    if (compare.length === 0) return null;
    const maxTime = Math.max(...compare.map((r) => r.dataUpdatedAt));
    return maxTime > 0 ? new Date(maxTime) : null;
  }, [batchResult.results]);

  const supportedChainsBySelectedOracles = useMemo(() => {
    if (!selectedOracle) return new Set<Blockchain>();
    try {
      const supported = new Set<Blockchain>();
      const client = getDefaultFactory().getClient(selectedOracle);
      client.supportedChains.forEach((chain) => supported.add(chain));
      return supported;
    } catch {
      return new Set<Blockchain>();
    }
  }, [selectedOracle]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: priceKeys.all });
  }, [queryClient]);

  const retryDataSource = useCallback(
    async (provider: OracleProvider, chain: Blockchain) => {
      setDismissedErrorKeys((prev) => {
        const next = new Set(prev);
        next.delete(`${provider}-${chain}`);
        return next;
      });
      setDismissedSignature(selectionSignature);

      await Promise.all([
        queryClient.refetchQueries({
          queryKey: priceKeys.byProvider(provider, selectedSymbol, chain),
        }),
        queryClient.refetchQueries({
          queryKey: priceKeys.historical(
            provider,
            selectedSymbol,
            chain,
            String(selectedTimeRange)
          ),
        }),
        ...(isCompareMode
          ? [
              queryClient.refetchQueries({
                queryKey: priceKeys.historical(
                  provider,
                  selectedSymbol,
                  chain,
                  String(compareTimeRange)
                ),
              }),
            ]
          : []),
      ]);
    },
    [
      queryClient,
      selectedSymbol,
      selectedTimeRange,
      isCompareMode,
      compareTimeRange,
      selectionSignature,
    ]
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
    historicalData,
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
    compareHistoricalData,
    compareQueryResults,
    primaryDataFetchTime,
    compareDataFetchTime,
    validationWarnings,
    dataAnomalies,
    hasDataQualityIssues: validationWarnings.length > 0 || dataAnomalies.length > 0,
    supportedChainsBySelectedOracles,
    performanceMetrics: {
      queryResponseTime: queryDuration,
      dataProcessingTime: null,
      validationTime: null,
    },
  };
}
