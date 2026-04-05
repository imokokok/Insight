import { useState, useCallback, useRef } from 'react';

import { getHoursForTimeRange, extractBaseSymbol } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import type { OracleProvider, PriceData } from '@/types/oracle';

import type { TimeRange, PriceOracleProvider } from '../constants';
import type { OracleErrorInfo, OracleDataError, RetryConfig } from '../types';

const logger = createLogger('useOracleRetry');

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
};

interface UseOracleRetryOptions {
  selectedOracles: PriceOracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;
  initialRetryConfig?: Partial<RetryConfig>;
  fetchSingleOracle: (
    oracle: PriceOracleProvider,
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
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryingOracles, setRetryingOracles] = useState<OracleProvider[]>([]);
  const retryAttemptsRef = useRef<Map<OracleProvider, number>>(new Map());

  const setRetryConfig = useCallback((config: Partial<RetryConfig>) => {
    setRetryConfigState((prev) => ({ ...prev, ...config }));
  }, []);

  const delay = useCallback((ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const retryOracle = useCallback(
    async (provider: OracleProvider) => {
      if (!selectedOracles.includes(provider as PriceOracleProvider)) {
        logger.warn(`Oracle ${provider} is not in selected oracles`);
        return;
      }

      const currentAttempts = retryAttemptsRef.current.get(provider) || 0;
      if (currentAttempts >= retryConfig.maxRetries) {
        logger.warn(`Max retries reached for ${provider}`);
        return;
      }

      setRetryingOracles((prev) => [...prev, provider]);
      setIsRetrying(true);

      const hours = getHoursForTimeRange(timeRange) ?? 24;
      const baseSymbol = extractBaseSymbol(selectedSymbol);

      try {
        const delayMs = retryConfig.exponentialBackoff
          ? retryConfig.retryDelay * Math.pow(2, currentAttempts)
          : retryConfig.retryDelay;

        await delay(delayMs);

        const result = await fetchSingleOracle(
          provider as PriceOracleProvider,
          baseSymbol,
          hours,
          new AbortController().signal
        );

        if (result) {
          onPriceDataUpdate(provider, result);
          retryAttemptsRef.current.delete(provider);
          logger.info(`Successfully retried ${provider}`);
        }
      } catch (err) {
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
        setRetryingOracles((prev) => prev.filter((o) => o !== provider));
        setIsRetrying(false);
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

      setIsRetrying(true);
      setRetryingOracles(failedOracles);

      const hours = getHoursForTimeRange(timeRange) ?? 24;
      const baseSymbol = extractBaseSymbol(selectedSymbol);

      const results = await Promise.allSettled(
        failedOracles.map(async (provider) => {
          const currentAttempts = retryAttemptsRef.current.get(provider) || 0;
          const delayMs = retryConfig.exponentialBackoff
            ? retryConfig.retryDelay * Math.pow(2, currentAttempts)
            : retryConfig.retryDelay;

          await delay(delayMs);
          return fetchSingleOracle(
            provider as PriceOracleProvider,
            baseSymbol,
            hours,
            new AbortController().signal
          );
        })
      );

      results.forEach((result, index) => {
        const provider = failedOracles[index];
        if (result.status === 'fulfilled' && result.value) {
          onPriceDataUpdate(provider, result.value);
          retryAttemptsRef.current.delete(provider);
        } else {
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

      setIsRetrying(false);
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
  };
}

export default useOracleRetry;
