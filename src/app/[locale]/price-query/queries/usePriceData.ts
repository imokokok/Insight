'use client';

import {
  useQuery,
  useQueries,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';

import { getOracleClient, extractBaseSymbol } from '@/lib/oracles';
import { GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';
import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';

import { CACHE_CONFIG, priceCache } from '../utils/cacheUtils';

import { priceQueryKeys } from './queryKeys';

export interface UsePriceDataOptions {
  provider: OracleProvider;
  chain: Blockchain;
  symbol: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number;
}

export interface UsePriceDataReturn {
  data: PriceData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isFetching: boolean;
  dataUpdatedAt: number | undefined;
  clearCache: () => void;
  cacheStats: { size: number; remainingTTL: number };
}

export function usePriceData(options: UsePriceDataOptions): UsePriceDataReturn {
  const {
    provider,
    chain,
    symbol,
    enabled = true,
    staleTime = CACHE_CONFIG.PRICE_TTL,
    gcTime = GC_TIME_CONFIG.price,
    retry = 2,
  } = options;

  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: priceQueryKeys.price(provider, chain, symbol),
    queryFn: async (): Promise<PriceData> => {
      const queryCacheKey = priceQueryKeys.price(provider, chain, symbol).join(':');
      const cachedData = priceCache.get(queryCacheKey) as PriceData | undefined;
      if (cachedData) {
        return cachedData;
      }

      const client = getOracleClient(provider);
      const baseSymbol = extractBaseSymbol(symbol);
      const priceData = await client.getPrice(baseSymbol, chain);
      const result = {
        ...priceData,
        provider,
        chain,
      };

      priceCache.set(queryCacheKey, result, CACHE_CONFIG.PRICE_TTL);

      return result;
    },
    enabled,
    staleTime,
    gcTime,
    retry,
    refetchOnWindowFocus: false,
  });

  const clearCache = () => {
    const queryCacheKey = priceQueryKeys.price(provider, chain, symbol).join(':');
    priceCache.clear(queryCacheKey);
    queryClient.removeQueries({
      queryKey: priceQueryKeys.price(provider, chain, symbol),
    });
  };

  const cacheStats = {
    size: priceCache.getSize(),
    remainingTTL: priceCache.getRemainingTTL(
      priceQueryKeys.price(provider, chain, symbol).join(':')
    ),
  };

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: async () => {
      const queryCacheKey = priceQueryKeys.price(provider, chain, symbol).join(':');
      priceCache.clear(queryCacheKey);
      await queryResult.refetch();
    },
    isFetching: queryResult.isFetching,
    dataUpdatedAt: queryResult.dataUpdatedAt,
    clearCache,
    cacheStats,
  };
}

export interface MultiPriceQuery {
  provider: OracleProvider;
  chain: Blockchain;
  symbol: string;
}

export interface UseMultiPriceDataOptions {
  queries: MultiPriceQuery[];
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number;
}

export function useMultiPriceData(
  options: UseMultiPriceDataOptions
): UseQueryResult<PriceData, Error>[] {
  const {
    queries,
    enabled = true,
    staleTime = CACHE_CONFIG.PRICE_TTL,
    gcTime = GC_TIME_CONFIG.price,
    retry = 2,
  } = options;

  return useQueries({
    queries: queries.map((query): UseQueryOptions<PriceData, Error, PriceData> => {
      const queryCacheKey = priceQueryKeys
        .price(query.provider, query.chain, query.symbol)
        .join(':');

      return {
        queryKey: priceQueryKeys.price(query.provider, query.chain, query.symbol),
        queryFn: async (): Promise<PriceData> => {
          const cachedData = priceCache.get(queryCacheKey) as PriceData | undefined;
          if (cachedData) {
            return cachedData;
          }

          const client = getOracleClient(query.provider);
          const baseSymbol = extractBaseSymbol(query.symbol);
          const priceData = await client.getPrice(baseSymbol, query.chain);
          const result = {
            ...priceData,
            provider: query.provider,
            chain: query.chain,
          };

          priceCache.set(queryCacheKey, result, CACHE_CONFIG.PRICE_TTL);

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

export { priceQueryKeys };
export type { UseQueryOptions, UseQueryResult };
