import { useCallback, useMemo, useRef } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';

import { oracleApiClient, type CrossChainBatchResult } from '@/lib/api/oracleApiClient';
import { crossChainKeys } from '@/lib/queryKeys';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

interface ChainQueryResult {
  price: PriceData | null;
  isPriceLoading: boolean;
  priceError: Error | null;
}

interface UseCrossChainQueriesReturn {
  chainResults: Partial<Record<Blockchain, ChainQueryResult>>;
  priceHistories: Map<Blockchain, PriceData[]>;
  isLoading: boolean;
  isFetching: boolean;
  errors: Error[];
  triggerForceRefresh: () => void;
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
      forceRefreshRef.current = false;
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
    refetchIntervalInBackground: false,
    placeholderData: (previousData: CrossChainBatchResult | undefined) => previousData,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const combineHistoryQueries = useCallback(
    (
      results: Array<{
        data?: PriceData[];
        error: Error | null;
        isFetching: boolean;
      }>
    ) => {
      const priceHistories = new Map<Blockchain, PriceData[]>();
      const historyErrors: Error[] = [];
      results.forEach((result, index) => {
        const chain = chains[index];
        if (chain && result.data && result.data.length > 0) {
          priceHistories.set(chain, result.data);
        }
        if (result.error) historyErrors.push(result.error);
      });
      return {
        priceHistories,
        historyErrors,
        isFetching: results.some((result) => result.isFetching),
      };
    },
    [chains]
  );

  const historyQueryState = useQueries({
    queries: chains.map((chain) => ({
      queryKey: [...crossChainKeys.byProvider(provider, symbol, String(period)), 'history', chain],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        oracleApiClient.fetchHistorical({ provider, symbol, chain, period, signal }),
      staleTime: 60_000,
      enabled: !!symbol && period > 0,
      refetchInterval: resolvedRefetchInterval,
      refetchIntervalInBackground: false,
      placeholderData: (previousData: PriceData[] | undefined) => previousData,
      refetchOnWindowFocus: false,
      retry: false,
    })),
    combine: combineHistoryQueries,
  });

  const triggerForceRefresh = useCallback(() => {
    forceRefreshRef.current = true;
  }, []);

  const chainResults: Partial<Record<Blockchain, ChainQueryResult>> = useMemo(() => {
    const results: Partial<Record<Blockchain, ChainQueryResult>> = {};
    const data = query.data?.prices;
    const errorByChain = new Map<Blockchain, string>(
      query.data?.errors.map((item) => [item.chain, item.error]) ?? []
    );

    for (const chain of chains) {
      const priceData = data?.get(chain) ?? null;
      results[chain] = {
        price: priceData,
        isPriceLoading: query.isLoading && !priceData,
        priceError: !priceData
          ? (query.error ?? (errorByChain.has(chain) ? new Error(errorByChain.get(chain)) : null))
          : null,
      };
    }
    return results;
  }, [chains, query.data, query.isLoading, query.error]);

  const priceHistories = historyQueryState.priceHistories;

  const errors = useMemo(() => {
    const nextErrors: Error[] = [];
    if (query.error) nextErrors.push(query.error);
    for (const item of query.data?.errors ?? []) {
      nextErrors.push(new Error(`${item.chain}: ${item.error}`));
    }
    nextErrors.push(...historyQueryState.historyErrors);
    return nextErrors;
  }, [query.error, query.data, historyQueryState.historyErrors]);

  const isLoading = query.isLoading;
  const isFetching = query.isFetching || historyQueryState.isFetching;

  return { chainResults, priceHistories, isLoading, isFetching, errors, triggerForceRefresh };
}
