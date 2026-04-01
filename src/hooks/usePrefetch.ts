/**
 * 统一的数据预取 Hook
 * 提供路由预取、悬停预取和智能预取功能
 */

import { useCallback, useRef, useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import {
  PREFETCH_CONFIG,
  QUERY_CONFIG_BY_TYPE,
  type QueryConfigType,
} from '@/lib/config/queryConfig';
import { createPrefetchOptions } from '@/lib/queries/queryClient';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('Prefetch');

// ==================== 类型定义 ====================

export interface PrefetchTarget {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  type?: QueryConfigType;
  priority?: 'high' | 'normal' | 'low';
}

export interface RoutePrefetchConfig {
  route: string;
  targets: PrefetchTarget[];
  priority?: 'high' | 'normal' | 'low';
  delay?: number;
}

export interface UsePrefetchOptions {
  enabled?: boolean;
  maxConcurrent?: number;
  delay?: number;
}

// ==================== 路由预取配置 ====================

const routePrefetchConfigs: Record<string, RoutePrefetchConfig> = {
  '/chainlink': {
    route: '/chainlink',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'chainlink'],
        queryFn: () => fetch('/api/oracles/chainlink').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
      {
        queryKey: ['prices', 'list', { provider: 'chainlink' }],
        queryFn: () => fetch('/api/oracles?provider=chainlink').then((r) => r.json()),
        type: 'price',
        priority: 'normal',
      },
    ],
  },
  '/pyth-network': {
    route: '/pyth-network',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'pyth'],
        queryFn: () => fetch('/api/oracles/pyth').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
      {
        queryKey: ['pyth', 'priceFeeds'],
        queryFn: () => fetch('/api/oracles?provider=pyth').then((r) => r.json()),
        type: 'price',
        priority: 'normal',
      },
    ],
  },
  '/api3': {
    route: '/api3',
    priority: 'high',
    targets: [
      {
        queryKey: ['api3', 'price'],
        queryFn: () => fetch('/api/oracles/api3').then((r) => r.json()),
        type: 'price',
        priority: 'high',
      },
      {
        queryKey: ['api3', 'airnodeStats'],
        queryFn: () => fetch('/api/oracles/api3/stats').then((r) => r.json()),
        type: 'stats',
        priority: 'normal',
      },
    ],
  },
  '/band-protocol': {
    route: '/band-protocol',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'band-protocol'],
        queryFn: () => fetch('/api/oracles/band-protocol').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/redstone': {
    route: '/redstone',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'redstone'],
        queryFn: () => fetch('/api/oracles/redstone').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/uma': {
    route: '/uma',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'uma'],
        queryFn: () => fetch('/api/oracles/uma').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/dia': {
    route: '/dia',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'dia'],
        queryFn: () => fetch('/api/oracles/dia').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/tellor': {
    route: '/tellor',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'tellor'],
        queryFn: () => fetch('/api/oracles/tellor').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/chronicle': {
    route: '/chronicle',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'chronicle'],
        queryFn: () => fetch('/api/oracles/chronicle').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/winklink': {
    route: '/winklink',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'detail', 'winklink'],
        queryFn: () => fetch('/api/oracles/winklink').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/cross-oracle': {
    route: '/cross-oracle',
    priority: 'high',
    targets: [
      {
        queryKey: ['oracles', 'list'],
        queryFn: () => fetch('/api/oracles').then((r) => r.json()),
        type: 'network',
        priority: 'high',
      },
    ],
  },
  '/market-overview': {
    route: '/market-overview',
    priority: 'high',
    targets: [
      {
        queryKey: ['market', 'overview'],
        queryFn: () => fetch('/api/oracles').then((r) => r.json()),
        type: 'stats',
        priority: 'high',
      },
    ],
  },
  '/price-query': {
    route: '/price-query',
    priority: 'high',
    targets: [
      {
        queryKey: ['prices', 'list'],
        queryFn: () => fetch('/api/oracles').then((r) => r.json()),
        type: 'price',
        priority: 'high',
      },
    ],
  },
};

// ==================== 路由预取 Hook ====================

export function useRoutePrefetch(options: UsePrefetchOptions = {}) {
  const { enabled = true, maxConcurrent = PREFETCH_CONFIG.MAX_CONCURRENT_PREFETCHES } = options;
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const prefetchInProgress = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const prefetchRoute = useCallback(
    async (routePath: string, immediate = false) => {
      if (!enabled) return;

      const config = routePrefetchConfigs[routePath];
      if (!config) {
        logger.debug('No prefetch config for route', { route: routePath });
        return;
      }

      const prefetchKey = `route:${routePath}`;
      if (prefetchInProgress.current.has(prefetchKey)) {
        return;
      }

      prefetchInProgress.current.add(prefetchKey);
      abortControllerRef.current = new AbortController();

      const startTime = performance.now();
      logger.debug('Starting route prefetch', { route: routePath });

      try {
        // 按优先级排序
        const sortedTargets = [...config.targets].sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
        });

        // 限制并发数
        const targetsToPrefetch = sortedTargets.slice(0, maxConcurrent);

        await Promise.all(
          targetsToPrefetch.map(async (target) => {
            const cachedData = queryClient.getQueryData(target.queryKey);
            if (cachedData !== undefined) {
              logger.debug('Data already cached, skipping', { queryKey: target.queryKey });
              return;
            }

            await queryClient.prefetchQuery(
              createPrefetchOptions(target.queryKey, target.queryFn, target.type || 'static')
            );
          })
        );

        const duration = performance.now() - startTime;
        logger.debug('Route prefetch completed', {
          route: routePath,
          duration: `${duration.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('Route prefetch failed', error as Error, { route: routePath });
      } finally {
        prefetchInProgress.current.delete(prefetchKey);
        abortControllerRef.current = null;
      }
    },
    [enabled, maxConcurrent, queryClient]
  );

  const cancelPrefetch = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    prefetchInProgress.current.clear();
    logger.debug('Route prefetch cancelled');
  }, []);

  const navigateWithPrefetch = useCallback(
    async (routePath: string) => {
      await prefetchRoute(routePath, true);
      router.push(routePath);
    },
    [prefetchRoute, router]
  );

  // 自动预取当前路由
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      const currentConfig = routePrefetchConfigs[pathname];
      if (currentConfig) {
        prefetchRoute(pathname);
      }
    }, PREFETCH_CONFIG.ROUTE_DELAY);

    return () => {
      clearTimeout(timer);
      cancelPrefetch();
    };
  }, [pathname, enabled, prefetchRoute, cancelPrefetch]);

  return {
    prefetchRoute,
    cancelPrefetch,
    navigateWithPrefetch,
    routeConfigs: routePrefetchConfigs,
  };
}

// ==================== 悬停预取 Hook ====================

export interface UseHoverPrefetchOptions {
  delay?: number;
  enabled?: boolean;
}

export function useHoverPrefetch(options: UseHoverPrefetchOptions = {}) {
  const { delay = PREFETCH_CONFIG.HOVER_DELAY, enabled = true } = options;
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);

  const clearPendingPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const prefetch = useCallback(
    async (target: PrefetchTarget) => {
      if (!enabled) return;

      const cachedData = queryClient.getQueryData(target.queryKey);
      if (cachedData !== undefined) return;

      clearPendingPrefetch();

      timeoutRef.current = setTimeout(async () => {
        setIsPrefetching(true);
        const startTime = performance.now();

        try {
          await queryClient.prefetchQuery(
            createPrefetchOptions(target.queryKey, target.queryFn, target.type || 'static')
          );

          const duration = performance.now() - startTime;
          logger.debug('Hover prefetch completed', {
            queryKey: target.queryKey,
            duration: `${duration.toFixed(2)}ms`,
          });
        } catch (error) {
          logger.error('Hover prefetch failed', error as Error, {
            queryKey: target.queryKey,
          });
        } finally {
          setIsPrefetching(false);
          timeoutRef.current = null;
        }
      }, delay);
    },
    [queryClient, enabled, delay, clearPendingPrefetch]
  );

  const cancelPrefetch = useCallback(() => {
    clearPendingPrefetch();
  }, [clearPendingPrefetch]);

  const getPrefetchHandlers = useCallback(
    (target: PrefetchTarget) => ({
      onMouseEnter: () => prefetch(target),
      onMouseLeave: cancelPrefetch,
      onFocus: () => prefetch(target),
      onBlur: cancelPrefetch,
    }),
    [prefetch, cancelPrefetch]
  );

  return {
    prefetch,
    cancelPrefetch,
    getPrefetchHandlers,
    isPrefetching,
  };
}

// ==================== 智能预取 Hook ====================

export interface UseSmartPrefetchOptions {
  enabled?: boolean;
  idleTimeout?: number;
}

export function useSmartPrefetch(options: UseSmartPrefetchOptions = {}) {
  const { enabled = true, idleTimeout = 5000 } = options;
  const queryClient = useQueryClient();
  const idleCallbackRef = useRef<number | null>(null);
  const prefetchQueue = useRef<PrefetchTarget[]>([]);

  const addToQueue = useCallback((target: PrefetchTarget) => {
    const exists = prefetchQueue.current.some(
      (item) => JSON.stringify(item.queryKey) === JSON.stringify(target.queryKey)
    );
    if (!exists) {
      prefetchQueue.current.push(target);
    }
  }, []);

  const processQueue = useCallback(() => {
    if (prefetchQueue.current.length === 0) return;

    const target = prefetchQueue.current.shift();
    if (!target) return;

    const cachedData = queryClient.getQueryData(target.queryKey);
    if (cachedData !== undefined) {
      processQueue();
      return;
    }

    queryClient
      .prefetchQuery(
        createPrefetchOptions(target.queryKey, target.queryFn, target.type || 'static')
      )
      .then(() => {
        // 继续处理队列
        if (prefetchQueue.current.length > 0) {
          idleCallbackRef.current = requestIdleCallback(processQueue, { timeout: idleTimeout });
        }
      })
      .catch((error) => {
        logger.error('Smart prefetch failed', error as Error, { queryKey: target.queryKey });
      });
  }, [queryClient, idleTimeout]);

  const schedulePrefetch = useCallback(
    (target: PrefetchTarget) => {
      if (!enabled) return;

      addToQueue(target);

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleCallbackRef.current = requestIdleCallback(processQueue, { timeout: idleTimeout });
      } else {
        // 降级方案
        setTimeout(processQueue, idleTimeout);
      }
    },
    [enabled, addToQueue, processQueue, idleTimeout]
  );

  useEffect(() => {
    return () => {
      if (idleCallbackRef.current !== null) {
        cancelIdleCallback(idleCallbackRef.current);
      }
    };
  }, []);

  return {
    schedulePrefetch,
    addToQueue,
    queueLength: prefetchQueue.current.length,
  };
}

// ==================== 可见性预取 Hook ====================

export function useVisibilityPrefetch() {
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetsRef = useRef<Map<Element, PrefetchTarget>>(new Map());

  const observe = useCallback(
    (element: Element, target: PrefetchTarget) => {
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const target = targetsRef.current.get(entry.target);
                if (target) {
                  const cachedData = queryClient.getQueryData(target.queryKey);
                  if (cachedData === undefined) {
                    queryClient.prefetchQuery(
                      createPrefetchOptions(
                        target.queryKey,
                        target.queryFn,
                        target.type || 'static'
                      )
                    );
                  }
                  observerRef.current?.unobserve(entry.target);
                  targetsRef.current.delete(entry.target);
                }
              }
            });
          },
          { rootMargin: '100px', threshold: 0 }
        );
      }

      targetsRef.current.set(element, target);
      observerRef.current.observe(element);
    },
    [queryClient]
  );

  const unobserve = useCallback((element: Element) => {
    observerRef.current?.unobserve(element);
    targetsRef.current.delete(element);
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      targetsRef.current.clear();
    };
  }, []);

  return { observe, unobserve };
}

// ==================== 预取统计 Hook ====================

export function usePrefetchMetrics() {
  const queryClient = useQueryClient();
  const metricsRef = useRef({
    prefetchCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    failedPrefetches: 0,
  });

  const recordPrefetch = useCallback(() => {
    metricsRef.current.prefetchCount++;
  }, []);

  const recordCacheHit = useCallback(() => {
    metricsRef.current.cacheHits++;
  }, []);

  const recordCacheMiss = useCallback(() => {
    metricsRef.current.cacheMisses++;
  }, []);

  const recordFailedPrefetch = useCallback(() => {
    metricsRef.current.failedPrefetches++;
  }, []);

  const getMetrics = useCallback(
    () => ({
      ...metricsRef.current,
      cacheHitRate:
        metricsRef.current.prefetchCount > 0
          ? (metricsRef.current.cacheHits / metricsRef.current.prefetchCount) * 100
          : 0,
    }),
    []
  );

  const checkCacheStatus = useCallback(
    (queryKey: unknown[]) => {
      const isCached = queryClient.getQueryData(queryKey) !== undefined;
      if (isCached) {
        recordCacheHit();
      } else {
        recordCacheMiss();
      }
      return isCached;
    },
    [queryClient, recordCacheHit, recordCacheMiss]
  );

  return {
    recordPrefetch,
    recordCacheHit,
    recordCacheMiss,
    recordFailedPrefetch,
    getMetrics,
    checkCacheStatus,
  };
}

// ==================== 辅助函数 ====================

export function createPrefetchTarget(
  queryKey: unknown[],
  queryFn: () => Promise<unknown>,
  type: QueryConfigType = 'static',
  priority: 'high' | 'normal' | 'low' = 'normal'
): PrefetchTarget {
  return {
    queryKey,
    queryFn,
    type,
    priority,
  };
}

export function getRoutePrefetchConfig(route: string): RoutePrefetchConfig | undefined {
  return routePrefetchConfigs[route];
}

// 添加全局类型声明
declare global {
  interface Window {
    requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback: (handle: number) => void;
  }
}
