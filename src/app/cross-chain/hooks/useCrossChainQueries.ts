import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { crossChainKeys } from '@/lib/queryKeys';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

export interface ChainQueryResult {
  price: PriceData | null;
  historical: PriceData[];
  isPriceLoading: boolean;
  isHistoricalLoading: boolean;
  priceError: Error | null;
  historicalError: Error | null;
}

export interface UseCrossChainQueriesReturn {
  chainResults: Partial<Record<Blockchain, ChainQueryResult>>;
  isLoading: boolean;
  isFetching: boolean;
  errors: Error[];
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

  const priceQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: [...crossChainKeys.byProvider(provider, symbol, String(period)), 'price', chain],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        oracleApiClient.fetchPrice({ provider, symbol, chain, signal }),
      staleTime: 30_000,
      enabled: !!symbol,
      refetchInterval: resolvedRefetchInterval,
    })),
  });

  const historicalQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: [
        ...crossChainKeys.byProvider(provider, symbol, String(period)),
        'historical',
        chain,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        oracleApiClient.fetchHistorical({ provider, symbol, chain, period, signal }),
      staleTime: 60_000,
      enabled: !!symbol,
      refetchInterval: resolvedRefetchInterval,
    })),
  });

  const chainResults: Partial<Record<Blockchain, ChainQueryResult>> = useMemo(() => {
    const results: Partial<Record<Blockchain, ChainQueryResult>> = {};
    chains.forEach((chain, index) => {
      const priceResult = priceQueries[index];
      const historicalResult = historicalQueries[index];

      results[chain] = {
        price: priceResult.data ?? null,
        historical: historicalResult.data ?? [],
        isPriceLoading: priceResult.isLoading,
        isHistoricalLoading: historicalResult.isLoading,
        priceError: priceResult.error ?? null,
        historicalError: historicalResult.error ?? null,
      };
    });
    return results;
  }, [chains, priceQueries, historicalQueries]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    priceQueries.forEach((r) => {
      if (r.error) errs.push(r.error);
    });
    historicalQueries.forEach((r) => {
      if (r.error) errs.push(r.error);
    });
    return errs;
  }, [priceQueries, historicalQueries]);

  const isLoading = useMemo(
    () =>
      priceQueries.length > 0 && [...priceQueries, ...historicalQueries].some((r) => r.isLoading),
    [priceQueries, historicalQueries]
  );
  const isFetching = useMemo(
    () => [...priceQueries, ...historicalQueries].some((r) => r.isFetching),
    [priceQueries, historicalQueries]
  );

  return { chainResults, isLoading, isFetching, errors };
}
