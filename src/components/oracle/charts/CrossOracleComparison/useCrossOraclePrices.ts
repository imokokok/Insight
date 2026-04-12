'use client';

import { useCallback, useMemo, useRef } from 'react';

import { useQueries, useQueryClient } from '@tanstack/react-query';

import { OracleClientFactory, extractBaseSymbol } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import { getRequestQueue, type RequestPriority } from '@/lib/utils/requestQueue';
import { Blockchain, type OracleProvider } from '@/types/oracle';

import { type PriceComparisonData, type PriceHistoryPoint } from './crossOracleConfig';

const logger = createLogger('useCrossOraclePrices');

export const CROSS_ORACLE_QUERY_KEY = 'cross-oracle-comparison' as const;

const MAX_HISTORY_POINTS = 100;

export const CROSS_ORACLE_STALE_TIME = {
  price: 15 * 1000,
  comparison: 30 * 1000,
} as const;

export const CROSS_ORACLE_GC_TIME = {
  price: 60 * 1000,
  comparison: 2 * 60 * 1000,
} as const;

/**
 * 获取预言机的默认链
 * 根据预言机类型选择最适合的链，而不是强制使用 Ethereum
 */
function getOracleDefaultChain(provider: OracleProvider): Blockchain {
  const client = OracleClientFactory.getClient(provider);
  // 优先使用客户端支持的第一个链
  if (client.supportedChains.length > 0) {
    return client.supportedChains[0];
  }
  // 回退到 Ethereum
  return Blockchain.ETHEREUM;
}

interface UseCrossOraclePricesOptions {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  enabled?: boolean;
  refetchInterval?: number | false;
  requestTimeout?: number;
  requestPriority?: RequestPriority;
}

interface OraclePriceResult {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime: number;
}

interface UseCrossOraclePricesReturn {
  priceData: PriceComparisonData[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  lastUpdated: Date | null;
  refetchAll: () => Promise<void>;
  priceHistory: Record<OracleProvider, PriceHistoryPoint[]>;
}

export function useCrossOraclePrices({
  selectedSymbol,
  selectedOracles,
  enabled = true,
  refetchInterval = false,
  requestTimeout,
  requestPriority = 'normal',
}: UseCrossOraclePricesOptions): UseCrossOraclePricesReturn {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _queryClient = useQueryClient();

  const getQueryKey = useCallback(
    (provider: OracleProvider) => {
      const chain = getOracleDefaultChain(provider);
      return [CROSS_ORACLE_QUERY_KEY, 'price', provider, selectedSymbol, chain];
    },
    [selectedSymbol]
  );

  const queries = useQueries({
    queries: selectedOracles.map((provider) => {
      const chain = getOracleDefaultChain(provider);
      return {
        queryKey: getQueryKey(provider),
        queryFn: async (): Promise<OraclePriceResult | null> => {
          const client = OracleClientFactory.getClient(provider);
          const requestStart = Date.now();
          const baseSymbol = extractBaseSymbol(selectedSymbol);
          const requestQueue = getRequestQueue();
          try {
            const price = await requestQueue.add(() => client.getPrice(baseSymbol, chain), {
              priority: requestPriority,
              timeout: requestTimeout,
            });
            const responseTime = Date.now() - requestStart;
            return {
              provider,
              price: price.price,
              timestamp: price.timestamp,
              confidence: price.confidence,
              responseTime,
            };
          } catch (error) {
            logger.error(
              `Error fetching price from ${provider} on ${chain}`,
              error instanceof Error ? error : new Error(String(error))
            );
            return null;
          }
        },
        enabled,
        staleTime: CROSS_ORACLE_STALE_TIME.price,
        gcTime: CROSS_ORACLE_GC_TIME.price,
        refetchInterval,
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: 1000,
      };
    }),
    combine: (results) => {
      const validResults: OraclePriceResult[] = results
        .map((r) => r.data)
        .filter((d): d is OraclePriceResult => d !== null);

      const isLoading = results.some((r) => r.isLoading);
      const isError = results.some((r) => r.isError);
      const errors = results.map((r) => r.error).filter(Boolean) as Error[];

      const lastUpdated =
        validResults.length > 0
          ? new Date(Math.max(...validResults.map((r) => r.timestamp)))
          : null;

      return {
        validResults,
        isLoading,
        isError,
        errors,
        lastUpdated,
        refetchFns: results.map((r) => r.refetch),
      };
    },
  });

  const { validResults, isLoading, isError, errors, lastUpdated, refetchFns } = queries;

  const priceHistoryRef = useRef<Record<OracleProvider, PriceHistoryPoint[]>>(
    {} as Record<OracleProvider, PriceHistoryPoint[]>
  );
  const previousPriceRef = useRef<Map<OracleProvider, number>>(new Map());

  /* eslint-disable react-hooks/refs */
  const priceHistory = useMemo(() => {
    const history = { ...priceHistoryRef.current };
    validResults.forEach((result) => {
      if (!history[result.provider]) {
        history[result.provider] = [];
      }
      history[result.provider] = [
        ...history[result.provider].slice(-(MAX_HISTORY_POINTS - 1)),
        { timestamp: result.timestamp, price: result.price },
      ];
      previousPriceRef.current.set(result.provider, result.price);
    });
    priceHistoryRef.current = history;
    return history;
  }, [validResults]);

  const priceData = useMemo((): PriceComparisonData[] => {
    return validResults.map((result) => ({
      ...result,
      previousPrice: previousPriceRef.current.get(result.provider),
    }));
  }, [validResults]);
  /* eslint-enable react-hooks/refs */

  const refetchAll = useCallback(async () => {
    await Promise.all(refetchFns.map((refetch) => refetch()));
  }, [refetchFns]);

  return {
    priceData,
    isLoading,
    isError,
    errors,
    lastUpdated,
    refetchAll,
    priceHistory,
  };
}

export function useCrossOracleHistory() {
  const queryClient = useQueryClient();

  const clearHistory = useCallback(
    (provider?: OracleProvider) => {
      if (provider) {
        queryClient.removeQueries({
          queryKey: [CROSS_ORACLE_QUERY_KEY, 'price', provider],
          exact: false,
        });
      } else {
        queryClient.removeQueries({
          queryKey: [CROSS_ORACLE_QUERY_KEY],
          exact: false,
        });
      }
    },
    [queryClient]
  );

  const prefetchOraclePrices = useCallback(
    async (
      symbol: string,
      providers: OracleProvider[],
      options?: { timeout?: number; priority?: RequestPriority }
    ) => {
      const baseSymbol = extractBaseSymbol(symbol);
      const requestQueue = getRequestQueue();
      const prefetchPromises = providers.map((provider) => {
        const chain = getOracleDefaultChain(provider);
        return queryClient.prefetchQuery({
          queryKey: [CROSS_ORACLE_QUERY_KEY, 'price', provider, symbol, chain],
          queryFn: async () => {
            const client = OracleClientFactory.getClient(provider);
            const requestStart = Date.now();
            try {
              const price = await requestQueue.add(() => client.getPrice(baseSymbol, chain), {
                priority: options?.priority ?? 'normal',
                timeout: options?.timeout,
              });
              const responseTime = Date.now() - requestStart;
              return {
                provider,
                price: price.price,
                timestamp: price.timestamp,
                confidence: price.confidence,
                responseTime,
              };
            } catch (error) {
              logger.error(
                `Error prefetching price from ${provider} on ${chain}`,
                error instanceof Error ? error : new Error(String(error))
              );
              return null;
            }
          },
          staleTime: CROSS_ORACLE_STALE_TIME.price,
          gcTime: CROSS_ORACLE_GC_TIME.price,
        });
      });
      await Promise.allSettled(prefetchPromises);
    },
    [queryClient]
  );

  return {
    clearHistory,
    prefetchOraclePrices,
  };
}
