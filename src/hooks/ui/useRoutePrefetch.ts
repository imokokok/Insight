'use client';

import { useCallback, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { PriceFetchError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';

const logger = createLogger('RoutePrefetch');

export interface RoutePrefetchConfig {
  route: string;
  prefetchQueries: PrefetchQueryConfig[];
  priority?: 'high' | 'low';
}

export interface PrefetchQueryConfig {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  staleTime?: number;
  gcTime?: number;
}

export interface UseRoutePrefetchOptions {
  enabled?: boolean;
  prefetchOnMount?: boolean;
  prefetchDelay?: number;
  maxConcurrentPrefetches?: number;
}

const routePrefetchMap: Record<string, RoutePrefetchConfig> = {
  '/chainlink': {
    route: '/chainlink',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'chainlink'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/chainlink');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch chainlink data', {
              provider: 'chainlink',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/pyth-network': {
    route: '/pyth-network',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'pyth'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/pyth');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch pyth data', {
              provider: 'pyth',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/api3': {
    route: '/api3',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'api3'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/api3');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch api3 data', {
              provider: 'api3',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/band-protocol': {
    route: '/band-protocol',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'band-protocol'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/band-protocol');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch band-protocol data', {
              provider: 'band-protocol',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/redstone': {
    route: '/redstone',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'redstone'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/redstone');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch redstone data', {
              provider: 'redstone',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/uma': {
    route: '/uma',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'uma'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/uma');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch uma data', {
              provider: 'uma',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/dia': {
    route: '/dia',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'dia'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/dia');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch dia data', {
              provider: 'dia',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },

  '/winklink': {
    route: '/winklink',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'detail', 'winklink'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles/winklink');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch winklink data', {
              provider: 'winklink',
              retryable: true,
            });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/cross-oracle': {
    route: '/cross-oracle',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['oracles', 'list', { crossOracle: true }],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch oracles list', { retryable: true });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/cross-chain': {
    route: '/cross-chain',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['cross-chain', 'stats'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles?crossChain=true');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch cross-chain data', { retryable: true });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
  '/price-query': {
    route: '/price-query',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['prices', 'list', {}],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch prices', { retryable: true });
          }
        },
        staleTime: STALE_TIME_CONFIG.price,
        gcTime: GC_TIME_CONFIG.price,
      },
    ],
  },
  '/market-overview': {
    route: '/market-overview',
    priority: 'high',
    prefetchQueries: [
      {
        queryKey: ['market', 'overview'],
        queryFn: async () => {
          try {
            const response = await apiClient.get('/api/oracles');
            return response.data;
          } catch {
            throw new PriceFetchError('Failed to fetch market overview', { retryable: true });
          }
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      },
    ],
  },
};

export function useRoutePrefetch(options: UseRoutePrefetchOptions = {}) {
  const {
    enabled = true,
    prefetchOnMount = true,
    prefetchDelay = 100,
    maxConcurrentPrefetches = 3,
  } = options;

  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const prefetchInProgressRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const prefetchRoute = useCallback(
    async (routePath: string) => {
      if (!enabled) {
        logger.debug('Route prefetch disabled');
        return;
      }

      const config = routePrefetchMap[routePath];
      if (!config) {
        logger.debug('No prefetch config found for route', { route: routePath });
        return;
      }

      const prefetchKey = routePath;
      if (prefetchInProgressRef.current.has(prefetchKey)) {
        logger.debug('Prefetch already in progress', { route: routePath });
        return;
      }

      prefetchInProgressRef.current.add(prefetchKey);
      abortControllerRef.current = new AbortController();

      const startTime = performance.now();
      logger.debug('Starting route prefetch', {
        route: routePath,
        queriesCount: config.prefetchQueries.length,
      });

      try {
        const queriesToRun = config.prefetchQueries.slice(0, maxConcurrentPrefetches);

        await Promise.all(
          queriesToRun.map(async (queryConfig) => {
            const cachedData = queryClient.getQueryData(queryConfig.queryKey);
            if (cachedData !== undefined) {
              logger.debug('Data already cached for query', {
                queryKey: queryConfig.queryKey,
              });
              return;
            }

            await queryClient.prefetchQuery({
              queryKey: queryConfig.queryKey,
              queryFn: queryConfig.queryFn,
              staleTime: queryConfig.staleTime,
              gcTime: queryConfig.gcTime,
            });
          })
        );

        const duration = performance.now() - startTime;
        logger.debug('Route prefetch completed', {
          route: routePath,
          duration: `${duration.toFixed(2)}ms`,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Route prefetch failed', err, { route: routePath });
      } finally {
        prefetchInProgressRef.current.delete(prefetchKey);
        abortControllerRef.current = null;
      }
    },
    [enabled, queryClient, maxConcurrentPrefetches]
  );

  const cancelPrefetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    prefetchInProgressRef.current.clear();
    logger.debug('Route prefetch cancelled');
  }, []);

  const navigateWithPrefetch = useCallback(
    async (routePath: string) => {
      await prefetchRoute(routePath);
      router.push(routePath);
    },
    [prefetchRoute, router]
  );

  useEffect(() => {
    if (!prefetchOnMount || !enabled) return;

    const timer = setTimeout(() => {
      const currentConfig = routePrefetchMap[pathname];
      if (currentConfig) {
        prefetchRoute(pathname);
      }
    }, prefetchDelay);

    return () => {
      clearTimeout(timer);
      cancelPrefetch();
    };
  }, [pathname, prefetchOnMount, enabled, prefetchDelay, prefetchRoute, cancelPrefetch]);

  return {
    prefetchRoute,
    cancelPrefetch,
    navigateWithPrefetch,
    routePrefetchMap,
  };
}

export function usePrefetchOnNavigation() {
  const { prefetchRoute, navigateWithPrefetch } = useRoutePrefetch({
    enabled: true,
    prefetchOnMount: false,
  });

  const prefetchOnHover = useCallback(
    (routePath: string) => {
      prefetchRoute(routePath);
    },
    [prefetchRoute]
  );

  return {
    prefetchOnHover,
    navigateWithPrefetch,
  };
}

export function getRoutePrefetchConfig(route: string): RoutePrefetchConfig | undefined {
  return routePrefetchMap[route];
}

export function usePrefetchMetrics() {
  const queryClient = useQueryClient();
  const metricsRef = useRef<{
    prefetchCount: number;
    cacheHits: number;
    cacheMisses: number;
  }>({
    prefetchCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
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

  const getMetrics = useCallback(() => ({ ...metricsRef.current }), []);

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
    getMetrics,
    checkCacheStatus,
  };
}

export { routePrefetchMap };
