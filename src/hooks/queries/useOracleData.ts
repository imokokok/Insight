import { useQuery } from '@tanstack/react-query';
import { oracleKeys } from '@/lib/queries/queryKeys';
import { PriceFetchError } from '@/lib/errors';
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

interface OracleDataParams {
  provider?: string;
}

export function useOracleData(params: OracleDataParams = {}) {
  return useQuery<OracleData | OracleData[]>({
    queryKey: oracleKeys.list(params),
    queryFn: async () => {
      const url = params.provider ? `/api/oracles/${params.provider}` : '/api/oracles';

      const response = await fetch(url);

      if (!response.ok) {
        throw new PriceFetchError('Failed to fetch oracle data', {
          provider: params.provider,
          retryable: true,
        });
      }

      return response.json();
    },
    staleTime: STALE_TIME_CONFIG.network,
    gcTime: GC_TIME_CONFIG.network,
  });
}
