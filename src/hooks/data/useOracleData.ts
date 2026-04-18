import { useQuery } from '@tanstack/react-query';

import { oracleConfigs } from '@/lib/config/oracles';
import { oracleKeys } from '@/lib/queries/queryKeys';
import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';
import { type OracleProvider } from '@/types/oracle';

export interface OracleMetadata {
  provider: OracleProvider;
  name: string;
  descriptionKey: string;
  symbol: string;
  defaultChain: string;
  supportedChains: string[];
  supportedSymbols: string[];
  updateFrequency: number;
  latency: number;
  themeColor: string;
}

interface OracleDataParams {
  provider?: OracleProvider;
}

function getOracleMetadata(provider: OracleProvider): OracleMetadata {
  const config = oracleConfigs[provider];
  const client = config.client;

  return {
    provider,
    name: config.name,
    descriptionKey: config.descriptionKey,
    symbol: config.symbol,
    defaultChain: config.defaultChain,
    supportedChains: config.supportedChains,
    supportedSymbols: client?.getSupportedSymbols() ?? [],
    updateFrequency: config.networkData.updateFrequency,
    latency: config.networkData.latency,
    themeColor: config.themeColor,
  };
}

function useOracleData(params: OracleDataParams = {}) {
  return useQuery<OracleMetadata | OracleMetadata[]>({
    queryKey: oracleKeys.list(params),
    queryFn: async () => {
      if (params.provider) {
        return getOracleMetadata(params.provider);
      }

      const providers = Object.keys(oracleConfigs) as OracleProvider[];
      return providers.map(getOracleMetadata);
    },
    staleTime: STALE_TIME_CONFIG.network,
    gcTime: GC_TIME_CONFIG.network,
  });
}

export { useOracleData };
