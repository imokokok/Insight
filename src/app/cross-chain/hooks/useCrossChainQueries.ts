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
  const resolvedRefetchInterval: number | false = refetchInterval ? refetchInterval : false;

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

  const chainResults: Partial<Record<Blockchain, ChainQueryResult>> = {};
  const errors: Error[] = [];

  chains.forEach((chain, index) => {
    const priceResult = priceQueries[index];
    const historicalResult = historicalQueries[index];

    if (priceResult.error) errors.push(priceResult.error);
    if (historicalResult.error) errors.push(historicalResult.error);

    chainResults[chain] = {
      price: priceResult.data ?? null,
      historical: historicalResult.data ?? [],
      isPriceLoading: priceResult.isLoading,
      isHistoricalLoading: historicalResult.isLoading,
      priceError: priceResult.error ?? null,
      historicalError: historicalResult.error ?? null,
    };
  });

  const allQueries = [...priceQueries, ...historicalQueries];
  const isLoading = allQueries.length > 0 && allQueries.some((r) => r.isLoading);
  const isFetching = allQueries.some((r) => r.isFetching);

  return { chainResults, isLoading, isFetching, errors };
}
