/**
 * @fileoverview 预言机数据获取 Hook
 * @description 负责价格数据获取、加载状态管理和自动刷新，集成性能指标计算
 */

/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback, useRef } from 'react';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { getHoursForTimeRange, extractBaseSymbol } from '@/lib/oracles';
import { memoryManager, type MemoryStats } from '@/lib/oracles/memoryManager';
import {
  PerformanceMetricsCalculator,
  type CalculatedPerformanceMetrics,
} from '@/lib/oracles/performanceMetricsCalculator';
import { getPerformanceMetricsConfig } from '@/lib/oracles/performanceMetricsConfig';
import { createLogger } from '@/lib/utils/logger';
import { getRequestQueue, type RequestPriority } from '@/lib/utils/requestQueue';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { type TimeRange, type RefreshInterval, type PriceOracleProvider } from '../constants';

import { useOracleRetry } from './useOracleRetry';

import type {
  UseOracleDataReturn,
  OracleErrorInfo,
  OracleErrorType,
  OracleDataError,
  PartialSuccessState,
  RetryConfig,
} from '../types';

const logger = createLogger('useOracleData');

type OracleErrorTypeValue =
  | 'network'
  | 'timeout'
  | 'data_format'
  | 'rate_limit'
  | 'server_error'
  | 'cors'
  | 'unknown';

function classifyError(error: unknown): { errorType: OracleErrorTypeValue; retryable: boolean } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
      return { errorType: 'timeout', retryable: true };
    }

    if (
      message.includes('cors') ||
      message.includes('cross-origin') ||
      message.includes('blocked by cors') ||
      message.includes('access-control')
    ) {
      return { errorType: 'cors', retryable: false };
    }

    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('internal server error') ||
      message.includes('bad gateway') ||
      message.includes('service unavailable') ||
      message.includes('gateway timeout')
    ) {
      return { errorType: 'server_error', retryable: true };
    }

    if (
      name.includes('network') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('networkerror') ||
      message.includes('failed to fetch')
    ) {
      return { errorType: 'network', retryable: true };
    }

    if (
      message.includes('rate limit') ||
      message.includes('too many') ||
      message.includes('429') ||
      message.includes('throttl') ||
      message.includes('quota exceeded')
    ) {
      return { errorType: 'rate_limit', retryable: true };
    }

    if (
      message.includes('parse') ||
      message.includes('json') ||
      message.includes('format') ||
      message.includes('invalid') ||
      message.includes('unexpected token') ||
      message.includes('syntaxerror')
    ) {
      return { errorType: 'data_format', retryable: false };
    }

    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      return { errorType: 'network', retryable: false };
    }
  }

  return { errorType: 'unknown', retryable: true };
}

function createOracleErrorInfo(provider: OracleProvider, error: unknown): OracleErrorInfo {
  const { errorType, retryable } = classifyError(error);
  const message = error instanceof Error ? error.message : String(error);

  return {
    provider,
    errorType: errorType as OracleErrorType,
    message,
    originalError: error instanceof Error ? error : undefined,
    retryable,
    timestamp: Date.now(),
  };
}

interface UseOracleDataOptions {
  selectedOracles: PriceOracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;
  initialRefreshInterval?: RefreshInterval;
  enablePerformanceMetrics?: boolean;
  initialRetryConfig?: Partial<RetryConfig>;
  requestTimeout?: number;
  requestPriority?: RequestPriority;
}

export function useOracleData({
  selectedOracles,
  selectedSymbol,
  timeRange,
  initialRefreshInterval = 0,
  enablePerformanceMetrics = true,
  initialRetryConfig,
  requestTimeout,
  requestPriority = 'normal',
}: UseOracleDataOptions): UseOracleDataReturn {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<
    Partial<Record<OracleProvider, PriceData[]>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(initialRefreshInterval);

  const [performanceMetrics, setPerformanceMetrics] = useState<CalculatedPerformanceMetrics[]>([]);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const metricsCalculatorRef = useRef<PerformanceMetricsCalculator>(
    new PerformanceMetricsCalculator()
  );
  const priceHistoryMapRef = useRef<
    Map<
      OracleProvider,
      Array<{
        price: number;
        timestamp: number;
        responseTime: number;
        success: boolean;
        source?: string;
      }>
    >
  >(new Map());

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const prevDepsRef = useRef<{
    selectedOracles: PriceOracleProvider[];
    selectedSymbol: string;
    timeRange: TimeRange;
  }>({
    selectedOracles: [],
    selectedSymbol: '',
    timeRange: '24H',
  });
  const isInitialMountRef = useRef(true);

  const [oracleDataError, setOracleDataError] = useState<OracleDataError>({
    hasError: false,
    isPartialSuccess: false,
    partialSuccess: null,
    errors: [],
    globalError: null,
  });

  const [queryProgress, setQueryProgress] = useState({ completed: 0, total: 0 });

  const calculatePerformanceMetrics = useCallback(() => {
    if (!enablePerformanceMetrics) return;

    setIsCalculatingMetrics(true);

    try {
      const newMetrics: CalculatedPerformanceMetrics[] = [];
      const baseSymbol = extractBaseSymbol(selectedSymbol);

      selectedOracles.forEach((oracle) => {
        const metrics = metricsCalculatorRef.current.calculateAllMetrics(
          oracle as OracleProvider,
          baseSymbol,
          priceHistoryMapRef.current
        );
        newMetrics.push(metrics);
      });

      if (isMountedRef.current) {
        setPerformanceMetrics(newMetrics);
        logger.debug('Calculated performance metrics', { count: newMetrics.length });
      }
    } catch (err) {
      logger.error(
        'Error calculating performance metrics',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      if (isMountedRef.current) {
        setIsCalculatingMetrics(false);
      }
    }
  }, [enablePerformanceMetrics, selectedOracles, selectedSymbol]);

  const fetchSingleOracle = useCallback(
    async (
      oracle: PriceOracleProvider,
      baseSymbol: string,
      hours: number,
      signal: AbortSignal
    ): Promise<{ price: PriceData; history: PriceData[] } | null> => {
      const requestStart = Date.now();
      const requestQueue = getRequestQueue();

      try {
        // 使用 API 路由获取数据，避免浏览器端 CORS 问题
        const [price, history] = await Promise.all([
          requestQueue.add(
            () =>
              oracleApiClient.fetchPrice({
                provider: oracle as OracleProvider,
                symbol: baseSymbol,
              }),
            {
              priority: requestPriority,
              timeout: requestTimeout,
              abortSignal: signal,
            }
          ),
          requestQueue.add(
            () =>
              oracleApiClient.fetchHistorical({
                provider: oracle as OracleProvider,
                symbol: baseSymbol,
                period: hours,
              }),
            {
              priority: requestPriority,
              timeout: requestTimeout,
              abortSignal: signal,
            }
          ),
        ]);

        if (signal.aborted) {
          return null;
        }

        const responseTime = Date.now() - requestStart;

        if (enablePerformanceMetrics && isMountedRef.current) {
          metricsCalculatorRef.current.addPriceData(
            oracle as OracleProvider,
            baseSymbol,
            price,
            responseTime,
            true
          );

          if (!priceHistoryMapRef.current.has(oracle as OracleProvider)) {
            priceHistoryMapRef.current.set(oracle as OracleProvider, []);
          }
          const historyData = priceHistoryMapRef.current.get(oracle as OracleProvider)!;
          historyData.push({
            price: price.price,
            timestamp: price.timestamp,
            responseTime,
            success: true,
            source: price.source,
          });

          const memConfig = getPerformanceMetricsConfig().memoryManagement;
          if (memConfig.enabled) {
            const cleanedData = memoryManager.smartCleanup(historyData);
            if (cleanedData.length !== historyData.length) {
              priceHistoryMapRef.current.set(oracle as OracleProvider, cleanedData);
            }
          } else if (historyData.length > 1000) {
            historyData.shift();
          }
        }

        return { price, history };
      } catch (err) {
        const responseTime = Date.now() - requestStart;
        logger.error(
          `Error fetching data from ${oracle}`,
          err instanceof Error ? err : new Error(String(err))
        );

        if (enablePerformanceMetrics) {
          metricsCalculatorRef.current.addPriceData(
            oracle as OracleProvider,
            baseSymbol,
            {
              provider: oracle as OracleProvider,
              symbol: baseSymbol,
              price: 0,
              timestamp: Date.now(),
            },
            responseTime,
            false
          );

          if (!priceHistoryMapRef.current.has(oracle as OracleProvider)) {
            priceHistoryMapRef.current.set(oracle as OracleProvider, []);
          }
          const historyData = priceHistoryMapRef.current.get(oracle as OracleProvider)!;
          historyData.push({
            price: 0,
            timestamp: Date.now(),
            responseTime,
            success: false,
            source: 'error',
          });
        }

        throw err;
      }
    },
    [enablePerformanceMetrics, requestTimeout, requestPriority]
  );

  const handlePriceDataUpdate = useCallback(
    (provider: OracleProvider, data: { price: PriceData; history: PriceData[] }) => {
      setPriceData((prev) => {
        const filtered = prev.filter((p) => p.provider !== provider);
        return [...filtered, data.price];
      });

      setHistoricalData((prev) => ({
        ...prev,
        [provider]: data.history,
      }));

      setOracleDataError((prev) => {
        const newErrors = prev.errors.filter((e) => e.provider !== provider);
        const newFailedOracles =
          prev.partialSuccess?.failedOracles.filter((o) => o !== provider) || [];
        const newSuccessOracles = [...(prev.partialSuccess?.successOracles || []), provider];

        const newPartialSuccess: PartialSuccessState | null =
          newFailedOracles.length > 0
            ? {
                isSuccess: true,
                successCount: newSuccessOracles.length,
                failedCount: newFailedOracles.length,
                totalCount: selectedOracles.length,
                failedOracles: newFailedOracles,
                successOracles: newSuccessOracles,
              }
            : null;

        return {
          hasError: newErrors.length > 0,
          isPartialSuccess: newPartialSuccess !== null,
          partialSuccess: newPartialSuccess,
          errors: newErrors,
          globalError: null,
        };
      });
    },
    [selectedOracles.length]
  );

  const handleErrorUpdate = useCallback(
    (provider: OracleProvider, errorInfo: OracleErrorInfo | null) => {
      setOracleDataError((prev) => {
        if (errorInfo === null) {
          const newErrors = prev.errors.filter((e) => e.provider !== provider);
          return {
            ...prev,
            errors: newErrors,
          };
        }
        const newErrors = prev.errors.map((e) => (e.provider === provider ? errorInfo : e));
        return {
          ...prev,
          errors: newErrors,
        };
      });
    },
    []
  );

  const {
    retryConfig,
    setRetryConfig,
    retryOracle,
    retryAllFailed: retryAllFailedBase,
    isRetrying,
    retryingOracles,
  } = useOracleRetry({
    selectedOracles,
    selectedSymbol,
    timeRange,
    initialRetryConfig,
    fetchSingleOracle,
    onPriceDataUpdate: handlePriceDataUpdate,
    onErrorUpdate: handleErrorUpdate,
  });

  const retryAllFailed = useCallback(async () => {
    await retryAllFailedBase(oracleDataError);
  }, [retryAllFailedBase, oracleDataError]);

  const fetchPriceData = useCallback(async () => {
    if (selectedOracles.length === 0) {
      setPriceData([]);
      setHistoricalData({});
      setQueryProgress({ completed: 0, total: 0 });
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);
    setOracleDataError({
      hasError: false,
      isPartialSuccess: false,
      partialSuccess: null,
      errors: [],
      globalError: null,
    });
    setQueryProgress({ completed: 0, total: selectedOracles.length });

    const prices: PriceData[] = [];
    const histories: Partial<Record<OracleProvider, PriceData[]>> = {};
    const errors: OracleErrorInfo[] = [];
    const hours = getHoursForTimeRange(timeRange) ?? 24;
    const baseSymbol = extractBaseSymbol(selectedSymbol);
    let completedCount = 0;

    try {
      const fetchPromises = selectedOracles.map(async (oracle) => {
        try {
          const result = await fetchSingleOracle(oracle, baseSymbol, hours, signal);
          if (result && isMountedRef.current) {
            prices.push(result.price);
            histories[oracle] = result.history;
          }
        } catch (err) {
          if (!signal.aborted && isMountedRef.current) {
            errors.push(createOracleErrorInfo(oracle as OracleProvider, err));
          }
        } finally {
          if (isMountedRef.current) {
            completedCount++;
            setQueryProgress({ completed: completedCount, total: selectedOracles.length });
          }
        }
      });

      await Promise.all(fetchPromises);

      if (signal.aborted || !isMountedRef.current) {
        return;
      }

      const successOracles = prices.map((p) => p.provider);
      const failedOracles = selectedOracles.filter(
        (o) => !successOracles.includes(o as OracleProvider)
      ) as OracleProvider[];

      const partialSuccess: PartialSuccessState | null =
        failedOracles.length > 0 && successOracles.length > 0
          ? {
              isSuccess: successOracles.length > 0,
              successCount: successOracles.length,
              failedCount: failedOracles.length,
              totalCount: selectedOracles.length,
              failedOracles,
              successOracles,
            }
          : null;

      const isPartialSuccess = partialSuccess !== null;
      const hasError = errors.length > 0;

      setPriceData(prices);
      setHistoricalData(histories);
      setLastUpdated(new Date());
      setOracleDataError({
        hasError,
        isPartialSuccess,
        partialSuccess,
        errors,
        globalError:
          failedOracles.length === selectedOracles.length
            ? new Error('All oracles failed to fetch data')
            : null,
      });

      if (enablePerformanceMetrics) {
        calculatePerformanceMetrics();
      }
    } catch (err) {
      const appError = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to fetch price data', appError);
      if (isMountedRef.current) {
        setError(appError);
        setOracleDataError({
          hasError: true,
          isPartialSuccess: false,
          partialSuccess: null,
          errors: [],
          globalError: appError,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    selectedOracles,
    selectedSymbol,
    timeRange,
    enablePerformanceMetrics,
    calculatePerformanceMetrics,
    fetchSingleOracle,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    memoryManager.startPeriodicCleanup();

    // 使用更可靠的参数签名来检测变化
    const currentSignature = JSON.stringify({
      oracles: selectedOracles.slice().sort(), // 排序以确保顺序不影响比较
      symbol: selectedSymbol,
      timeRange: timeRange,
    });
    const prevSignature = JSON.stringify({
      oracles: prevDepsRef.current.selectedOracles.slice().sort(),
      symbol: prevDepsRef.current.selectedSymbol,
      timeRange: prevDepsRef.current.timeRange,
    });

    const depsChanged = isInitialMountRef.current || currentSignature !== prevSignature;

    if (depsChanged) {
      prevDepsRef.current = { selectedOracles, selectedSymbol, timeRange };
      isInitialMountRef.current = false;
      // 清理旧数据，避免显示过期数据
      setPriceData([]);
      setHistoricalData({});
      setOracleDataError({
        hasError: false,
        isPartialSuccess: false,
        partialSuccess: null,
        errors: [],
        globalError: null,
      });
      setError(null);
      fetchPriceData();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      memoryManager.stopPeriodicCleanup();
    };
  }, [selectedOracles, selectedSymbol, timeRange, fetchPriceData]);

  useEffect(() => {
    if (refreshInterval === 0) return;

    const intervalId = setInterval(() => {
      fetchPriceData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchPriceData]);

  useEffect(() => {
    return () => {
      priceHistoryMapRef.current.clear();
      metricsCalculatorRef.current.clearAllData();
    };
  }, []);

  const getMemoryStats = useCallback((): MemoryStats => {
    return memoryManager.getMemoryStats(priceHistoryMapRef.current);
  }, []);

  const clearHistoryData = useCallback(() => {
    priceHistoryMapRef.current.clear();
    metricsCalculatorRef.current.clearAllData();
    logger.info('Cleared all price history data');
  }, []);

  const getDetailedMemoryStats = useCallback(() => {
    const calculatorStats = metricsCalculatorRef.current.getDetailedStats();
    const localStats = getMemoryStats();

    return {
      localPriceHistory: localStats,
      calculatorStats,
      formattedBytes: memoryManager.formatBytes(localStats.estimatedBytes),
    };
  }, [getMemoryStats]);

  return {
    priceData,
    historicalData,
    isLoading,
    error,
    lastUpdated,
    fetchPriceData,
    refreshInterval,
    setRefreshInterval,
    performanceMetrics,
    isCalculatingMetrics,
    oracleDataError,
    retryConfig,
    setRetryConfig,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,
    getMemoryStats,
    clearHistoryData,
    getDetailedMemoryStats,
    queryProgress,
  };
}

export default useOracleData;
