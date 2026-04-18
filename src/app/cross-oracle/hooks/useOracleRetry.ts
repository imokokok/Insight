import { useState, useCallback, useRef } from 'react';

import { getHoursForTimeRange, extractBaseSymbol } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { type TimeRange, timeRangeToValue } from '../constants';

import type { OracleErrorInfo, OracleDataError, RetryConfig } from '../types';

const logger = createLogger('useOracleRetry');

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
};

interface UseOracleRetryOptions {
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;
  initialRetryConfig?: Partial<RetryConfig>;
  fetchSingleOracle: (
    oracle: OracleProvider,
    baseSymbol: string,
    hours: number,
    signal: AbortSignal
  ) => Promise<{ price: PriceData; history: PriceData[] } | null>;
  onPriceDataUpdate: (
    provider: OracleProvider,
    data: { price: PriceData; history: PriceData[] }
  ) => void;
  onErrorUpdate: (provider: OracleProvider, error: OracleErrorInfo | null) => void;
}

interface UseOracleRetryReturn {
  retryConfig: RetryConfig;
  setRetryConfig: (config: Partial<RetryConfig>) => void;
  retryOracle: (provider: OracleProvider) => Promise<void>;
  retryAllFailed: (oracleDataError: OracleDataError) => Promise<void>;
  isRetrying: boolean;
  retryingOracles: OracleProvider[];
  cancelRetry: () => void;
}

export function useOracleRetry({
  selectedOracles,
  selectedSymbol,
  timeRange,
  initialRetryConfig,
  fetchSingleOracle,
  onPriceDataUpdate,
  onErrorUpdate,
}: UseOracleRetryOptions): UseOracleRetryReturn {
  const [retryConfig, setRetryConfigState] = useState<RetryConfig>({
    ...DEFAULT_RETRY_CONFIG,
    ...initialRetryConfig,
  });
  const [retryingOracles, setRetryingOracles] = useState<OracleProvider[]>([]);
  const retryAttemptsRef = useRef<Map<OracleProvider, number>>(new Map());
  // Use Map to store each provider's AbortController, avoiding shared state issues
  const abortControllersRef = useRef<Map<OracleProvider, AbortController>>(new Map());
  // Separate AbortController for retryAllFailed
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const isRetrying = retryingOracles.length > 0;

  const setRetryConfig = useCallback((config: Partial<RetryConfig>) => {
    setRetryConfigState((prev) => ({ ...prev, ...config }));
  }, []);

  const delay = useCallback((ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const cancelRetry = useCallback(() => {
    // Cancel all individual retries
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    // Cancel batch retry
    if (batchAbortControllerRef.current) {
      batchAbortControllerRef.current.abort();
      batchAbortControllerRef.current = null;
    }
    setRetryingOracles([]);
  }, []);

  const retryOracle = useCallback(
    async (provider: OracleProvider) => {
      if (!selectedOracles.includes(provider)) {
        logger.warn(`Oracle ${provider} is not in selected oracles`);
        return;
      }

      const currentAttempts = retryAttemptsRef.current.get(provider) || 0;
      if (currentAttempts >= retryConfig.maxRetries) {
        logger.warn(`Max retries reached for ${provider}`);
        return;
      }

      setRetryingOracles((prev) => [...prev, provider]);

      // Cancel previous retry request for this provider
      const existingController = abortControllersRef.current.get(provider);
      if (existingController) {
        existingController.abort();
      }

      // Create new AbortController
      const abortController = new AbortController();
      abortControllersRef.current.set(provider, abortController);
      const signal = abortController.signal;

      const hours = getHoursForTimeRange(timeRangeToValue(timeRange)) ?? 24;
      const baseSymbol = extractBaseSymbol(selectedSymbol);

      try {
        const delayMs = retryConfig.exponentialBackoff
          ? retryConfig.retryDelay * Math.pow(2, currentAttempts)
          : retryConfig.retryDelay;

        await delay(delayMs);

        if (signal.aborted) {
          logger.info(`Retry cancelled for ${provider}`);
          return;
        }

        const result = await fetchSingleOracle(provider, baseSymbol, hours, signal);

        if (result && !signal.aborted) {
          onPriceDataUpdate(provider, result);
          retryAttemptsRef.current.delete(provider);
          logger.info(`Successfully retried ${provider}`);
        }
      } catch (err) {
        if (signal.aborted) {
          logger.info(`Retry cancelled for ${provider}`);
          return;
        }
        retryAttemptsRef.current.set(provider, currentAttempts + 1);
        logger.error(
          `Retry failed for ${provider}`,
          err instanceof Error ? err : new Error(String(err))
        );

        const errorInfo: OracleErrorInfo = {
          provider,
          errorType: 'unknown',
          message: err instanceof Error ? err.message : String(err),
          originalError: err instanceof Error ? err : undefined,
          retryable: true,
          timestamp: Date.now(),
        };
        onErrorUpdate(provider, errorInfo);
      } finally {
        // Clean up this provider's AbortController
        abortControllersRef.current.delete(provider);
        setRetryingOracles((prev) => prev.filter((o) => o !== provider));
      }
    },
    [
      selectedOracles,
      selectedSymbol,
      timeRange,
      retryConfig,
      delay,
      fetchSingleOracle,
      onPriceDataUpdate,
      onErrorUpdate,
    ]
  );

  const retryAllFailed = useCallback(
    async (oracleDataError: OracleDataError) => {
      const failedOracles = oracleDataError.partialSuccess?.failedOracles || [];
      if (failedOracles.length === 0) {
        return;
      }

      setRetryingOracles(failedOracles);

      // Cancel previous batch retry
      if (batchAbortControllerRef.current) {
        batchAbortControllerRef.current.abort();
      }
      batchAbortControllerRef.current = new AbortController();
      const signal = batchAbortControllerRef.current.signal;

      const hours = getHoursForTimeRange(timeRangeToValue(timeRange)) ?? 24;
      const baseSymbol = extractBaseSymbol(selectedSymbol);

      const results = await Promise.allSettled(
        failedOracles.map(async (provider) => {
          if (signal.aborted) return null;

          const currentAttempts = retryAttemptsRef.current.get(provider) || 0;
          const delayMs = retryConfig.exponentialBackoff
            ? retryConfig.retryDelay * Math.pow(2, currentAttempts)
            : retryConfig.retryDelay;

          await delay(delayMs);

          if (signal.aborted) return null;

          return fetchSingleOracle(provider, baseSymbol, hours, signal);
        })
      );

      if (signal.aborted) {
        logger.info('Retry all cancelled');
        setRetryingOracles([]);
        return;
      }

      results.forEach((result, index) => {
        const provider = failedOracles[index];
        if (result.status === 'fulfilled' && result.value) {
          onPriceDataUpdate(provider, result.value);
          retryAttemptsRef.current.delete(provider);
        } else if (result.status !== 'fulfilled' || result.value === null) {
          const error = result.status === 'rejected' ? result.reason : new Error('Unknown error');
          const errorInfo: OracleErrorInfo = {
            provider,
            errorType: 'unknown',
            message: error instanceof Error ? error.message : String(error),
            originalError: error instanceof Error ? error : undefined,
            retryable: true,
            timestamp: Date.now(),
          };
          onErrorUpdate(provider, errorInfo);
          retryAttemptsRef.current.set(provider, (retryAttemptsRef.current.get(provider) || 0) + 1);
        }
      });

      // Clean up batch AbortController
      batchAbortControllerRef.current = null;
      setRetryingOracles([]);
    },
    [
      selectedSymbol,
      timeRange,
      retryConfig,
      delay,
      fetchSingleOracle,
      onPriceDataUpdate,
      onErrorUpdate,
    ]
  );

  return {
    retryConfig,
    setRetryConfig,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,
    cancelRetry,
  };
}
