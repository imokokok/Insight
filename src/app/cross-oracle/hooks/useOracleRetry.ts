import { useState, useCallback, useRef } from 'react';

import { extractBaseSymbol } from '@/lib/oracles';
import { calculateRetryDelay, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { createLogger } from '@/lib/utils/logger';
import type { OracleProvider, PriceData } from '@/types/oracle';

import type { OracleErrorInfo, OracleDataError, RetryConfig } from '../types';

const logger = createLogger('useOracleRetry');

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: ORACLE_RETRY_PRESETS.standard.maxAttempts,
  baseDelay: ORACLE_RETRY_PRESETS.standard.baseDelay,
  maxDelay: ORACLE_RETRY_PRESETS.standard.maxDelay,
  backoffMultiplier: ORACLE_RETRY_PRESETS.standard.backoffMultiplier,
  timeout: ORACLE_RETRY_PRESETS.standard.timeout,
};

interface UseOracleRetryOptions {
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  initialRetryConfig?: Partial<RetryConfig>;
  fetchSingleOracle: (
    oracle: OracleProvider,
    baseSymbol: string,
    signal: AbortSignal
  ) => Promise<PriceData | null>;
  onPriceDataUpdate: (provider: OracleProvider, price: PriceData) => void;
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
  const abortControllersRef = useRef<Map<OracleProvider, AbortController>>(new Map());
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const isRetrying = retryingOracles.length > 0;

  const setRetryConfig = useCallback((config: Partial<RetryConfig>) => {
    setRetryConfigState((prev) => ({ ...prev, ...config }));
  }, []);

  const delay = useCallback((ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const cancelRetry = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    if (batchAbortControllerRef.current) {
      batchAbortControllerRef.current.abort();
      batchAbortControllerRef.current = null;
    }
    retryAttemptsRef.current.clear();
    setRetryingOracles([]);
  }, []);

  const retryOracle = useCallback(
    async (provider: OracleProvider) => {
      if (!selectedOracles.includes(provider)) {
        logger.warn(`Oracle ${provider} is not in selected oracles`);
        return;
      }

      const currentAttempts = retryAttemptsRef.current.get(provider) || 0;
      if (currentAttempts >= (retryConfig.maxAttempts ?? 3)) {
        logger.warn(`Max retries reached for ${provider}`);
        return;
      }

      setRetryingOracles((prev) => [...prev, provider]);

      const existingController = abortControllersRef.current.get(provider);
      if (existingController) {
        existingController.abort();
      }

      const abortController = new AbortController();
      abortControllersRef.current.set(provider, abortController);
      const signal = abortController.signal;

      const baseSymbol = extractBaseSymbol(selectedSymbol);

      try {
        const delayMs = calculateRetryDelay(
          currentAttempts,
          retryConfig.baseDelay ?? 1000,
          retryConfig.backoffMultiplier ?? 2,
          retryConfig.maxDelay ?? 30000
        );

        await delay(delayMs);

        if (signal.aborted) {
          logger.info(`Retry cancelled for ${provider}`);
          return;
        }

        const price = await fetchSingleOracle(provider, baseSymbol, signal);

        if (price && !signal.aborted) {
          onPriceDataUpdate(provider, price);
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
        abortControllersRef.current.delete(provider);
        setRetryingOracles((prev) => prev.filter((o) => o !== provider));
      }
    },
    [
      selectedOracles,
      selectedSymbol,
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

      if (batchAbortControllerRef.current) {
        batchAbortControllerRef.current.abort();
      }
      batchAbortControllerRef.current = new AbortController();
      const signal = batchAbortControllerRef.current.signal;

      const baseSymbol = extractBaseSymbol(selectedSymbol);

      const results = await Promise.allSettled(
        failedOracles.map(async (provider) => {
          if (signal.aborted) return null;

          const currentAttempts = retryAttemptsRef.current.get(provider) || 0;
          const delayMs = calculateRetryDelay(
            currentAttempts,
            retryConfig.baseDelay ?? 1000,
            retryConfig.backoffMultiplier ?? 2,
            retryConfig.maxDelay ?? 30000
          );

          await delay(delayMs);

          if (signal.aborted) return null;

          return fetchSingleOracle(provider, baseSymbol, signal);
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

      batchAbortControllerRef.current = null;
      setRetryingOracles([]);
    },
    [selectedSymbol, retryConfig, delay, fetchSingleOracle, onPriceDataUpdate, onErrorUpdate]
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
