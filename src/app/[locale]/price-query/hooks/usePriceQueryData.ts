'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  getDefaultFactory,
} from '@/lib/oracles';
import { performanceMetricsCalculator } from '@/lib/services/marketData';
import { createLogger } from '@/lib/utils/logger';

import { type QueryResult } from '../constants';
import { usePerformanceMonitoring } from '../utils/performanceMonitoring';
import {
  validatePrice,
  validateTimestamp,
  validateTimeSeries,
  type AnomalyInfo,
} from '../utils/priceValidator';
import {
  withTimeout,
  limitConcurrency,
  buildQueryTasks,
  processQueryResults,
  type QueryTask,
} from '../utils/queryTaskUtils';

const logger = createLogger('price-query-data');

export interface QueryError {
  provider: OracleProvider;
  chain: Blockchain;
  error: string;
}

export interface UsePriceQueryDataParams {
  selectedOracleRef: React.MutableRefObject<OracleProvider | null>;
  selectedChainRef: React.MutableRefObject<Blockchain | null>;
  selectedSymbolRef: React.MutableRefObject<string>;
  selectedTimeRangeRef: React.MutableRefObject<number>;
  isCompareModeRef: React.MutableRefObject<boolean>;
  compareTimeRangeRef: React.MutableRefObject<number>;
  urlParamsParsed: boolean;
  selectedOracle: OracleProvider | null;
  selectedChain: Blockchain | null;
  selectedSymbol: string;
  selectedTimeRange: number;
}

export interface UsePriceQueryDataReturn {
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  isLoading: boolean;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  queryErrors: QueryError[];
  clearErrors: () => void;
  retryDataSource: (provider: OracleProvider, chain: Blockchain) => Promise<void>;
  retryAllErrors: () => Promise<void>;
  fetchQueryData: () => Promise<void>;
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

async function fetchFromAPI<T>(
  url: string,
  signal?: AbortSignal,
  validateResponse?: (data: unknown) => T
): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return validateResponse ? validateResponse(data) : data;
}

function validatePriceData(data: unknown): PriceData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format: expected object');
  }
  const d = data as Record<string, unknown>;
  if (typeof d.price !== 'number' || isNaN(d.price)) {
    throw new Error('Invalid price data: missing or invalid price');
  }
  if (!d.timestamp || typeof d.timestamp !== 'number') {
    throw new Error('Invalid price data: missing or invalid timestamp');
  }
  return data as PriceData;
}

function validateHistoricalData(data: unknown): PriceData[] {
  if (!Array.isArray(data)) {
    throw new Error(`Invalid response format: expected array, got ${typeof data}`);
  }
  const validated = data.filter((item, index) => {
    if (!item || typeof item !== 'object') {
      logger.warn(`Invalid historical data item at index ${index}: not an object`);
      return false;
    }
    if (typeof item.price !== 'number' || isNaN(item.price)) {
      logger.warn(`Invalid historical data item at index ${index}: invalid price`, { item });
      return false;
    }
    if (!item.timestamp || typeof item.timestamp !== 'number') {
      logger.warn(`Invalid historical data item at index ${index}: invalid timestamp`, { item });
      return false;
    }
    return true;
  });
  if (validated.length === 0 && data.length > 0) {
    throw new Error('All historical data items failed validation');
  }
  return validated;
}

async function fetchPriceFromAPI(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain,
  signal?: AbortSignal
): Promise<PriceData> {
  const params = new URLSearchParams();
  params.set('symbol', symbol);
  if (chain) params.set('chain', chain);

  return fetchFromAPI(`/api/oracles/${provider}?${params.toString()}`, signal, validatePriceData);
}

async function fetchHistoricalPricesFromAPI(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain,
  period: number,
  signal?: AbortSignal
): Promise<PriceData[]> {
  const params = new URLSearchParams();
  params.set('symbol', symbol);
  params.set('chain', chain);
  params.set('period', period.toString());

  return fetchFromAPI(
    `/api/oracles/${provider}?${params.toString()}`,
    signal,
    validateHistoricalData
  );
}

interface QueryState {
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  isLoading: boolean;
  queryStartTime: number | null;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  queryErrors: QueryError[];
  compareHistoricalData: Partial<Record<string, PriceData[]>>;
  compareQueryResults: QueryResult[];
  primaryDataFetchTime: Date | null;
  compareDataFetchTime: Date | null;
  validationWarnings: string[];
  dataAnomalies: AnomalyInfo[];
  performanceMetrics: {
    queryResponseTime: number | null;
    dataProcessingTime: number | null;
    validationTime: number | null;
  };
}

const INITIAL_QUERY_STATE: QueryState = {
  queryResults: [],
  historicalData: {},
  isLoading: false,
  queryStartTime: null,
  queryDuration: null,
  queryProgress: { completed: 0, total: 0 },
  currentQueryTarget: { oracle: null, chain: null },
  queryErrors: [],
  compareHistoricalData: {},
  compareQueryResults: [],
  primaryDataFetchTime: null,
  compareDataFetchTime: null,
  validationWarnings: [],
  dataAnomalies: [],
  performanceMetrics: {
    queryResponseTime: null,
    dataProcessingTime: null,
    validationTime: null,
  },
};

export function usePriceQueryData(params: UsePriceQueryDataParams): UsePriceQueryDataReturn {
  const {
    selectedOracleRef,
    selectedChainRef,
    selectedSymbolRef,
    selectedTimeRangeRef,
    isCompareModeRef,
    compareTimeRangeRef,
    urlParamsParsed,
    selectedOracle,
    selectedChain,
    selectedSymbol,
    selectedTimeRange,
  } = params;

  const [state, setState] = useState<QueryState>(INITIAL_QUERY_STATE);

  const isMounted = useRef(true);
  const prevParamsRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    startQueryMeasure,
    endQueryMeasure,
    startDataProcessingMeasure,
    endDataProcessingMeasure,
    startValidationMeasure,
    endValidationMeasure,
  } = usePerformanceMonitoring();

  const fetchQueryData = useCallback(async () => {
    const currentSelectedOracle = selectedOracleRef.current;
    const currentSelectedChain = selectedChainRef.current;
    const currentSelectedSymbol = selectedSymbolRef.current;
    const currentSelectedTimeRange = selectedTimeRangeRef.current;
    const currentIsCompareMode = isCompareModeRef.current;
    const currentCompareTimeRange = compareTimeRangeRef.current;

    // 如果币种为空，不执行查询
    if (!currentSelectedSymbol) {
      logger.debug('Skipping query: no symbol selected');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const startTime = Date.now();
    setState((prev) => ({
      ...prev,
      isLoading: true,
      queryStartTime: startTime,
      queryDuration: null,
      queryProgress: { completed: 0, total: 0 },
      currentQueryTarget: { oracle: null, chain: null },
    }));

    startQueryMeasure();

    const MAX_CONCURRENT = 6;
    const TIMEOUT_MS = 30000;

    const { primaryTasks, compareTasks, totalQueries } = buildQueryTasks(
      currentSelectedOracle,
      currentSelectedChain,
      currentSelectedSymbol,
      currentSelectedTimeRange,
      currentIsCompareMode,
      currentCompareTimeRange,
      getDefaultFactory()
    );

    const actualTotalQueries = currentIsCompareMode ? totalQueries * 2 : totalQueries;
    setState((prev) => ({ ...prev, queryProgress: { completed: 0, total: actualTotalQueries } }));

    const allTasks = [...primaryTasks, ...compareTasks];

    const executeQueryTask = async (task: QueryTask) => {
      if (!isMounted.current) {
        throw new Error('Component unmounted');
      }

      setState((prev) => ({
        ...prev,
        currentQueryTarget: { oracle: task.provider, chain: task.chain },
      }));

      const price = await withTimeout(
        fetchPriceFromAPI(task.provider, currentSelectedSymbol, task.chain, abortController.signal),
        TIMEOUT_MS
      );

      const history = await withTimeout(
        fetchHistoricalPricesFromAPI(
          task.provider,
          currentSelectedSymbol,
          task.chain,
          task.timeRange,
          abortController.signal
        ),
        TIMEOUT_MS
      );

      return {
        provider: task.provider,
        chain: task.chain,
        priceData: price,
        history,
        isCompare: task.isCompare,
      };
    };

    let completedQueries = 0;
    let dataProcessingDuration: number | undefined;
    let validationDuration: number | undefined;

    try {
      const taskResults = await limitConcurrency(
        allTasks,
        async (task: QueryTask) => {
          try {
            const result = await executeQueryTask(task);
            return result;
          } finally {
            completedQueries++;
            if (isMounted.current) {
              setState((prev) => ({
                ...prev,
                queryProgress: { completed: completedQueries, total: actualTotalQueries },
              }));
            }
          }
        },
        MAX_CONCURRENT
      );

      const { results, histories, compareResults, compareHistories, collectedErrors } =
        processQueryResults(taskResults, allTasks);

      for (const settledResult of taskResults) {
        if (settledResult.status === 'fulfilled') {
          const { provider, priceData, history } = settledResult.value;

          if (priceData) {
            performanceMetricsCalculator.addPriceData({
              oracle: provider,
              asset: currentSelectedSymbol,
              price: priceData.price,
              timestamp: Date.now(),
              confidence: priceData.confidence,
            });

            if (history && history.length > 0) {
              history.forEach((dataPoint) => {
                performanceMetricsCalculator.addPriceData({
                  oracle: provider,
                  asset: currentSelectedSymbol,
                  price: dataPoint.price,
                  timestamp: new Date(dataPoint.timestamp).getTime(),
                  confidence: dataPoint.confidence,
                });
              });
            }
          }
        } else {
          const task = allTasks[taskResults.indexOf(settledResult)];
          if (task) {
            const errorReason = settledResult.reason;
            const errorMessage =
              errorReason instanceof Error ? errorReason.message : String(errorReason);
            const errorStack = errorReason instanceof Error ? errorReason.stack : undefined;

            logger.error(
              `Error fetching ${task.isCompare ? 'compare data' : ''} ${task.provider} on ${task.chain}: ${errorMessage}`,
              errorReason instanceof Error ? errorReason : new Error(errorMessage),
              {
                provider: task.provider,
                chain: task.chain,
                symbol: currentSelectedSymbol,
                errorStack,
              }
            );
          }
        }
      }

      // 注意：collectedErrors 已经在 processQueryResults 中收集
      // 这里直接设置错误状态，避免与上面的循环重复添加
      if (collectedErrors.length > 0) {
        setState((prev) => ({ ...prev, queryErrors: collectedErrors }));
      } else {
        setState((prev) => ({ ...prev, queryErrors: [] }));
      }

      if (!isMounted.current) return;

      startDataProcessingMeasure();

      setState((prev) => ({
        ...prev,
        queryResults: results,
        historicalData: histories,
        primaryDataFetchTime: new Date(),
      }));

      startValidationMeasure();

      const allWarnings: string[] = [];
      const allAnomalies: AnomalyInfo[] = [];

      for (const result of results) {
        if (!result.priceData) continue;

        const priceValidation = validatePrice(result.priceData.price);
        const timestampValidation = validateTimestamp(result.priceData.timestamp);

        allWarnings.push(...priceValidation.warnings, ...timestampValidation.warnings);
        allAnomalies.push(...priceValidation.anomalies, ...timestampValidation.anomalies);
      }

      for (const [key, history] of Object.entries(histories)) {
        if (history && history.length > 0) {
          const seriesValidation = validateTimeSeries(history);
          allWarnings.push(...seriesValidation.warnings.map((w) => `[${key}] ${w}`));
          allAnomalies.push(...seriesValidation.anomalies);
        }
      }

      validationDuration = endValidationMeasure({
        resultsCount: results.length,
        warningsCount: allWarnings.length,
        anomaliesCount: allAnomalies.length,
      });

      setState((prev) => ({
        ...prev,
        validationWarnings: allWarnings,
        dataAnomalies: allAnomalies,
      }));

      dataProcessingDuration = endDataProcessingMeasure({
        resultsCount: results.length,
        historiesCount: Object.keys(histories).length,
      });

      if (currentIsCompareMode) {
        setState((prev) => ({
          ...prev,
          compareQueryResults: compareResults,
          compareHistoricalData: compareHistories,
          compareDataFetchTime: new Date(),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          compareQueryResults: [],
          compareHistoricalData: {},
        }));
      }
    } catch (error) {
      logger.error(
        'Error fetching query data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      if (isMounted.current) {
        const queryResponseTime = endQueryMeasure({
          oraclesCount: currentSelectedOracle ? 1 : 0,
          chainsCount: currentSelectedChain ? 1 : 0,
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          queryDuration: Date.now() - startTime,
          currentQueryTarget: { oracle: null, chain: null },
          performanceMetrics: {
            queryResponseTime,
            dataProcessingTime:
              dataProcessingDuration ?? prev.performanceMetrics.dataProcessingTime,
            validationTime: validationDuration ?? prev.performanceMetrics.validationTime,
          },
        }));
      }
    }
  }, [
    selectedOracleRef,
    selectedChainRef,
    selectedSymbolRef,
    selectedTimeRangeRef,
    isCompareModeRef,
    compareTimeRangeRef,
    startQueryMeasure,
    endQueryMeasure,
    startDataProcessingMeasure,
    endDataProcessingMeasure,
    startValidationMeasure,
    endValidationMeasure,
  ]);

  const retryDataSource = useCallback(
    async (provider: OracleProvider, chain: Blockchain) => {
      const currentSelectedSymbol = selectedSymbolRef.current;
      const currentSelectedTimeRange = selectedTimeRangeRef.current;
      const currentIsCompareMode = isCompareModeRef.current;
      const currentCompareTimeRange = compareTimeRangeRef.current;

      try {
        // 使用 API 路由获取数据
        const price = await fetchPriceFromAPI(provider, currentSelectedSymbol, chain);
        const history = await fetchHistoricalPricesFromAPI(
          provider,
          currentSelectedSymbol,
          chain,
          currentSelectedTimeRange
        );

        const key = `${provider}-${chain}`;
        const result: QueryResult = { provider, chain, priceData: price };

        setState((prev) => {
          const existing = prev.queryResults.findIndex(
            (r) => r.provider === provider && r.chain === chain
          );
          const updatedResults =
            existing >= 0
              ? prev.queryResults.map((r, i) => (i === existing ? result : r))
              : [...prev.queryResults, result];
          return { ...prev, queryResults: updatedResults };
        });

        setState((prev) => ({
          ...prev,
          historicalData: { ...prev.historicalData, [key]: history },
        }));

        if (currentIsCompareMode) {
          const compareHistory = await fetchHistoricalPricesFromAPI(
            provider,
            currentSelectedSymbol,
            chain,
            currentCompareTimeRange
          );
          setState((prev) => ({
            ...prev,
            compareHistoricalData: { ...prev.compareHistoricalData, [key]: compareHistory },
          }));
        }

        setState((prev) => ({
          ...prev,
          queryErrors: prev.queryErrors.filter(
            (e) => !(e.provider === provider && e.chain === chain)
          ),
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setState((prev) => {
          const filtered = prev.queryErrors.filter(
            (e) => !(e.provider === provider && e.chain === chain)
          );
          return { ...prev, queryErrors: [...filtered, { provider, chain, error: errorMessage }] };
        });
        logger.error(
          `Error retrying ${provider} on ${chain}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },
    [selectedSymbolRef, selectedTimeRangeRef, isCompareModeRef, compareTimeRangeRef]
  );

  const retryAllErrors = useCallback(async () => {
    await Promise.allSettled(
      state.queryErrors.map((error) => retryDataSource(error.provider, error.chain))
    );
  }, [state.queryErrors, retryDataSource]);

  const clearErrors = useCallback(() => {
    setState((prev) => ({ ...prev, queryErrors: [] }));
  }, []);

  useEffect(() => {
    if (!urlParamsParsed) return;

    const paramsSignature = JSON.stringify({
      oracle: selectedOracle,
      chain: selectedChain,
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
    });

    // 参数变化时，先清理旧数据，再获取新数据
    if (prevParamsRef.current !== paramsSignature) {
      prevParamsRef.current = paramsSignature;
      setState((prev) => ({
        ...prev,
        queryResults: [],
        historicalData: {},
        queryErrors: [],
        validationWarnings: [],
        dataAnomalies: [],
      }));
      fetchQueryData();
    }
  }, [
    urlParamsParsed,
    selectedOracle,
    selectedChain,
    selectedSymbol,
    selectedTimeRange,
    fetchQueryData,
  ]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const supportedChainsBySelectedOracles = useMemo(() => {
    if (!selectedOracle) return new Set<Blockchain>();
    const supported = new Set<Blockchain>();
    const client = getDefaultFactory().getClient(selectedOracle);
    client.supportedChains.forEach((chain) => supported.add(chain));
    return supported;
  }, [selectedOracle]);

  return {
    queryResults: state.queryResults,
    historicalData: state.historicalData,
    isLoading: state.isLoading,
    queryDuration: state.queryDuration,
    queryProgress: state.queryProgress,
    currentQueryTarget: state.currentQueryTarget,
    queryErrors: state.queryErrors,
    clearErrors,
    retryDataSource,
    retryAllErrors,
    fetchQueryData,
    compareHistoricalData: state.compareHistoricalData,
    compareQueryResults: state.compareQueryResults,
    primaryDataFetchTime: state.primaryDataFetchTime,
    compareDataFetchTime: state.compareDataFetchTime,
    validationWarnings: state.validationWarnings,
    dataAnomalies: state.dataAnomalies,
    hasDataQualityIssues: state.validationWarnings.length > 0 || state.dataAnomalies.length > 0,
    supportedChainsBySelectedOracles,
    performanceMetrics: state.performanceMetrics,
  };
}
