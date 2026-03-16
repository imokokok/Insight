import { useQuery } from '@tanstack/react-query';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useOraclePrices');

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
  provider: string;
  chain?: string;
}

interface OraclePricesParams {
  provider?: string;
  symbols?: string[];
  chain?: string;
}

export function useOraclePrices(params: OraclePricesParams = {}) {
  return useQuery<PriceData[]>({
    queryKey: ['oracle-prices', params],
    queryFn: async () => {
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
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
