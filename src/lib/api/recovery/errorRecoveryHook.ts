'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

import { captureException, addBreadcrumb } from '@/lib/monitoring';
import { createLogger } from '@/lib/utils/logger';

import { EnhancedRetryManager, type EnhancedRetryConfig } from '../retry/enhancedRetry';

const logger = createLogger('error-recovery-hook');

/**
 * 恢复策略类型
 */
export type RecoveryStrategy = 'retry' | 'fallback' | 'cache' | 'graceful-degradation' | 'manual';

/**
 * 错误恢复状态
 */
export interface ErrorRecoveryState<T> {
  /** 当前数据 */
  data: T | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否出错 */
  isError: boolean;
  /** 错误对象 */
  error: Error | null;
  /** 是否正在恢复 */
  isRecovering: boolean;
  /** 恢复尝试次数 */
  recoveryAttempts: number;
  /** 是否使用降级数据 */
  isDegraded: boolean;
  /** 最后一次成功的时间 */
  lastSuccessAt: number | null;
  /** 最后一次错误的时间 */
  lastErrorAt: number | null;
}

/**
 * 错误恢复操作
 */
export interface ErrorRecoveryActions<T> {
  /** 手动重试 */
  retry: () => Promise<void>;
  /** 使用降级数据 */
  useFallback: (fallbackData: T) => void;
  /** 重置状态 */
  reset: () => void;
  /** 清除错误 */
  clearError: () => void;
}

/**
 * 错误恢复配置
 */
export interface ErrorRecoveryConfig<T> {
  /** 重试配置 */
  retryConfig?: Partial<EnhancedRetryConfig>;
  /** 恢复策略 */
  recoveryStrategy?: RecoveryStrategy;
  /** 降级数据提供函数 */
  fallbackData?: () => T | Promise<T>;
  /** 缓存键（用于本地存储缓存） */
  cacheKey?: string;
  /** 缓存过期时间（毫秒） */
  cacheTTL?: number;
  /** 是否启用自动恢复 */
  autoRecover?: boolean;
  /** 最大恢复尝试次数 */
  maxRecoveryAttempts?: number;
  /** 恢复成功回调 */
  onRecoverySuccess?: (data: T) => void;
  /** 恢复失败回调 */
  onRecoveryFailure?: (error: Error) => void;
  /** 降级模式回调 */
  onDegraded?: (fallbackData: T) => void;
}

/**
 * 错误恢复 Hook 返回类型
 */
export interface UseErrorRecoveryReturn<T> extends ErrorRecoveryState<T>, ErrorRecoveryActions<T> {
  /** 执行数据获取操作 */
  execute: (operation: () => Promise<T>, operationName?: string) => Promise<void>;
  /** 当前使用的策略 */
  currentStrategy: RecoveryStrategy;
  /** 重试管理器实例 */
  retryManager: EnhancedRetryManager;
}

/**
 * 本地存储缓存管理器
 */
class LocalStorageCache<T> {
  private key: string;
  private ttl: number;

  constructor(key: string, ttl: number = 5 * 60 * 1000) {
    this.key = `error_recovery_cache_${key}`;
    this.ttl = ttl;
  }

  get(): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(this.key);
      if (!item) return null;

      const parsed = JSON.parse(item) as { data: T; timestamp: number };
      const now = Date.now();

      if (now - parsed.timestamp > this.ttl) {
        localStorage.removeItem(this.key);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }

  set(data: T): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      logger.warn('Failed to save to localStorage cache', { error });
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      logger.warn('Failed to clear localStorage cache', { error });
    }
  }
}

/**
 * 错误恢复 Hook
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, error, retry, execute } = useErrorRecovery<PriceData>({
 *   retryConfig: retryStrategies.standard,
 *   fallbackData: () => ({ price: 0, timestamp: Date.now() }),
 *   cacheKey: 'price_data',
 * });
 *
 * useEffect(() => {
 *   execute(() => fetchPriceData(symbol), 'fetchPrice');
 * }, [symbol]);
 * ```
 */
export function useErrorRecovery<T>(
  config: ErrorRecoveryConfig<T> = {}
): UseErrorRecoveryReturn<T> {
  const {
    retryConfig,
    recoveryStrategy = 'retry',
    fallbackData,
    cacheKey,
    cacheTTL = 5 * 60 * 1000,
    autoRecover = true,
    maxRecoveryAttempts = 3,
    onRecoverySuccess,
    onRecoveryFailure,
    onDegraded,
  } = config;

  // 状态
  const [state, setState] = useState<ErrorRecoveryState<T>>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    isRecovering: false,
    recoveryAttempts: 0,
    isDegraded: false,
    lastSuccessAt: null,
    lastErrorAt: null,
  });

  const [currentStrategy, setCurrentStrategy] = useState<RecoveryStrategy>(recoveryStrategy);

  // Refs
  const retryManagerRef = useRef(new EnhancedRetryManager(retryConfig));
  const cacheRef = useRef(cacheKey ? new LocalStorageCache<T>(cacheKey, cacheTTL) : null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 清理函数
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // 安全的状态更新
  const safeSetState = useCallback(
    (updater: (prev: ErrorRecoveryState<T>) => ErrorRecoveryState<T>) => {
      if (isMountedRef.current) {
        setState(updater);
      }
    },
    []
  );

  // 执行数据获取操作
  const execute = useCallback(
    async (operation: () => Promise<T>, operationName?: string) => {
      // 取消之前的操作
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      safeSetState((prev) => ({
        ...prev,
        isLoading: true,
        isError: false,
        error: null,
        isRecovering: prev.recoveryAttempts > 0,
      }));

      try {
        // 首先尝试正常执行
        const result = await retryManagerRef.current.execute(operation, operationName, {
          onRetry: (context) => {
            safeSetState((prev) => ({
              ...prev,
              recoveryAttempts: context.attempt,
              isRecovering: true,
            }));

            addBreadcrumb({
              category: 'error-recovery',
              message: `Retry attempt ${context.attempt}`,
              level: 'info',
              data: { operationName, delay: context.delay },
            });
          },
        });

        if (result.success) {
          // 成功
          const data = result.data!;

          // 保存到缓存
          cacheRef.current?.set(data);

          safeSetState((prev) => ({
            ...prev,
            data,
            isLoading: false,
            isError: false,
            error: null,
            isRecovering: false,
            recoveryAttempts: 0,
            isDegraded: false,
            lastSuccessAt: Date.now(),
          }));

          setCurrentStrategy('retry');
          onRecoverySuccess?.(data);

          addBreadcrumb({
            category: 'error-recovery',
            message: 'Operation succeeded',
            level: 'info',
            data: { operationName, attempts: result.attempts },
          });
        } else {
          // 重试后仍然失败，尝试恢复策略
          throw result.error || new Error('Operation failed after retries');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        logger.warn(`Operation ${operationName || ''} failed, attempting recovery`, {
          error: err.message,
          strategy: currentStrategy,
        });

        // 尝试恢复
        await attemptRecovery(err, operation, operationName);
      }
    },
    [currentStrategy, onRecoverySuccess, safeSetState]
  );

  // 尝试恢复
  const attemptRecovery = useCallback(
    async (error: Error, originalOperation: () => Promise<T>, operationName?: string) => {
      const strategies: RecoveryStrategy[] = [
        'cache',
        'fallback',
        'graceful-degradation',
        'manual',
      ];

      for (const strategy of strategies) {
        if (!autoRecover && strategy !== 'manual') continue;

        try {
          let recovered = false;
          let recoveredData: T | null = null;

          switch (strategy) {
            case 'cache': {
              // 尝试从缓存恢复
              const cachedData = cacheRef.current?.get();
              if (cachedData) {
                recoveredData = cachedData;
                recovered = true;
                logger.info('Recovered from cache', { operationName });
              }
              break;
            }

            case 'fallback': {
              // 尝试使用降级数据
              if (fallbackData) {
                recoveredData = await fallbackData();
                recovered = true;
                logger.info('Recovered using fallback data', { operationName });
              }
              break;
            }

            case 'graceful-degradation': {
              // 尝试返回部分数据或默认值
              if (state.data) {
                recoveredData = state.data;
                recovered = true;
                logger.info('Using stale data for graceful degradation', { operationName });
              }
              break;
            }

            case 'manual':
            default:
              // 手动恢复模式，不自动恢复
              break;
          }

          if (recovered && recoveredData !== null) {
            safeSetState((prev) => ({
              ...prev,
              data: recoveredData,
              isLoading: false,
              isError: false,
              error: null,
              isRecovering: false,
              isDegraded: strategy !== 'cache',
              lastErrorAt: Date.now(),
            }));

            setCurrentStrategy(strategy);

            if (strategy === 'fallback' || strategy === 'graceful-degradation') {
              onDegraded?.(recoveredData);
            }

            addBreadcrumb({
              category: 'error-recovery',
              message: `Recovered using ${strategy} strategy`,
              level: 'info',
              data: { operationName, strategy },
            });

            return;
          }
        } catch (recoveryError) {
          logger.warn(`Recovery strategy ${strategy} failed`, { recoveryError });
        }
      }

      // 所有恢复策略都失败了
      safeSetState((prev) => ({
        ...prev,
        isLoading: false,
        isError: true,
        error,
        isRecovering: false,
        lastErrorAt: Date.now(),
      }));

      setCurrentStrategy('manual');
      onRecoveryFailure?.(error);

      captureException(error, {
        operationName,
        recoveryAttempts: state.recoveryAttempts,
        message: 'All recovery strategies failed',
      });
    },
    [
      autoRecover,
      fallbackData,
      state.data,
      state.recoveryAttempts,
      onDegraded,
      onRecoveryFailure,
      safeSetState,
    ]
  );

  // 手动重试
  const retry = useCallback(async () => {
    if (state.recoveryAttempts >= maxRecoveryAttempts) {
      logger.warn('Max recovery attempts reached');
      return;
    }

    safeSetState((prev) => ({
      ...prev,
      recoveryAttempts: prev.recoveryAttempts + 1,
    }));

    // 触发重新执行需要外部传入 operation
    // 这里只是重置状态，实际重试由调用方控制
    safeSetState((prev) => ({
      ...prev,
      isError: false,
      error: null,
    }));
  }, [maxRecoveryAttempts, state.recoveryAttempts, safeSetState]);

  // 使用降级数据
  const useFallback = useCallback(
    (fallbackDataValue: T) => {
      safeSetState((prev) => ({
        ...prev,
        data: fallbackDataValue,
        isLoading: false,
        isError: false,
        error: null,
        isDegraded: true,
      }));

      setCurrentStrategy('fallback');
      onDegraded?.(fallbackDataValue);
    },
    [onDegraded, safeSetState]
  );

  // 重置状态
  const reset = useCallback(() => {
    safeSetState(() => ({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isRecovering: false,
      recoveryAttempts: 0,
      isDegraded: false,
      lastSuccessAt: null,
      lastErrorAt: null,
    }));

    setCurrentStrategy(recoveryStrategy);
    cacheRef.current?.clear();
  }, [recoveryStrategy, safeSetState]);

  // 清除错误
  const clearError = useCallback(() => {
    safeSetState((prev) => ({
      ...prev,
      isError: false,
      error: null,
    }));
  }, [safeSetState]);

  return {
    ...state,
    execute,
    retry,
    useFallback,
    reset,
    clearError,
    currentStrategy,
    retryManager: retryManagerRef.current,
  };
}

/**
 * 批量错误恢复 Hook
 * 用于管理多个并发操作的错误恢复
 */
export function useBatchErrorRecovery<T extends Record<string, unknown>>(
  config: ErrorRecoveryConfig<T> = {}
) {
  const [results, setResults] = useState<{
    [K in keyof T]?: ErrorRecoveryState<T[K]>;
  }>({});

  const retryManagerRef = useRef(new EnhancedRetryManager(config.retryConfig));

  const executeBatch = useCallback(
    async (
      operations: { [K in keyof T]: () => Promise<T[K]> },
      options?: {
        continueOnError?: boolean;
        onPartialSuccess?: (key: keyof T, data: T[keyof T]) => void;
      }
    ) => {
      const entries = Object.entries(operations) as [keyof T, () => Promise<T[keyof T]>][];
      const newResults: Partial<{ [K in keyof T]: ErrorRecoveryState<T[K]> }> = {};

      for (const [key, operation] of entries) {
        try {
          const result = await retryManagerRef.current.execute(operation, String(key));

          if (result.success) {
            newResults[key] = {
              data: result.data!,
              isLoading: false,
              isError: false,
              error: null,
              isRecovering: false,
              recoveryAttempts: result.attempts,
              isDegraded: false,
              lastSuccessAt: Date.now(),
              lastErrorAt: null,
            };

            options?.onPartialSuccess?.(key, result.data!);
          } else {
            throw result.error || new Error('Operation failed');
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          newResults[key] = {
            data: null,
            isLoading: false,
            isError: true,
            error: err,
            isRecovering: false,
            recoveryAttempts: 0,
            isDegraded: false,
            lastSuccessAt: null,
            lastErrorAt: Date.now(),
          };

          if (!options?.continueOnError) {
            break;
          }
        }
      }

      setResults((prev) => ({ ...prev, ...newResults }));
      return newResults as { [K in keyof T]: ErrorRecoveryState<T[K]> };
    },
    []
  );

  return {
    results,
    executeBatch,
    retryManager: retryManagerRef.current,
  };
}

export default useErrorRecovery;
