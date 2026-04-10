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
  // 使用 Map 存储每个 provider 的 AbortController，避免共享问题
  const abortControllersRef = useRef<Map<OracleProvider, AbortController>>(new Map());
  // 用于 retryAllFailed 的独立 AbortController
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const isRetrying = retryingOracles.length > 0;

  const setRetryConfig = useCallback((config: Partial<RetryConfig>) => {
    setRetryConfigState((prev) => ({ ...prev, ...config }));
  }, []);

  const delay = useCallback((ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const cancelRetry = useCallback(() => {
    // 取消所有单个重试
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    // 取消批量重试
    if (batchAbortControllerRef.current) {
      batchAbortControllerRef.current.abort();
      batchAbortControllerRef.current = null;
    }
    setRetryingOracles([]);
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

      // 取消该 provider 之前的重试请求
      const existingController = abortControllersRef.current.get(provider);
      if (existingController) {
        existingController.abort();
      }

      // 创建新的 AbortController
      const abortController = new AbortController();
      abortControllersRef.current.set(provider, abortController);
      const signal = abortController.signal;

      const hours = getHoursForTimeRange(timeRange) ?? 24;
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

        const result = await fetchSingleOracle(
          provider as PriceOracleProvider,
          baseSymbol,
          hours,
          signal
        );

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
        // 清理该 provider 的 AbortController
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

      // 取消之前的批量重试
      if (batchAbortControllerRef.current) {
        batchAbortControllerRef.current.abort();
      }
      batchAbortControllerRef.current = new AbortController();
      const signal = batchAbortControllerRef.current.signal;

      const hours = getHoursForTimeRange(timeRange) ?? 24;
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

          return fetchSingleOracle(provider as PriceOracleProvider, baseSymbol, hours, signal);
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

      // 清理批量 AbortController
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

export default useOracleRetry;
