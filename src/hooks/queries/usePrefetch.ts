import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  oracleKeys,
  priceKeys,
  type OracleListParams,
  type PriceHistoryParams,
  type PriceListParams,
} from '@/lib/queries/queryKeys';
import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';

interface OracleData {
  provider: string;
  name: string;
  description: string;
  supportedChains: string[];
  supportedSymbols: string[];
  totalValueSecured: number;
  updateFrequency: number;
  latency: number;
  reliability: number;
}

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
  provider: string;
  chain?: string;
}

interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export function usePrefetchOracleData() {
  const queryClient = useQueryClient();

  return useCallback(
    async (params: OracleListParams = {}) => {
      await queryClient.prefetchQuery({
        queryKey: oracleKeys.list(params),
        queryFn: async (): Promise<OracleData | OracleData[]> => {
          const url = params.provider ? `/api/oracles/${params.provider}` : '/api/oracles';
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error('Failed to fetch oracle data');
          }

          return response.json();
        },
        staleTime: STALE_TIME_CONFIG.network,
        gcTime: GC_TIME_CONFIG.network,
      });
    },
    [queryClient]
  );
}

export function usePrefetchOraclePrices() {
  const queryClient = useQueryClient();

  return useCallback(
    async (params: PriceListParams = {}) => {
      await queryClient.prefetchQuery({
        queryKey: priceKeys.list(params),
        queryFn: async (): Promise<PriceData[]> => {
          const searchParams = new URLSearchParams();
          if (params.provider) searchParams.set('provider', params.provider);
          if (params.symbols) searchParams.set('symbols', params.symbols.join(','));
          if (params.chain) searchParams.set('chain', params.chain);

          const response = await fetch(`/api/oracles?${searchParams.toString()}`);

          if (!response.ok) {
            throw new Error('Failed to fetch oracle prices');
          }

          const data = await response.json();
          return data.prices || [];
        },
        staleTime: STALE_TIME_CONFIG.price,
        gcTime: GC_TIME_CONFIG.price,
      });
    },
    [queryClient]
  );
}

export function usePrefetchPriceHistory() {
  const queryClient = useQueryClient();

  return useCallback(
    async (params: PriceHistoryParams) => {
      if (!params.symbol) return;

      await queryClient.prefetchQuery({
        queryKey: priceKeys.history(params),
        queryFn: async (): Promise<PricePoint[]> => {
          const searchParams = new URLSearchParams();
          searchParams.set('symbol', params.symbol);
          if (params.provider) searchParams.set('provider', params.provider);
          if (params.chain) searchParams.set('chain', params.chain);
          if (params.period) searchParams.set('period', params.period.toString());

          const response = await fetch(`/api/oracles/history?${searchParams.toString()}`);

          if (!response.ok) {
            throw new Error('Failed to fetch price history');
          }

          const data = await response.json();
          return data.history || [];
        },
        staleTime: STALE_TIME_CONFIG.history,
        gcTime: GC_TIME_CONFIG.history,
      });
    },
    [queryClient]
  );
}

export function useInvalidateOracleQueries() {
  const queryClient = useQueryClient();

  return useCallback(
    (provider?: string) => {
      if (provider) {
        queryClient.invalidateQueries({ queryKey: oracleKeys.detail(provider) });
      } else {
        queryClient.invalidateQueries({ queryKey: oracleKeys.all });
      }
    },
    [queryClient]
  );
}

export function useInvalidatePriceQueries() {
  const queryClient = useQueryClient();

  return useCallback(
    (symbol?: string) => {
      if (symbol) {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              key[0] === 'prices' &&
              key[1] === 'history' &&
              (key[2] as PriceHistoryParams)?.symbol === symbol
            );
          },
        });
      } else {
        queryClient.invalidateQueries({ queryKey: priceKeys.all });
      }
    },
    [queryClient]
  );
}
