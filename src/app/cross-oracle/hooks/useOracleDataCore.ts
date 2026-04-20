import { useState, useEffect, useCallback, useRef } from 'react';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { extractBaseSymbol } from '@/lib/oracles';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { createLogger } from '@/lib/utils/logger';
import { getRequestQueue, type RequestPriority } from '@/lib/utils/requestQueue';
import { OracleProvider, type PriceData } from '@/types/oracle';

import { type TimeRange, type RefreshInterval } from '../constants';

import { createOracleErrorInfo } from './useOracleErrorHandling';
import { useOracleRetry } from './useOracleRetry';

import type { OracleErrorInfo, OracleDataError, PartialSuccessState, RetryConfig } from '../types';
import type { UseOracleErrorHandlingReturn } from './useOracleErrorHandling';
import type { PriceHistoryMap, UseOracleMemoryReturn } from './useOracleMemory';
import type { UseOraclePerformanceReturn } from './useOraclePerformance';

const logger = createLogger('useOracleData');

const providerToSymbolKey: Record<OracleProvider, keyof typeof oracleSupportedSymbols> = {
  [OracleProvider.CHAINLINK]: 'chainlink',
  [OracleProvider.PYTH]: 'pyth',
  [OracleProvider.API3]: 'api3',
  [OracleProvider.REDSTONE]: 'redstone',
  [OracleProvider.DIA]: 'dia',
  [OracleProvider.WINKLINK]: 'winklink',
  [OracleProvider.SUPRA]: 'supra',
  [OracleProvider.TWAP]: 'twap',
  [OracleProvider.REFLECTOR]: 'reflector',
  [OracleProvider.FLARE]: 'flare',
};

interface UseOracleDataCoreOptions {
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;
  initialRefreshInterval?: RefreshInterval;
  enablePerformanceMetrics?: boolean;
  initialRetryConfig?: Partial<RetryConfig>;
  requestTimeout?: number;
  requestPriority?: RequestPriority;
}

interface UseOracleDataCoreReturn {
  priceData: PriceData[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  fetchPriceData: () => Promise<void>;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
  oracleDataError: OracleDataError;
  retryConfig: RetryConfig;
  setRetryConfig: (config: Partial<RetryConfig>) => void;
  retryOracle: (provider: OracleProvider) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  isRetrying: boolean;
  retryingOracles: OracleProvider[];
  queryProgress: { completed: number; total: number };
  skippedOracles: OracleProvider[];
  lastRefreshedAt: Date | null;
  nextRefreshAt: Date | null;
}

export function useOracleDataCore(
  options: UseOracleDataCoreOptions,
  errorHandling: UseOracleErrorHandlingReturn,
  performance: UseOraclePerformanceReturn,
  memory: UseOracleMemoryReturn
): UseOracleDataCoreReturn {
  const {
    selectedOracles,
    selectedSymbol,
    timeRange: _timeRange,
    initialRefreshInterval = 'off',
    enablePerformanceMetrics = true,
    initialRetryConfig,
    requestTimeout,
    requestPriority = 'normal',
  } = options;

  const {
    oracleDataError,
    setOracleDataError,
    handleProviderSuccess,
    handleProviderError,
    resetErrors,
  } = errorHandling;

  const { calculatePerformanceMetrics, recordSuccessfulFetch, recordFailedFetch } = performance;

  const { priceHistoryMapRef, clearHistoryData } = memory;

  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(initialRefreshInterval);
  const [queryProgress, setQueryProgress] = useState({ completed: 0, total: 0 });
  const [skippedOracles, setSkippedOracles] = useState<OracleProvider[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const prevDepsRef = useRef<{
    selectedOracles: OracleProvider[];
    selectedSymbol: string;
  }>({
    selectedOracles: [],
    selectedSymbol: '',
  });
  const isInitialMountRef = useRef(true);

  const fetchSingleOracle = useCallback(
    async (
      oracle: OracleProvider,
      baseSymbol: string,
      signal: AbortSignal
    ): Promise<PriceData | null> => {
      const requestStart = Date.now();
      const requestQueue = getRequestQueue();

      try {
        const price = await requestQueue.add(
          () =>
            oracleApiClient.fetchPrice({
              provider: oracle,
              symbol: baseSymbol,
            }),
          {
            priority: requestPriority,
            timeout: requestTimeout,
            abortSignal: signal,
          }
        );

        if (signal.aborted) {
          return null;
        }

        const responseTime = Date.now() - requestStart;

        recordSuccessfulFetch(
          oracle,
          baseSymbol,
          price,
          responseTime,
          priceHistoryMapRef as React.MutableRefObject<PriceHistoryMap>,
          isMountedRef
        );

        return price;
      } catch (err) {
        const responseTime = Date.now() - requestStart;
        logger.error(
          `Error fetching data from ${oracle}`,
          err instanceof Error ? err : new Error(String(err))
        );

        recordFailedFetch(
          oracle,
          baseSymbol,
          responseTime,
          priceHistoryMapRef as React.MutableRefObject<PriceHistoryMap>
        );

        throw err;
      }
    },
    [requestTimeout, requestPriority, recordSuccessfulFetch, recordFailedFetch, priceHistoryMapRef]
  );

  const handlePriceDataUpdate = useCallback(
    (provider: OracleProvider, price: PriceData) => {
      setPriceData((prev) => {
        const filtered = prev.filter((p) => p.provider !== provider);
        return [...filtered, price];
      });

      handleProviderSuccess(provider, selectedOracles.length);
    },
    [selectedOracles.length, handleProviderSuccess]
  );

  const handleErrorUpdate = useCallback(
    (provider: OracleProvider, errorInfo: OracleErrorInfo | null) => {
      handleProviderError(provider, errorInfo);
    },
    [handleProviderError]
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
    resetErrors();
    clearHistoryData();
    setQueryProgress({ completed: 0, total: selectedOracles.length });

    const baseSymbol = extractBaseSymbol(selectedSymbol);

    const skipped: OracleProvider[] = [];
    const oraclesToFetch = selectedOracles.filter((oracle) => {
      const key = providerToSymbolKey[oracle];
      const supportedSymbols = oracleSupportedSymbols[key];
      const isSupported = (supportedSymbols as readonly string[]).includes(baseSymbol);
      if (!isSupported) {
        skipped.push(oracle);
      }
      return isSupported;
    });

    setSkippedOracles(skipped);
    setQueryProgress({ completed: 0, total: oraclesToFetch.length });

    try {
      const fetchResults = await Promise.all(
        oraclesToFetch.map(async (oracle) => {
          try {
            const price = await fetchSingleOracle(oracle, baseSymbol, signal);
            if (price && isMountedRef.current) {
              return {
                type: 'success' as const,
                oracle,
                price,
              };
            }
            return { type: 'empty' as const };
          } catch (err) {
            if (!signal.aborted && isMountedRef.current) {
              return { type: 'error' as const, error: createOracleErrorInfo(oracle, err) };
            }
            return { type: 'empty' as const };
          } finally {
            if (isMountedRef.current) {
              setQueryProgress((prev) => ({
                completed: prev.completed + 1,
                total: oraclesToFetch.length,
              }));
            }
          }
        })
      );

      if (signal.aborted || !isMountedRef.current) {
        return;
      }

      const prices = fetchResults
        .filter(
          (r): r is { type: 'success'; oracle: OracleProvider; price: PriceData } =>
            r.type === 'success'
        )
        .map((r) => r.price);

      const errors = fetchResults
        .filter((r): r is { type: 'error'; error: OracleErrorInfo } => r.type === 'error')
        .map((r) => r.error);

      const successOracles = prices.map((p) => p.provider);
      const failedOracles = oraclesToFetch.filter(
        (o) => !successOracles.includes(o as OracleProvider)
      ) as OracleProvider[];

      const partialSuccess: PartialSuccessState | null =
        failedOracles.length > 0 && successOracles.length > 0
          ? {
              isSuccess: successOracles.length > 0,
              successCount: successOracles.length,
              failedCount: failedOracles.length,
              totalCount: oraclesToFetch.length,
              failedOracles,
              successOracles,
            }
          : null;

      const isPartialSuccess = partialSuccess !== null;
      const hasError = errors.length > 0;

      setPriceData(prices);
      setLastUpdated(new Date());
      setOracleDataError({
        hasError,
        isPartialSuccess,
        partialSuccess,
        errors,
        globalError:
          failedOracles.length === oraclesToFetch.length
            ? new Error('All oracles failed to fetch data')
            : null,
      });

      if (enablePerformanceMetrics) {
        calculatePerformanceMetrics(
          selectedOracles,
          selectedSymbol,
          priceHistoryMapRef as React.MutableRefObject<PriceHistoryMap>,
          isMountedRef
        );
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
    enablePerformanceMetrics,
    calculatePerformanceMetrics,
    fetchSingleOracle,
    resetErrors,
    setOracleDataError,
    priceHistoryMapRef,
    clearHistoryData,
  ]);

  const fetchPriceDataRef = useRef(fetchPriceData);
  fetchPriceDataRef.current = fetchPriceData;

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const currentKey = `${selectedOracles.slice().sort().join(',')}_${selectedSymbol}`;
    const prevKey = `${prevDepsRef.current.selectedOracles.slice().sort().join(',')}_${prevDepsRef.current.selectedSymbol}`;

    const depsChanged = isInitialMountRef.current || currentKey !== prevKey;

    if (depsChanged) {
      prevDepsRef.current = { selectedOracles, selectedSymbol };
      isInitialMountRef.current = false;
      resetErrors();
      setError(null);
      fetchPriceDataRef.current();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedOracles, selectedSymbol, resetErrors]);

  useEffect(() => {
    if (refreshInterval === 'off') {
      setNextRefreshAt(null);
      return;
    }

    const intervalMs =
      refreshInterval === '10s'
        ? 10000
        : refreshInterval === '30s'
          ? 30000
          : refreshInterval === '1m'
            ? 60000
            : refreshInterval === '5m'
              ? 300000
              : 0;

    if (intervalMs === 0) {
      setNextRefreshAt(null);
      return;
    }

    setNextRefreshAt(new Date(Date.now() + intervalMs));

    const intervalId = setInterval(() => {
      if (!document.hidden && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        fetchPriceDataRef
          .current()
          .then(() => {
            if (isMountedRef.current) {
              const now = new Date();
              setLastRefreshedAt(now);
              setNextRefreshAt(new Date(now.getTime() + intervalMs));
            }
          })
          .catch(() => {})
          .finally(() => {
            isRefreshingRef.current = false;
          });
      }
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        fetchPriceDataRef
          .current()
          .then(() => {
            if (isMountedRef.current) {
              const now = new Date();
              setLastRefreshedAt(now);
              setNextRefreshAt(new Date(now.getTime() + intervalMs));
            }
          })
          .catch(() => {})
          .finally(() => {
            isRefreshingRef.current = false;
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshInterval]);

  return {
    priceData,
    isLoading,
    error,
    lastUpdated,
    fetchPriceData,
    refreshInterval,
    setRefreshInterval,
    oracleDataError,
    retryConfig,
    setRetryConfig,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,
    queryProgress,
    skippedOracles,
    lastRefreshedAt,
    nextRefreshAt,
  };
}
