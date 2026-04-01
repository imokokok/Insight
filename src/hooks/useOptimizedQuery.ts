/**
 * 优化的 React Query Hooks
 * 提供统一的查询接口和性能优化
 */

import { useCallback, useMemo } from 'react';

import {
  useQuery,
  useQueries,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';

import { createLogger } from '@/lib/utils/logger';
import {
  getQueryConfig,
  createQueryOptions,
  type QueryConfigType,
} from '@/lib/queries/queryClient';

const logger = createLogger('OptimizedQuery');

/**
 * 优化的 useQuery Hook
 * 自动应用基于数据类型的最佳配置
 */
export function useOptimizedQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  type: QueryConfigType = 'static',
  overrides?: Partial<UseQueryOptions<TData, TError>>
): UseQueryResult<TData, TError> {
  const options = useMemo(
    () => createQueryOptions(queryKey, queryFn, type, overrides),
    [queryKey, queryFn, type, overrides]
  );

  return useQuery(options);
}

/**
 * 批量查询 Hook
 * 并行执行多个查询并统一处理加载和错误状态
 */
export interface UseBatchQueriesOptions<TData = unknown> {
  queries: Array<{
    key: unknown[];
    fn: () => Promise<TData>;
    type?: QueryConfigType;
    enabled?: boolean;
  }>;
  enabled?: boolean;
}

export interface UseBatchQueriesResult<TData = unknown> {
  data: (TData | undefined)[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
  results: UseQueryResult<TData, Error>[];
}

export function useBatchQueries<TData = unknown>(
  options: UseBatchQueriesOptions<TData>
): UseBatchQueriesResult<TData> {
  const { queries, enabled = true } = options;

  const queryOptions = useMemo(
    () =>
      queries.map(({ key, fn, type = 'static', enabled: queryEnabled = true }) =>
        createQueryOptions(key, fn, type, { enabled: enabled && queryEnabled })
      ),
    [queries, enabled]
  );

  const results = useQueries({ queries: queryOptions });

  const isLoading = useMemo(() => results.some((r) => r.isLoading), [results]);
  const isError = useMemo(() => results.some((r) => r.isError), [results]);
  const errors = useMemo(() => results.map((r) => r.error).filter(Boolean) as Error[], [results]);
  const data = useMemo(() => results.map((r) => r.data), [results]);

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
  }, [results]);

  return {
    data,
    isLoading,
    isError,
    errors,
    refetchAll,
    results,
  };
}

/**
 * 带缓存优先级的查询 Hook
 * 优先从缓存获取数据，同时后台更新
 */
export function useCachePriorityQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  type: QueryConfigType = 'static',
  overrides?: Partial<UseQueryOptions<TData, TError>>
): UseQueryResult<TData, TError> & {
  isRefreshing: boolean;
  refresh: () => Promise<void>;
} {
  const queryClient = useQueryClient();

  const baseOptions = useMemo(() => getQueryConfig<TData, TError>(type), [type]);

  const options = useMemo(
    () => ({
      ...baseOptions,
      ...overrides,
      queryKey,
      queryFn,
    }),
    [baseOptions, overrides, queryKey, queryFn]
  );

  const result = useQuery(options);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    ...result,
    isRefreshing: result.isFetching && !result.isLoading,
    refresh,
  };
}

/**
 * 带重试逻辑的 Mutation Hook
 */
export function useOptimizedMutation<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
): UseMutationResult<TData, TError, TVariables> {
  return useMutation({
    mutationFn,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    ...options,
  });
}

/**
 * 轮询查询 Hook
 * 用于需要定期更新的数据
 */
export function usePollingQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  intervalMs: number = 30000,
  options?: Partial<UseQueryOptions<TData, TError>>
): UseQueryResult<TData, TError> & {
  startPolling: () => void;
  stopPolling: () => void;
} {
  const [isPolling, setIsPolling] = useState(true);

  const result = useOptimizedQuery(queryKey, queryFn, 'price', {
    refetchInterval: isPolling ? intervalMs : false,
    ...options,
  });

  const startPolling = useCallback(() => setIsPolling(true), []);
  const stopPolling = useCallback(() => setIsPolling(false), []);

  return {
    ...result,
    startPolling,
    stopPolling,
  };
}

import { useState, useEffect, useRef } from 'react';

/**
 * 无限滚动查询 Hook
 */
export interface UseInfiniteScrollOptions<TData = unknown> {
  queryKey: unknown[];
  queryFn: (pageParam: number) => Promise<TData[]>;
  getNextPageParam: (lastPage: TData[], allPages: TData[][]) => number | undefined;
  enabled?: boolean;
  staleTime?: number;
}

export function useInfiniteScroll<TData = unknown>(options: UseInfiniteScrollOptions<TData>) {
  const { queryKey, queryFn, getNextPageParam, enabled = true, staleTime = 60000 } = options;

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam as number),
    getNextPageParam,
    initialPageParam: 0,
    enabled,
    staleTime,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            infiniteQuery.hasNextPage &&
            !infiniteQuery.isFetchingNextPage
          ) {
            infiniteQuery.fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [infiniteQuery]);

  const allData = useMemo(() => infiniteQuery.data?.pages.flat() ?? [], [infiniteQuery.data]);

  return {
    ...infiniteQuery,
    allData,
    loadMoreRef,
  };
}

/**
 * 乐观更新 Mutation Hook
 */
export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: unknown[],
  optimisticUpdater: (oldData: TData | undefined, variables: TVariables) => TData,
  options?: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<TData>(queryKey);

      queryClient.setQueryData<TData>(queryKey, (old) => optimisticUpdater(old, variables));

      return { previousData } as TContext;
    },
    onError: (err, variables, context) => {
      if (context && 'previousData' in context) {
        queryClient.setQueryData(queryKey, (context as { previousData: TData }).previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    ...options,
  });
}

/**
 * 查询性能监控 Hook
 */
export function useQueryPerformance(queryKey: unknown[], queryName: string) {
  const startTimeRef = useRef<number>(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    startTimeRef.current = performance.now();

    return () => {
      const duration = performance.now() - startTimeRef.current;
      if (duration > 1000) {
        logger.warn(`Slow query detected: ${queryName}`, {
          queryKey,
          duration: `${duration.toFixed(2)}ms`,
        });
      }
    };
  }, [queryKey, queryName]);

  const getMetrics = useCallback(() => {
    const query = queryClient.getQueryCache().find({ queryKey });
    if (!query) return null;

    return {
      queryKey,
      queryName,
      fetchCount: query.state.fetchCount,
      fetchFailureCount: query.state.fetchFailureCount,
      dataUpdatedAt: query.state.dataUpdatedAt,
      isStale: query.isStale(),
    };
  }, [queryClient, queryKey, queryName]);

  return { getMetrics };
}

/**
 * 条件查询 Hook
 * 根据条件动态启用/禁用查询
 */
export function useConditionalQuery<TData = unknown, TError = Error>(
  condition: boolean,
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  type: QueryConfigType = 'static',
  overrides?: Partial<UseQueryOptions<TData, TError>>
): UseQueryResult<TData, TError> {
  return useOptimizedQuery(queryKey, queryFn, type, {
    enabled: condition,
    ...overrides,
  });
}
