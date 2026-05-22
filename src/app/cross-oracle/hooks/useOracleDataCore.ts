import { useState, useEffect, useCallback, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { extractBaseSymbol } from '@/lib/oracles';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { priceKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/utils/logger';
import { getRequestQueue, type RequestPriority } from '@/lib/utils/requestQueue';
import { OracleProvider, type PriceData } from '@/types/oracle';

import { type RefreshInterval } from '../constants';

import { useOracleAutoRefresh } from './useOracleAutoRefresh';
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

const CACHE_STALE_MS = 15_000;

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
    initialRefreshInterval = 0,
    enablePerformanceMetrics = true,
    initialRetryConfig,
    requestTimeout,
    requestPriority = 'normal',
  } = options;

  const queryClient = useQueryClient();

  const {
    oracleDataError,
    setOracleDataError,
    handleProviderSuccess,
    handleProviderError,
    resetErrors,
  } = errorHandling;

  const { calculatePerformanceMetrics, recordSuccessfulFetch, recordFailedFetch } = performance;

  const { priceHistoryMapRef } = memory;

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
      forceRefresh: boolean = false
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
    async (forceRefresh: boolean = false) => {
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

      if (!forceRefresh) {
        const cachedPrices: PriceData[] = [];
        const uncachedOracles: OracleProvider[] = [];

        for (const oracle of oraclesToFetch) {
          const queryKey = priceKeys.byProvider(oracle, baseSymbol, '');
          const cached = queryClient.getQueryData<PriceData>(queryKey);
          if (cached && Date.now() - cached.timestamp < CACHE_STALE_MS) {
            cachedPrices.push(cached);
          } else {
            uncachedOracles.push(oracle);
          }
        }

        if (cachedPrices.length > 0) {
          setPriceData(cachedPrices);
          setLastUpdated(new Date());
          setIsLoading(uncachedOracles.length > 0);
        }

        if (uncachedOracles.length === 0 && cachedPrices.length > 0) {
          setIsLoading(false);

          const partialSuccess: PartialSuccessState | null =
            skipped.length > 0
              ? {
                  isSuccess: true,
                  successCount: cachedPrices.length,
                  failedCount: 0,
                  totalCount: oraclesToFetch.length,
                  failedOracles: [],
                  successOracles: cachedPrices.map((p) => p.provider as OracleProvider),
                }
              : null;

          setOracleDataError({
            hasError: false,
            isPartialSuccess: partialSuccess !== null,
            partialSuccess,
            errors: [],
            globalError: null,
          });

          if (enablePerformanceMetrics) {
            calculatePerformanceMetrics(
              selectedOracles,
              selectedSymbol,
              priceHistoryMapRef as React.MutableRefObject<PriceHistoryMap>,
              isMountedRef
            );
          }
          return;
        }

        if (uncachedOracles.length < oraclesToFetch.length) {
          setQueryProgress({
            completed: cachedPrices.length,
            total: oraclesToFetch.length,
          });
        }
      }

      const oraclesToFetchNow = forceRefresh
        ? oraclesToFetch
        : oraclesToFetch.filter((oracle) => {
            const queryKey = priceKeys.byProvider(oracle, baseSymbol, '');
            const cached = queryClient.getQueryData<PriceData>(queryKey);
            return !cached || Date.now() - cached.timestamp >= CACHE_STALE_MS;
          });

      try {
        const fetchResults = await Promise.all(
          oraclesToFetchNow.map(async (oracle) => {
            try {
              const price = await fetchSingleOracle(oracle, baseSymbol, signal, forceRefresh);
              if (price && isMountedRef.current) {
                const queryKey = priceKeys.byProvider(oracle, baseSymbol, '');
                queryClient.setQueryData(queryKey, price, { updatedAt: Date.now() });

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

        const newPrices = fetchResults
          .filter(
            (r): r is { type: 'success'; oracle: OracleProvider; price: PriceData } =>
              r.type === 'success'
          )
          .map((r) => r.price);

        const errors = fetchResults
          .filter((r): r is { type: 'error'; error: OracleErrorInfo } => r.type === 'error')
          .map((r) => r.error);

        if (!forceRefresh) {
          const existingCached = queryClient.getQueriesData<PriceData>({
            queryKey: priceKeys.all,
          });
          for (const [, data] of existingCached) {
            if (data && !newPrices.some((p) => p.provider === data.provider)) {
              newPrices.push(data);
            }
          }
        }

        const successOracles = newPrices.map((p) => p.provider);
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

        setPriceData(newPrices);
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
        if (isMountedRef.current && abortControllerRef.current === currentAbortController) {
          setIsLoading(false);
        }
      }
    },
    [
      selectedOracles,
      selectedSymbol,
      enablePerformanceMetrics,
      calculatePerformanceMetrics,
      fetchSingleOracle,
      resetErrors,
      setOracleDataError,
      priceHistoryMapRef,
      queryClient,
    ]
  );

  const fetchPriceDataRef = useRef(fetchPriceData);
  fetchPriceDataRef.current = fetchPriceData;

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

  const { lastRefreshedAt, nextRefreshAt } = useOracleAutoRefresh({
    refreshInterval,
    onRefresh: () => fetchPriceData(false),
    isMountedRef,
  });

  return {
    priceData,
    isLoading,
    error,
    lastUpdated,
    fetchPriceData: () => fetchPriceData(true),
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
