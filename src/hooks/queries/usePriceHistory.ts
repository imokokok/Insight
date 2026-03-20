import { useQuery } from '@tanstack/react-query';
import { priceKeys } from '@/lib/queries/queryKeys';
import { PriceFetchError } from '@/lib/errors';
import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';
import type { PriceDataForChart } from '@/types/oracle/price';

interface PriceHistoryParams {
  symbol: string;
  provider?: string;
  chain?: string;
  period?: number;
}

export function usePriceHistory(params: PriceHistoryParams) {
  return useQuery<PriceDataForChart[]>({
    queryKey: priceKeys.history(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('symbol', params.symbol);
      if (params.provider) searchParams.set('provider', params.provider);
      if (params.chain) searchParams.set('chain', params.chain);
      if (params.period) searchParams.set('period', params.period.toString());

      const response = await fetch(`/api/oracles/history?${searchParams.toString()}`);

      if (!response.ok) {
        throw new PriceFetchError('Failed to fetch price history', {
          symbol: params.symbol,
          provider: params.provider,
          chain: params.chain,
          retryable: true,
        });
      }

      const data = await response.json();
      return data.history || [];
    },
    enabled: !!params.symbol,
    staleTime: STALE_TIME_CONFIG.history,
    gcTime: GC_TIME_CONFIG.history,
  });
}
