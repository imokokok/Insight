import { useQuery } from '@tanstack/react-query';

interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

interface PriceHistoryParams {
  symbol: string;
  provider?: string;
  chain?: string;
  period?: number;
}

export function usePriceHistory(params: PriceHistoryParams) {
  return useQuery<PricePoint[]>({
    queryKey: ['price-history', params],
    queryFn: async () => {
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
    enabled: !!params.symbol,
    staleTime: 5 * 60 * 1000,
  });
}
