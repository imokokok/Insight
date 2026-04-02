'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import {
  OracleProvider,
  type Blockchain,
  type PriceData,
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  TellorClient,
  ChronicleClient,
  WINkLinkClient,
} from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';


import { type QueryResult } from '../constants';
import { usePerformanceMonitoring } from '../utils/performanceMonitoring';
import {
  validatePrice,
  validateTimestamp,
  validateTimeSeries,
  type AnomalyInfo,
} from '../utils/priceValidator';

const logger = createLogger('price-query-data');

export interface QueryError {
  provider: OracleProvider;
  chain: Blockchain;
  error: string;
}

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH]: new PythClient(),
  [OracleProvider.API3]: new API3Client(),
  [OracleProvider.REDSTONE]: new RedStoneClient(),
  [OracleProvider.DIA]: new DIAClient(),
  [OracleProvider.TELLOR]: new TellorClient(),
  [OracleProvider.CHRONICLE]: new ChronicleClient(),
  [OracleProvider.WINKLINK]: new WINkLinkClient(),
};

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [queryStartTime, setQueryStartTime] = useState<number | null>(null);
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

    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
        promise
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timer);
            reject(error);
          });
      });
    };

    const limitConcurrency = async <T, R>(
      items: T[],
      handler: (item: T) => Promise<R>,
      maxConcurrent: number
    ): Promise<PromiseSettledResult<R>[]> => {
      const results: PromiseSettledResult<R>[] = new Array(items.length);
      const executing: Promise<void>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const index = i;

        const promise = Promise.allSettled([handler(item)]).then(([result]) => {
          results[index] = result;
        });

        const wrapped = promise.then(() => {
          const idx = executing.indexOf(wrapped);
          if (idx > -1) executing.splice(idx, 1);
        });
        executing.push(wrapped);

        if (executing.length >= maxConcurrent) {
          await Promise.race(executing);
        }
      }

      await Promise.all(executing);
      return results;
    };

    let totalQueries = 0;
    if (currentSelectedOracle && currentSelectedChain) {
      const client = oracleClients[currentSelectedOracle];
      const supportedChains = client.supportedChains;
      if (supportedChains.includes(currentSelectedChain)) {
        totalQueries = 1;
      }
    }

    const actualTotalQueries = currentIsCompareMode ? totalQueries * 2 : totalQueries;
    setQueryProgress({ completed: 0, total: actualTotalQueries });

    interface QueryTask {
      provider: OracleProvider;
      chain: Blockchain;
      client: (typeof oracleClients)[OracleProvider];
      timeRange: number;
      isCompare: boolean;
    }

    const primaryTasks: QueryTask[] = [];
    const compareTasks: QueryTask[] = [];

    if (currentSelectedOracle && currentSelectedChain) {
      const client = oracleClients[currentSelectedOracle];
      const supportedChains = client.supportedChains;

      if (supportedChains.includes(currentSelectedChain)) {
        primaryTasks.push({
          provider: currentSelectedOracle,
          chain: currentSelectedChain,
          client,
          timeRange: currentSelectedTimeRange,
          isCompare: false,
        });

        if (currentIsCompareMode) {
          compareTasks.push({
            provider: currentSelectedOracle,
            chain: currentSelectedChain,
            client,
            timeRange: currentCompareTimeRange,
            isCompare: true,
          });
        }
      }
    }

    const allTasks = [...primaryTasks, ...compareTasks];

    const executeQueryTask = async (task: QueryTask) => {
      if (!isMounted.current) {
        throw new Error('Component unmounted');
      }

      setCurrentQueryTarget({ oracle: task.provider, chain: task.chain });

      const price = await withTimeout(
        task.client.getPrice(currentSelectedSymbol, task.chain),
        TIMEOUT_MS
      );

      const history = await withTimeout(
        task.client.getHistoricalPrices(currentSelectedSymbol, task.chain, task.timeRange),
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
    const results: QueryResult[] = [];
    const histories: Partial<Record<string, PriceData[]>> = {};
    const compareResults: QueryResult[] = [];
    const compareHistories: Partial<Record<string, PriceData[]>> = {};
    const collectedErrors: QueryError[] = [];

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

      for (const settledResult of taskResults) {
        if (settledResult.status === 'fulfilled') {
          const { provider, chain, priceData, history, isCompare } = settledResult.value;
          const key = `${provider}-${chain}`;

          if (isCompare) {
            compareResults.push({ provider, chain, priceData });
            compareHistories[key] = history;
          } else {
            results.push({ provider, chain, priceData });
            histories[key] = history;
          }
        } else {
          const task = allTasks[taskResults.indexOf(settledResult)];
          if (task) {
            const errorMessage =
              settledResult.reason instanceof Error
                ? settledResult.reason.message
                : String(settledResult.reason);
            collectedErrors.push({
              provider: task.provider,
              chain: task.chain,
              error: errorMessage,
            });
            logger.error(
              `Error fetching ${task.isCompare ? 'compare data' : ''} ${task.provider} on ${task.chain}`,
              settledResult.reason instanceof Error
                ? settledResult.reason
                : new Error(String(settledResult.reason))
            );
          }
        }
      }

      if (collectedErrors.length > 0) {
        setQueryErrors((prev) => [...prev, ...collectedErrors]);
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
      const client = oracleClients[provider];
      const currentSelectedSymbol = selectedSymbolRef.current;
      const currentSelectedTimeRange = selectedTimeRangeRef.current;
      const currentIsCompareMode = isCompareModeRef.current;
      const currentCompareTimeRange = compareTimeRangeRef.current;

      try {
        const price = await client.getPrice(currentSelectedSymbol, chain);
        const history = await client.getHistoricalPrices(
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
          const compareHistory = await client.getHistoricalPrices(
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

    if (prevParamsRef.current !== paramsSignature) {
      prevParamsRef.current = paramsSignature;
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
    const client = oracleClients[selectedOracle];
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
