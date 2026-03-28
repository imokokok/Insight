'use client';

import {
  useQuery,
  useQueries,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';

import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';
import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';
import { getOracleClient } from '@/lib/oracles';

import { priceQueryKeys } from './queryKeys';
import { CACHE_CONFIG, historicalCache, createCacheKey } from '../utils/cacheUtils';

export interface UseHistoricalDataOptions {
  provider: OracleProvider;
  chain: Blockchain;
  symbol: string;
  timeRange: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number;
}

export interface UseHistoricalDataReturn {
  data: PriceData[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isFetching: boolean;
  dataUpdatedAt: number | undefined;
  clearCache: () => void;
  cacheStats: { size: number; remainingTTL: number };
}

export function useHistoricalData(options: UseHistoricalDataOptions): UseHistoricalDataReturn {
  const {
    provider,
    chain,
    symbol,
    timeRange,
    enabled = true,
    staleTime = CACHE_CONFIG.HISTORICAL_TTL,
    gcTime = GC_TIME_CONFIG.history,
    retry = 2,
  } = options;

  const queryClient = useQueryClient();
  const cacheKey = createCacheKey('historical', provider, chain, symbol, timeRange);

  const queryResult = useQuery({
    queryKey: priceQueryKeys.historicalData(provider, chain, symbol, timeRange),
    queryFn: async (): Promise<PriceData[]> => {
      const cachedData = historicalCache.get(cacheKey) as PriceData[] | undefined;
      if (cachedData) {
        return cachedData;
      }

      const client = getOracleClient(provider);
      const historicalData = await client.getHistoricalPrices(symbol, chain, timeRange);
      const result = historicalData.map((data) => ({
        ...data,
        provider,
        chain,
      }));

      historicalCache.set(cacheKey, result, CACHE_CONFIG.HISTORICAL_TTL);

      return result;
    },
    enabled,
    staleTime,
    gcTime,
    retry,
    refetchOnWindowFocus: false,
  });

  const clearCache = () => {
    historicalCache.clear(cacheKey);
    queryClient.removeQueries({
      queryKey: priceQueryKeys.historicalData(provider, chain, symbol, timeRange),
    });
  };

  const cacheStats = {
    size: historicalCache.getSize(),
    remainingTTL: historicalCache.getRemainingTTL(cacheKey),
  };

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: async () => {
      historicalCache.clear(cacheKey);
      await queryResult.refetch();
    },
    isFetching: queryResult.isFetching,
    dataUpdatedAt: queryResult.dataUpdatedAt,
    clearCache,
    cacheStats,
  };
}

export interface HistoricalDataQuery {
  provider: OracleProvider;
  chain: Blockchain;
  symbol: string;
  timeRange: number;
}

export interface UseMultiHistoricalDataOptions {
  queries: HistoricalDataQuery[];
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number;
}

export function useMultiHistoricalData(
  options: UseMultiHistoricalDataOptions
): UseQueryResult<PriceData[], Error>[] {
  const {
    queries,
    enabled = true,
    staleTime = CACHE_CONFIG.HISTORICAL_TTL,
    gcTime = GC_TIME_CONFIG.history,
    retry = 2,
  } = options;

  return useQueries({
    queries: queries.map((query): UseQueryOptions<PriceData[], Error, PriceData[]> => {
      const cacheKey = createCacheKey(
        'historical',
        query.provider,
        query.chain,
        query.symbol,
        query.timeRange
      );

      return {
        queryKey: priceQueryKeys.historicalData(
          query.provider,
          query.chain,
          query.symbol,
          query.timeRange
        ),
        queryFn: async (): Promise<PriceData[]> => {
          const cachedData = historicalCache.get(cacheKey) as PriceData[] | undefined;
          if (cachedData) {
            return cachedData;
          }

          const client = getOracleClient(query.provider);
          const historicalData = await client.getHistoricalPrices(
            query.symbol,
            query.chain,
            query.timeRange
          );
          const result = historicalData.map((data) => ({
            ...data,
            provider: query.provider,
            chain: query.chain,
          }));

          historicalCache.set(cacheKey, result, CACHE_CONFIG.HISTORICAL_TTL);

          return result;
        },
        enabled,
        staleTime,
        gcTime,
        retry,
        refetchOnWindowFocus: false,
      };
    }),
  });
}

export interface UseComparisonDataOptions {
  symbol: string;
  providers: OracleProvider[];
  chains: Blockchain[];
  primaryTimeRange: number;
  compareTimeRange?: number;
  enabled?: boolean;
}

export interface ComparisonDataSet {
  provider: OracleProvider;
  chain: Blockchain;
  primaryData: PriceData[] | undefined;
  compareData: PriceData[] | undefined;
  isPrimaryLoading: boolean;
  isCompareLoading: boolean;
}

export function useComparisonData(options: UseComparisonDataOptions): ComparisonDataSet[] {
  const { symbol, providers, chains, primaryTimeRange, compareTimeRange, enabled = true } = options;

  const primaryQueries: HistoricalDataQuery[] = [];
  const compareQueries: HistoricalDataQuery[] = [];

  for (const provider of providers) {
    const client = getOracleClient(provider);
    const supportedChains = client.supportedChains;

    for (const chain of chains) {
      if (supportedChains.includes(chain)) {
        primaryQueries.push({ provider, chain, symbol, timeRange: primaryTimeRange });

        if (compareTimeRange) {
          compareQueries.push({ provider, chain, symbol, timeRange: compareTimeRange });
        }
      }
    }
  }

  const primaryResults = useMultiHistoricalData({ queries: primaryQueries, enabled });
  const compareResults = useMultiHistoricalData({
    queries: compareQueries,
    enabled: enabled && !!compareTimeRange,
  });

  const result: ComparisonDataSet[] = [];

  primaryQueries.forEach((query, index) => {
    const compareIndex = compareQueries.findIndex(
      (cq) => cq.provider === query.provider && cq.chain === query.chain
    );

    result.push({
      provider: query.provider,
      chain: query.chain,
      primaryData: primaryResults[index]?.data,
      compareData: compareIndex >= 0 ? compareResults[compareIndex]?.data : undefined,
      isPrimaryLoading: primaryResults[index]?.isLoading ?? false,
      isCompareLoading:
        compareIndex >= 0 ? (compareResults[compareIndex]?.isLoading ?? false) : false,
    });
  });

  return result;
}

export { priceQueryKeys };
export type { UseQueryOptions, UseQueryResult };
