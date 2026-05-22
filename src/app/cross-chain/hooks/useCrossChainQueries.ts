import { useMemo, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { crossChainKeys } from '@/lib/queryKeys';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

interface ChainQueryResult {
  price: PriceData | null;
  isPriceLoading: boolean;
  priceError: Error | null;
}

interface UseCrossChainQueriesReturn {
  chainResults: Partial<Record<Blockchain, ChainQueryResult>>;
  isLoading: boolean;
  isFetching: boolean;
  errors: Error[];
  triggerForceRefresh: () => void;
  resetForceRefresh: () => void;
}

export function useCrossChainQueries(
  provider: OracleProvider,
  symbol: string,
  chains: Blockchain[],
  period: number,
  refetchInterval?: number
): UseCrossChainQueriesReturn {
  const resolvedRefetchInterval: number | false =
    refetchInterval !== undefined && refetchInterval > 0 ? refetchInterval : false;

  const forceRefreshRef = useRef(false);

  const query = useQuery({
    queryKey: [
      ...crossChainKeys.byProvider(provider, symbol, String(period)),
      'batch',
      chains.join(','),
    ],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const shouldForceRefresh = forceRefreshRef.current;
      return oracleApiClient.fetchBatchPrices({
        provider,
        symbol,
        chains,
        signal,
        forceRefresh: shouldForceRefresh,
      });
    },
    staleTime: 10_000,
    enabled: !!symbol && chains.length > 0,
    refetchInterval: resolvedRefetchInterval,
    placeholderData: (previousData: Map<Blockchain, PriceData> | undefined) => previousData,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });

  const triggerForceRefresh = useMemo(
    () => () => {
      forceRefreshRef.current = true;
    },
    []
  );

  const resetForceRefresh = useMemo(
    () => () => {
      forceRefreshRef.current = false;
    },
    []
  );

  const chainResults: Partial<Record<Blockchain, ChainQueryResult>> = useMemo(() => {
    const results: Partial<Record<Blockchain, ChainQueryResult>> = {};
    const data = query.data;

    for (const chain of chains) {
      const priceData = data?.get(chain) ?? null;
      results[chain] = {
        price: priceData,
        isPriceLoading: query.isLoading && !priceData,
        priceError: query.error && !priceData ? query.error : null,
      };
    }
    return results;
  }, [chains, query.data, query.isLoading, query.error]);

  const errors = useMemo(() => {
    if (query.error) return [query.error];
    return [];
  }, [query.error]);

  const isLoading = query.isLoading;
  const isFetching = query.isFetching;

  return { chainResults, isLoading, isFetching, errors, triggerForceRefresh, resetForceRefresh };
}
