'use client';

import type { Blockchain, OracleProvider } from '@/types/oracle';

import { useDIAOnChainData, type UseDIAOnChainDataReturn } from './useDIAOnChainData';
import {
  useRedStoneOnChainData,
  type UseRedStoneOnChainDataReturn,
} from './useRedStoneOnChainData';
import { useSupraOnChainData, type UseSupraOnChainDataReturn } from './useSupraOnChainData';
import { useTwapOnChainData, type UseTwapOnChainDataReturn } from './useTwapOnChainData';
import {
  useWINkLinkOnChainData,
  type UseWINkLinkOnChainDataReturn,
} from './useWINkLinkOnChainData';

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
  | UseSupraOnChainDataReturn
  | UseTwapOnChainDataReturn;

export function useOnChainDataByProvider(
  options: UseOnChainDataByProviderOptions
): OnChainDataReturn {
  const { provider, symbol, chain, enabled = true } = options;

  const diaResult = useDIAOnChainData({ symbol, chain, enabled: enabled && provider === 'dia' });
  const winklinkResult = useWINkLinkOnChainData({
    symbol,
    enabled: enabled && provider === 'winklink',
  });
  const redstoneResult = useRedStoneOnChainData({
    symbol,
    enabled: enabled && provider === 'redstone',
  });
  const supraResult = useSupraOnChainData({ symbol, enabled: enabled && provider === 'supra' });
  const twapResult = useTwapOnChainData({ symbol, chain, enabled: enabled && provider === 'twap' });

  switch (provider) {
    case 'dia':
      return diaResult;
    case 'winklink':
      return winklinkResult;
    case 'redstone':
      return redstoneResult;
    case 'supra':
      return supraResult;
    case 'twap':
      return twapResult;
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
