'use client';

import { useDIAOnChainData, type UseDIAOnChainDataReturn } from './useDIAOnChainData';
import { useWINkLinkOnChainData, type UseWINkLinkOnChainDataReturn } from './useWINkLinkOnChainData';
import { useRedStoneOnChainData, type UseRedStoneOnChainDataReturn } from './useRedStoneOnChainData';
import { useSupraOnChainData, type UseSupraOnChainDataReturn } from './useSupraOnChainData';
import type { OracleProvider } from '@/types/oracle';
import type { Blockchain } from '@/types/oracle';

export interface UseOnChainDataByProviderOptions {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export type OnChainDataReturn =
  | UseDIAOnChainDataReturn
  | UseWINkLinkOnChainDataReturn
  | UseRedStoneOnChainDataReturn
  | UseSupraOnChainDataReturn;

export function useOnChainDataByProvider(
  options: UseOnChainDataByProviderOptions
): OnChainDataReturn {
  const { provider, symbol, chain, enabled = true } = options;

  const diaResult = useDIAOnChainData({ symbol, chain, enabled: enabled && provider === 'dia' });
  const winklinkResult = useWINkLinkOnChainData({ symbol, enabled: enabled && provider === 'winklink' });
  const redstoneResult = useRedStoneOnChainData({ symbol, enabled: enabled && provider === 'redstone' });
  const supraResult = useSupraOnChainData({ symbol, enabled: enabled && provider === 'supra' });

  switch (provider) {
    case 'dia':
      return diaResult;
    case 'winklink':
      return winklinkResult;
    case 'redstone':
      return redstoneResult;
    case 'supra':
      return supraResult;
    default:
      return {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: async () => {},
      };
  }
}
