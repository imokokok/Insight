/**
 * 优化的 QueryClient 配置
 * 提供全局查询客户端配置和工具函数
 */

import {
  QueryClient,
  QueryCache,
  MutationCache,
  type QueryOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  DEFAULT_QUERY_OPTIONS,
  QUERY_CONFIG_BY_TYPE,
  type QueryConfigType,
} from '@/lib/config/queryConfig';
import { isAppError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('QueryClient');

/**
 * 创建优化的 QueryClient 实例
 */
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...DEFAULT_QUERY_OPTIONS,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isAppError(error)) {
          logger.error(
            `Query error [${query.queryHash}]: ${error.code} - ${error.message}`,
            error,
            {
              statusCode: error.statusCode,
              details: error.details,
              queryKey: query.queryKey,
            }
          );
        } else if (error instanceof Error) {
          logger.error(`Query error [${query.queryHash}]: ${error.message}`, error, {
            queryKey: query.queryKey,
          });
        } else {
          logger.error(`Query error [${query.queryHash}]: Unknown error`, undefined, {
            queryKey: query.queryKey,
            error,
          });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, context, mutation) => {
        if (isAppError(error)) {
          logger.error(`Mutation error: ${error.code} - ${error.message}`, error, {
            statusCode: error.statusCode,
            details: error.details,
            mutationKey: mutation.options.mutationKey,
          });
        } else if (error instanceof Error) {
          logger.error(`Mutation error: ${error.message}`, error, {
            mutationKey: mutation.options.mutationKey,
          });
        } else {
          logger.error('Mutation error: Unknown error', undefined, {
            error,
          });
        }
      },
    }),
  });
}

/**
 * 根据数据类型获取查询配置
 */
export function getQueryConfig<TData = unknown, TError = Error>(
  type: QueryConfigType,
  overrides?: Partial<UseQueryOptions<TData, TError>>
): UseQueryOptions<TData, TError> {
  const baseConfig = QUERY_CONFIG_BY_TYPE[type] || DEFAULT_QUERY_OPTIONS;

  return {
    ...baseConfig,
    ...overrides,
  } as UseQueryOptions<TData, TError>;
}

/**
 * 合并查询配置
 */
export function mergeQueryConfig<TData = unknown, TError = Error>(
  baseConfig: Partial<UseQueryOptions<TData, TError>>,
  overrideConfig: Partial<UseQueryOptions<TData, TError>>
): UseQueryOptions<TData, TError> {
  return {
    ...baseConfig,
    ...overrideConfig,
  } as UseQueryOptions<TData, TError>;
}

/**
 * 创建查询选项
 */
export function createQueryOptions<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  type: QueryConfigType = 'static',
  overrides?: Partial<UseQueryOptions<TData, TError>>
): UseQueryOptions<TData, TError> {
  const baseConfig = getQueryConfig<TData, TError>(type);

  return {
    queryKey,
    queryFn,
    ...baseConfig,
    ...overrides,
  };
}

/**
 * 创建预取查询选项
 */
export function createPrefetchOptions<TData = unknown>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  type: QueryConfigType = 'static'
): QueryOptions<TData> {
  const config = QUERY_CONFIG_BY_TYPE[type] || DEFAULT_QUERY_OPTIONS;

  return {
    queryKey,
    queryFn,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
  };
}

/**
 * 查询客户端工具函数
 */
export const queryClientUtils = {
  /**
   * 批量失效查询
   */
  invalidateQueries: (
    queryClient: QueryClient,
    queryKeys: unknown[][],
    options?: { exact?: boolean; refetchType?: 'active' | 'inactive' | 'all' }
  ) => {
    return Promise.all(
      queryKeys.map((key) =>
        queryClient.invalidateQueries({
          queryKey: key,
          exact: options?.exact ?? false,
          refetchType: options?.refetchType ?? 'active',
        })
      )
    );
  },

  /**
   * 批量预取查询
   */
  prefetchQueries: <TData = unknown>(
    queryClient: QueryClient,
    queries: Array<{
      queryKey: unknown[];
      queryFn: () => Promise<TData>;
      type?: QueryConfigType;
    }>
  ) => {
    return Promise.all(
      queries.map(({ queryKey, queryFn, type = 'static' }) =>
        queryClient.prefetchQuery(createPrefetchOptions(queryKey, queryFn, type))
      )
    );
  },

  /**
   * 清除过期查询
   */
  removeExpiredQueries: (queryClient: QueryClient, maxAgeMs: number = 60 * 60 * 1000) => {
    const now = Date.now();
    const queries = queryClient.getQueryCache().getAll();

    queries.forEach((query) => {
      const state = query.state;
      if (state.dataUpdatedAt && now - state.dataUpdatedAt > maxAgeMs) {
        queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
      }
    });
  },

  /**
   * 获取查询统计信息
   */
  getQueryStats: (queryClient: QueryClient) => {
    const queries = queryClient.getQueryCache().getAll();
    const now = Date.now();

    return {
      totalQueries: queries.length,
      activeQueries: queries.filter((q) => q.isActive()).length,
      staleQueries: queries.filter((q) => q.isStale()).length,
      fetchingQueries: queries.filter((q) => q.isFetching()).length,
      cachedDataSize: queries.reduce((acc, q) => {
        const data = q.state.data;
        if (data) {
          return acc + JSON.stringify(data).length;
        }
        return acc;
      }, 0),
      oldestQuery: queries.reduce(
        (oldest, q) => {
          if (!oldest || q.state.dataUpdatedAt < oldest.state.dataUpdatedAt) {
            return q;
          }
          return oldest;
        },
        null as (typeof queries)[0] | null
      ),
    };
  },
};

/**
 * 全局 QueryClient 实例 (用于服务端渲染)
 */
let globalQueryClient: QueryClient | undefined;

export function getGlobalQueryClient(): QueryClient {
  if (!globalQueryClient) {
    globalQueryClient = createOptimizedQueryClient();
  }
  return globalQueryClient;
}

/**
 * 重置全局 QueryClient (用于测试)
 */
export function resetGlobalQueryClient(): void {
  globalQueryClient = undefined;
}
