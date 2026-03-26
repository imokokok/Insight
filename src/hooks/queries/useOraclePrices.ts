import { useQuery } from '@tanstack/react-query';

import { PriceFetchError } from '@/lib/errors';
import { priceKeys } from '@/lib/queries/queryKeys';
import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';
import type { PriceData } from '@/types/oracle/price';

interface OraclePricesParams {
  provider?: string;
  symbols?: string[];
  chain?: string;
}

export function useOraclePrices(params: OraclePricesParams = {}) {
  return useQuery<PriceData[]>({
    queryKey: priceKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.provider) searchParams.set('provider', params.provider);
      if (params.symbols) searchParams.set('symbols', params.symbols.join(','));
      if (params.chain) searchParams.set('chain', params.chain);

      const response = await fetch(`/api/oracles?${searchParams.toString()}`);

      if (!response.ok) {
        throw new PriceFetchError('Failed to fetch oracle prices', {
          provider: params.provider,
          symbols: params.symbols,
          chain: params.chain,
          retryable: true,
        });
      }

      const data = await response.json();
      return data.prices || [];
    },
    staleTime: STALE_TIME_CONFIG.price,
    gcTime: GC_TIME_CONFIG.price,
    refetchInterval: 60 * 1000,
  });
}
