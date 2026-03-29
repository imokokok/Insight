'use client';

import { useCallback, useMemo, useRef } from 'react';

import { useQueries, useQueryClient } from '@tanstack/react-query';

import { createLogger } from '@/lib/utils/logger';
import { Blockchain, type OracleProvider } from '@/types/oracle';

import {
  oracleClients,
  type PriceComparisonData,
  type PriceHistoryPoint,
} from './crossOracleConfig';

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

interface UseCrossOraclePricesOptions {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  enabled?: boolean;
  refetchInterval?: number | false;
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
}: UseCrossOraclePricesOptions): UseCrossOraclePricesReturn {
  const queryClient = useQueryClient();
  const priceHistoryRef = useRef<Record<OracleProvider, PriceHistoryPoint[]>>(
    {} as Record<OracleProvider, PriceHistoryPoint[]>
  );
  const previousPriceMapRef = useRef<Map<OracleProvider, number>>(new Map());

  const getQueryKey = useCallback(
    (provider: OracleProvider) => [
      CROSS_ORACLE_QUERY_KEY,
      'price',
      provider,
      selectedSymbol,
      Blockchain.ETHEREUM,
    ],
    [selectedSymbol]
  );

  const updatePriceHistory = useCallback((results: OraclePriceResult[]) => {
    results.forEach((result) => {
      if (!priceHistoryRef.current[result.provider]) {
        priceHistoryRef.current[result.provider] = [];
      }
      priceHistoryRef.current[result.provider] = [
        ...priceHistoryRef.current[result.provider].slice(-(MAX_HISTORY_POINTS - 1)),
        { timestamp: result.timestamp, price: result.price },
      ];
    });
  }, []);

  const queries = useQueries({
    queries: selectedOracles.map((provider) => ({
      queryKey: getQueryKey(provider),
      queryFn: async (): Promise<OraclePriceResult | null> => {
        const client = oracleClients[provider];
        const requestStart = Date.now();
        try {
          const price = await client.getPrice(selectedSymbol, Blockchain.ETHEREUM);
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
            `Error fetching price from ${provider}`,
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
    })),
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

  useMemo(() => {
    if (validResults.length > 0) {
      updatePriceHistory(validResults);
      validResults.forEach((result) => {
        previousPriceMapRef.current.set(result.provider, result.price);
      });
    }
  }, [validResults, updatePriceHistory]);

  const priceData = useMemo((): PriceComparisonData[] => {
    return validResults.map((result) => ({
      ...result,
      previousPrice: previousPriceMapRef.current.get(result.provider),
    }));
  }, [validResults]);

  const refetchAll = useCallback(async () => {
    await Promise.all(refetchFns.map((refetch) => refetch()));
  }, [refetchFns]);

  const priceHistory = useMemo(() => ({ ...priceHistoryRef.current }), [validResults]);

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
    async (symbol: string, providers: OracleProvider[]) => {
      const prefetchPromises = providers.map((provider) =>
        queryClient.prefetchQuery({
          queryKey: [CROSS_ORACLE_QUERY_KEY, 'price', provider, symbol, Blockchain.ETHEREUM],
          queryFn: async () => {
            const client = oracleClients[provider];
            const requestStart = Date.now();
            try {
              const price = await client.getPrice(symbol, Blockchain.ETHEREUM);
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
                `Error prefetching price from ${provider}`,
                error instanceof Error ? error : new Error(String(error))
              );
              return null;
            }
          },
          staleTime: CROSS_ORACLE_STALE_TIME.price,
          gcTime: CROSS_ORACLE_GC_TIME.price,
        })
      );
      await Promise.allSettled(prefetchPromises);
    },
    [queryClient]
  );

  return {
    clearHistory,
    prefetchOraclePrices,
  };
}
