import { useQuery } from '@tanstack/react-query';

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
    queryKey: ['oracle-data', params],
    queryFn: async () => {
      const url = params.provider ? `/api/oracles/${params.provider}` : '/api/oracles';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch oracle data');
      }

      return response.json();
    },
    staleTime: 60 * 1000,
  });
}
