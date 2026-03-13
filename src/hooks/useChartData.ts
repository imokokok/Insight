'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useChartData');

// 缓存配置
interface CacheConfig {
  ttl: number; // 缓存有效期（毫秒）
  key: string;
}

// 缓存条目
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// 数据缓存存储
const dataCache = new Map<string, CacheEntry<unknown>>();

// 清理过期缓存
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, entry] of dataCache.entries()) {
    if (entry.expiresAt < now) {
      dataCache.delete(key);
    }
  }
};

// 定期清理缓存（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 5 * 60 * 1000);
}

export interface UseChartDataOptions<T> {
  fetchFn: () => Promise<T>;
  cacheConfig?: CacheConfig;
  initialData?: T;
  enabled?: boolean;
  retryCount?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseChartDataReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidateCache: () => void;
  lastUpdated: number | null;
}

/**
 * 图表数据通用 Hook
 * - 封装数据获取逻辑
 * - 支持数据缓存和刷新
 * - 错误处理和加载状态
 */
export function useChartData<T>(options: UseChartDataOptions<T>): UseChartDataReturn<T> {
  const {
    fetchFn,
    cacheConfig,
    initialData,
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // 生成缓存键
  const cacheKey = useMemo(() => {
    if (!cacheConfig) return null;
    return `${cacheConfig.key}`;
  }, [cacheConfig]);

  // 从缓存获取数据
  const getCachedData = useCallback((): T | undefined => {
    if (!cacheKey) return undefined;

    const entry = dataCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    if (entry.expiresAt < Date.now()) {
      dataCache.delete(cacheKey);
      return undefined;
    }

    return entry.data;
  }, [cacheKey]);

  // 保存数据到缓存
  const setCachedData = useCallback(
    (newData: T) => {
      if (!cacheKey || !cacheConfig) return;

      const now = Date.now();
      dataCache.set(cacheKey, {
        data: newData,
        timestamp: now,
        expiresAt: now + cacheConfig.ttl,
      });
    },
    [cacheKey, cacheConfig]
  );

  // 使缓存失效
  const invalidateCache = useCallback(() => {
    if (!cacheKey) return;
    dataCache.delete(cacheKey);
    logger.info('Cache invalidated', { cacheKey });
  }, [cacheKey]);

  // 获取数据的核心逻辑
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!enabled || !isMountedRef.current) return;

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // 检查缓存（非刷新情况下）
        if (!isRefresh && cacheKey) {
          const cached = getCachedData();
          if (cached !== undefined) {
            setData(cached);
            setLastUpdated(Date.now());
            setIsLoading(false);
            setIsRefreshing(false);
            onSuccess?.(cached);
            return;
          }
        }

        const result = await fetchFn();

        if (abortController.signal.aborted || !isMountedRef.current) return;

        setData(result);
        setLastUpdated(Date.now());
        setCachedData(result);
        retryCountRef.current = 0;
        onSuccess?.(result);
      } catch (err) {
        if (abortController.signal.aborted || !isMountedRef.current) return;

        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Failed to fetch chart data', error);

        // 重试逻辑
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          logger.info(`Retrying fetch (${retryCountRef.current}/${retryCount})...`);
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(isRefresh);
            }
          }, retryDelay * retryCountRef.current);
          return;
        }

        setError(error);
        onError?.(error);
      } finally {
        if (!abortController.signal.aborted && isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      enabled,
      fetchFn,
      cacheKey,
      getCachedData,
      setCachedData,
      retryCount,
      retryDelay,
      onSuccess,
      onError,
    ]
  );

  // 刷新数据
  const refresh = useCallback(async () => {
    invalidateCache();
    await fetchData(true);
  }, [fetchData, invalidateCache]);

  // 初始加载
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      fetchData(false);
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
    invalidateCache,
    lastUpdated,
  };
}

// 批量数据获取 Hook
export interface UseBatchChartDataOptions<T> {
  queries: Array<{
    key: string;
    fetchFn: () => Promise<T>;
  }>;
  cacheConfig?: CacheConfig;
  enabled?: boolean;
  parallel?: boolean;
}

export interface UseBatchChartDataReturn<T> {
  data: Map<string, T>;
  isLoading: boolean;
  errors: Map<string, Error>;
  refresh: (key?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * 批量图表数据获取 Hook
 * 支持并行或串行获取多个数据源
 */
export function useBatchChartData<T>(
  options: UseBatchChartDataOptions<T>
): UseBatchChartDataReturn<T> {
  const { queries, enabled = true, parallel = true } = options;

  const [data, setData] = useState<Map<string, T>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const fetchQuery = useCallback(
    async (query: { key: string; fetchFn: () => Promise<T> }, isRefresh = false) => {
      const { key, fetchFn } = query;

      // 取消之前的请求
      const existingController = abortControllersRef.current.get(key);
      if (existingController) {
        existingController.abort();
      }

      const abortController = new AbortController();
      abortControllersRef.current.set(key, abortController);

      try {
        const result = await fetchFn();

        if (abortController.signal.aborted) return;

        setData((prev) => {
          const next = new Map(prev);
          next.set(key, result);
          return next;
        });

        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } catch (err) {
        if (abortController.signal.aborted) return;

        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to fetch data for key: ${key}`, error);

        setErrors((prev) => {
          const next = new Map(prev);
          next.set(key, error);
          return next;
        });
      } finally {
        abortControllersRef.current.delete(key);
      }
    },
    []
  );

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!enabled) return;

      setIsLoading(true);

      try {
        if (parallel) {
          await Promise.all(queries.map((query) => fetchQuery(query, isRefresh)));
        } else {
          for (const query of queries) {
            await fetchQuery(query, isRefresh);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, parallel, queries, fetchQuery]
  );

  const refresh = useCallback(
    async (key?: string) => {
      if (key) {
        const query = queries.find((q) => q.key === key);
        if (query) {
          await fetchQuery(query, true);
        }
      } else {
        await fetchAll(true);
      }
    },
    [queries, fetchQuery, fetchAll]
  );

  const refreshAll = useCallback(async () => {
    await fetchAll(true);
  }, [fetchAll]);

  useEffect(() => {
    fetchAll(false);

    return () => {
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    };
  }, [fetchAll]);

  return {
    data,
    isLoading,
    errors,
    refresh,
    refreshAll,
  };
}

// 自动刷新 Hook
export interface UseAutoRefreshOptions {
  interval?: number; // 刷新间隔（毫秒）
  enabled?: boolean;
  onRefresh?: () => void;
  maxRetries?: number;
}

export interface UseAutoRefreshReturn {
  isActive: boolean;
  start: () => void;
  stop: () => void;
  lastRefreshTime: number | null;
  refreshCount: number;
}

/**
 * 自动刷新 Hook
 * 支持定时自动刷新数据
 */
export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const { interval = 30000, enabled = true, onRefresh, maxRetries = 3 } = options;

  const [isActive, setIsActive] = useState(enabled);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const start = useCallback(() => {
    if (intervalRef.current) return;

    setIsActive(true);
    intervalRef.current = setInterval(() => {
      try {
        onRefresh?.();
        setLastRefreshTime(Date.now());
        setRefreshCount((prev) => prev + 1);
        retryCountRef.current = 0;
      } catch (error) {
        logger.error('Auto refresh failed', error as Error);
        retryCountRef.current++;

        if (retryCountRef.current >= maxRetries) {
          logger.warn('Max retries reached, stopping auto refresh');
          stop();
        }
      }
    }, interval);
  }, [interval, onRefresh, maxRetries]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled, start, stop]);

  return {
    isActive,
    start,
    stop,
    lastRefreshTime,
    refreshCount,
  };
}
