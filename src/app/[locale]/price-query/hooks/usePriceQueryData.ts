'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  OracleClientFactory,
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

// 通过 API 路由获取价格数据
async function fetchPriceFromAPI(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain,
  signal?: AbortSignal
): Promise<PriceData> {
  const params = new URLSearchParams();
  params.set('symbol', symbol);
  if (chain) params.set('chain', chain);

  const response = await fetch(`/api/oracles/${provider}?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// 通过 API 路由获取历史价格数据
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

  const response = await fetch(`/api/oracles/${provider}?${params.toString()}`, {
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

  // 验证返回数据是否为数组
  if (!Array.isArray(data)) {
    throw new Error(`Invalid response format: expected array, got ${typeof data}`);
  }

  // 验证数组元素是否符合 PriceData 格式
  const validatedData = data.filter((item, index) => {
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

  if (validatedData.length === 0 && data.length > 0) {
    throw new Error('All historical data items failed validation');
  }

  return validatedData;
}

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

  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [historicalData, setHistoricalData] = useState<Partial<Record<string, PriceData[]>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [_queryStartTime, setQueryStartTime] = useState<number | null>(null);
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const [queryProgress, setQueryProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [currentQueryTarget, setCurrentQueryTarget] = useState<{
    oracle: OracleProvider | null;
    chain: Blockchain | null;
  }>({ oracle: null, chain: null });
  const [queryErrors, setQueryErrors] = useState<QueryError[]>([]);
  const [compareHistoricalData, setCompareHistoricalData] = useState<
    Partial<Record<string, PriceData[]>>
  >({});
  const [compareQueryResults, setCompareQueryResults] = useState<QueryResult[]>([]);
  const [primaryDataFetchTime, setPrimaryDataFetchTime] = useState<Date | null>(null);
  const [compareDataFetchTime, setCompareDataFetchTime] = useState<Date | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [dataAnomalies, setDataAnomalies] = useState<AnomalyInfo[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    queryResponseTime: number | null;
    dataProcessingTime: number | null;
    validationTime: number | null;
  }>({
    queryResponseTime: null,
    dataProcessingTime: null,
    validationTime: null,
  });

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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    const startTime = Date.now();
    setQueryStartTime(startTime);
    setQueryDuration(null);
    setQueryProgress({ completed: 0, total: 0 });
    setCurrentQueryTarget({ oracle: null, chain: null });

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
      OracleClientFactory
    );

    const actualTotalQueries = currentIsCompareMode ? totalQueries * 2 : totalQueries;
    setQueryProgress({ completed: 0, total: actualTotalQueries });

    const allTasks = [...primaryTasks, ...compareTasks];

    const executeQueryTask = async (task: QueryTask) => {
      if (!isMounted.current) {
        throw new Error('Component unmounted');
      }

      setCurrentQueryTarget({ oracle: task.provider, chain: task.chain });

      // 使用 API 路由获取数据
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
              setQueryProgress({ completed: completedQueries, total: actualTotalQueries });
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
        setQueryErrors(collectedErrors);
      } else {
        setQueryErrors([]);
      }

      if (!isMounted.current) return;

      startDataProcessingMeasure();

      setQueryResults(results);
      setHistoricalData(histories);
      setPrimaryDataFetchTime(new Date());

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

      setValidationWarnings(allWarnings);
      setDataAnomalies(allAnomalies);

      dataProcessingDuration = endDataProcessingMeasure({
        resultsCount: results.length,
        historiesCount: Object.keys(histories).length,
      });

      if (currentIsCompareMode) {
        setCompareQueryResults(compareResults);
        setCompareHistoricalData(compareHistories);
        setCompareDataFetchTime(new Date());
      } else {
        setCompareQueryResults([]);
        setCompareHistoricalData({});
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

        setIsLoading(false);
        setQueryDuration(Date.now() - startTime);
        setCurrentQueryTarget({ oracle: null, chain: null });

        setPerformanceMetrics((prev) => ({
          ...prev,
          queryResponseTime,
          dataProcessingTime: dataProcessingDuration ?? prev.dataProcessingTime,
          validationTime: validationDuration ?? prev.validationTime,
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

        setQueryResults((prev) => {
          const existing = prev.findIndex((r) => r.provider === provider && r.chain === chain);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = result;
            return updated;
          }
          return [...prev, result];
        });

        setHistoricalData((prev) => ({ ...prev, [key]: history }));

        if (currentIsCompareMode) {
          const compareHistory = await fetchHistoricalPricesFromAPI(
            provider,
            currentSelectedSymbol,
            chain,
            currentCompareTimeRange
          );
          setCompareHistoricalData((prev) => ({ ...prev, [key]: compareHistory }));
        }

        setQueryErrors((prev) =>
          prev.filter((e) => !(e.provider === provider && e.chain === chain))
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setQueryErrors((prev) => {
          const filtered = prev.filter((e) => !(e.provider === provider && e.chain === chain));
          return [...filtered, { provider, chain, error: errorMessage }];
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
    const errorsToRetry = [...queryErrors];
    for (const error of errorsToRetry) {
      await retryDataSource(error.provider, error.chain);
    }
  }, [queryErrors, retryDataSource]);

  const clearErrors = useCallback(() => {
    setQueryErrors([]);
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
      // 清理旧数据，避免显示过期数据
      setQueryResults([]);
      setHistoricalData({});
      setQueryErrors([]);
      setValidationWarnings([]);
      setDataAnomalies([]);
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
    const client = OracleClientFactory.getClient(selectedOracle);
    client.supportedChains.forEach((chain) => supported.add(chain));
    return supported;
  }, [selectedOracle]);

  return {
    queryResults,
    historicalData,
    isLoading,
    queryDuration,
    queryProgress,
    currentQueryTarget,
    queryErrors,
    clearErrors,
    retryDataSource,
    retryAllErrors,
    fetchQueryData,
    compareHistoricalData,
    compareQueryResults,
    primaryDataFetchTime,
    compareDataFetchTime,
    validationWarnings,
    dataAnomalies,
    hasDataQualityIssues: validationWarnings.length > 0 || dataAnomalies.length > 0,
    supportedChainsBySelectedOracles,
    performanceMetrics,
  };
}
