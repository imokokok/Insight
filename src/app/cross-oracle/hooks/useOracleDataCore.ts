import { useState, useEffect, useCallback, useRef } from 'react';

import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { extractBaseSymbol } from '@/lib/oracles/client';
import { TTLCache } from '@/lib/utils/cache';
import { createLogger } from '@/lib/utils/logger';
import { getRequestQueue, type RequestPriority } from '@/lib/utils/requestQueue';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { type RefreshInterval } from '../constants';

import { useOracleAutoRefresh } from './useOracleAutoRefresh';
import { createOracleErrorInfo } from './useOracleErrorHandling';
import { useOracleRetry } from './useOracleRetry';

import type { OracleErrorInfo, OracleDataError, PartialSuccessState, RetryConfig } from '../types';
import type { UseOracleErrorHandlingReturn } from './useOracleErrorHandling';
import type { PriceHistoryMap, UseOracleMemoryReturn } from './useOracleMemory';
import type { UseOraclePerformanceReturn } from './useOraclePerformance';

const logger = createLogger('useOracleData');

// Module-level cache so that navigating away from cross-oracle and back
// restores the previous price snapshot immediately while a fresh fetch is
// in flight (stale-while-revalidate style). Previously the component lost all
// state on unmount and showed an empty loading state every time.
const priceSnapshotCache = new TTLCache({ maxSize: 20, cleanupIntervalMs: 0 });
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

function snapshotCacheKey(oracles: OracleProvider[], symbol: string): string {
  return `${oracles.slice().sort().join(',')}:${symbol}`;
}

interface UseOracleDataCoreOptions {
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
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
  fetchPriceData: (forceRefresh?: boolean) => Promise<void>;
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
    initialRefreshInterval = 0,
    enablePerformanceMetrics = true,
    initialRetryConfig,
    requestTimeout,
    requestPriority = 'normal',
  } = options;

  const { oracleSymbols } = useDynamicSymbols();
  // Whether the dynamic symbol map has been resolved. On cold cache this starts
  // false and flips to true once /api/symbols returns. We must not trigger the
  // price fetch before this is ready, otherwise every oracle is filtered out
  // as "unsupported" and no prices are requested.
  const oracleSymbolsReady = !!oracleSymbols && Object.keys(oracleSymbols).length > 0;

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
      signal: AbortSignal,
      forceRefresh = false
    ): Promise<PriceData | null> => {
      const requestStart = Date.now();
      const requestQueue = getRequestQueue();

      try {
        const price = await requestQueue.add(
          () =>
            oracleApiClient.fetchPrice({
              provider: oracle,
              symbol: baseSymbol,
              forceRefresh,
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

  const fetchPriceData = useCallback(
    async (forceRefresh = false) => {
      if (selectedOracles.length === 0) {
        setPriceData([]);
        setQueryProgress({ completed: 0, total: 0 });
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const currentAbortController = new AbortController();
      abortControllerRef.current = currentAbortController;
      const signal = currentAbortController.signal;

      setIsLoading(true);
      setError(null);
      resetErrors();
      clearHistoryData();

      const baseSymbol = extractBaseSymbol(selectedSymbol);

      const skipped: OracleProvider[] = [];
      const oraclesToFetch = selectedOracles.filter((oracle) => {
        const supportedSymbols = oracleSymbols[oracle] || [];
        const isSupported = supportedSymbols.includes(baseSymbol);
        if (!isSupported) {
          skipped.push(oracle);
        }
        return isSupported;
      });

      setSkippedOracles(skipped);
      setQueryProgress({ completed: 0, total: oraclesToFetch.length });

      if (oraclesToFetch.length === 0) {
        setPriceData([]);
        setIsLoading(false);
        return;
      }

      try {
        // ---- Fast path: single batch request for all oracles ----
        setQueryProgress({ completed: 0, total: oraclesToFetch.length });

        const batchStart = Date.now();
        let prices: PriceData[] = [];
        let batchErrors: Array<{ provider: string; error: string }> = [];
        let usedBatch = false;

        try {
          const batchResult = await oracleApiClient.fetchMultiOraclePrices({
            providers: oraclesToFetch,
            symbol: baseSymbol,
            signal,
            forceRefresh,
          });

          if (!signal.aborted && isMountedRef.current) {
            usedBatch = true;
            prices = batchResult.prices;
            batchErrors = batchResult.errors;

            const batchResponseTime = Date.now() - batchStart;
            for (const price of prices) {
              recordSuccessfulFetch(
                price.provider as OracleProvider,
                baseSymbol,
                price,
                batchResponseTime,
                priceHistoryMapRef as React.MutableRefObject<PriceHistoryMap>,
                isMountedRef
              );
            }
            for (const err of batchErrors) {
              recordFailedFetch(
                err.provider as OracleProvider,
                baseSymbol,
                batchResponseTime,
                priceHistoryMapRef as React.MutableRefObject<PriceHistoryMap>
              );
            }
            setQueryProgress({ completed: oraclesToFetch.length, total: oraclesToFetch.length });
          }
        } catch {
          logger.warn('Batch fetch failed, falling back to individual requests');
        }

        // ---- Fallback: individual requests if batch didn't succeed ----
        if (!usedBatch && !signal.aborted) {
          const fetchResults = await Promise.all(
            oraclesToFetch.map(async (oracle) => {
              try {
                const price = await fetchSingleOracle(oracle, baseSymbol, signal, forceRefresh);
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

          prices = fetchResults
            .filter(
              (r): r is { type: 'success'; oracle: OracleProvider; price: PriceData } =>
                r.type === 'success'
            )
            .map((r) => r.price);

          const fetchErrors = fetchResults
            .filter((r): r is { type: 'error'; error: OracleErrorInfo } => r.type === 'error')
            .map((r) => r.error);

          batchErrors = fetchErrors.map((e) => ({
            provider: e.provider,
            error: e.message,
          }));
        }

        if (signal.aborted || !isMountedRef.current) {
          return;
        }

        const successOracles = prices.map((p) => p.provider as OracleProvider);
        const failedOracles = oraclesToFetch.filter(
          (o) => !successOracles.includes(o)
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
        const hasError = batchErrors.length > 0;

        const errorInfos: OracleErrorInfo[] = batchErrors.map((e) => ({
          provider: e.provider as OracleProvider,
          errorType: 'server_error' as const,
          message: e.error,
          retryable: true,
          timestamp: Date.now(),
        }));

        setPriceData(prices);
        setLastUpdated(new Date());
        priceSnapshotCache.set(
          snapshotCacheKey(selectedOracles, selectedSymbol),
          prices,
          SNAPSHOT_TTL_MS
        );
        setOracleDataError({
          hasError,
          isPartialSuccess,
          partialSuccess,
          errors: errorInfos,
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
        if (isMountedRef.current && abortControllerRef.current === currentAbortController) {
          setIsLoading(false);
        }
      }
    },
    [
      selectedOracles,
      selectedSymbol,
      oracleSymbols,
      enablePerformanceMetrics,
      calculatePerformanceMetrics,
      fetchSingleOracle,
      resetErrors,
      setOracleDataError,
      priceHistoryMapRef,
      clearHistoryData,
      recordSuccessfulFetch,
      recordFailedFetch,
    ]
  );

  const fetchPriceDataRef = useRef(fetchPriceData);
  fetchPriceDataRef.current = fetchPriceData;

  useEffect(() => {
    isMountedRef.current = true;

    // Wait for the dynamic symbol map before fetching. Without this, on cold
    // cache every selected oracle is classified as "unsupported" (because
    // oracleSymbols is empty) and the fetch returns no data. Once symbols
    // arrive, this effect re-runs (oracleSymbolsReady is a dep) and the real
    // fetch fires automatically.
    if (!oracleSymbolsReady) {
      return;
    }

    const currentKey = `${selectedOracles.slice().sort().join(',')}_${selectedSymbol}`;
    const prevKey = `${prevDepsRef.current.selectedOracles.slice().sort().join(',')}_${prevDepsRef.current.selectedSymbol}`;

    const depsChanged = currentKey !== prevKey;

    if (
      depsChanged ||
      (isInitialMountRef.current && selectedOracles.length > 0 && selectedSymbol)
    ) {
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
      }
      prevDepsRef.current = { selectedOracles, selectedSymbol };

      // Restore the last snapshot for this oracle/symbol combo so the UI
      // shows stale data immediately instead of an empty loading state.
      const snapshot = priceSnapshotCache.get<PriceData[]>(
        snapshotCacheKey(selectedOracles, selectedSymbol)
      );
      if (snapshot && snapshot.length > 0 && isMountedRef.current) {
        setPriceData(snapshot);
        setLastUpdated(new Date());
      }

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
  }, [selectedOracles, selectedSymbol, oracleSymbolsReady, resetErrors]);

  const { lastRefreshedAt, nextRefreshAt } = useOracleAutoRefresh({
    refreshInterval,
    onRefresh: fetchPriceData,
    isMountedRef,
  });

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
