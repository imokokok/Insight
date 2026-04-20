import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

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

  const chainResults: Partial<Record<Blockchain, ChainQueryResult>> = useMemo(() => {
    const results: Partial<Record<Blockchain, ChainQueryResult>> = {};
    chains.forEach((chain, index) => {
      const priceResult = priceQueries[index];

      results[chain] = {
        price: priceResult.data ?? null,
        isPriceLoading: priceResult.isLoading,
        priceError: priceResult.error ?? null,
      };
    });
    return results;
  }, [chains, priceQueries]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    priceQueries.forEach((r) => {
      if (r.error) errs.push(r.error);
    });
    return errs;
  }, [priceQueries]);

  const isLoading = useMemo(
    () => priceQueries.length > 0 && priceQueries.some((r) => r.isLoading),
    [priceQueries]
  );
  const isFetching = useMemo(() => priceQueries.some((r) => r.isFetching), [priceQueries]);

  return { chainResults, isLoading, isFetching, errors };
}
