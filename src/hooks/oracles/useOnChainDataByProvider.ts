'use client';

import type { Blockchain, OracleProvider } from '@/types/oracle';

import { useDIAOnChainData, type UseDIAOnChainDataReturn } from './useDIAOnChainData';
import { useFlareOnChainData, type UseFlareOnChainDataReturn } from './useFlareOnChainData';
import {
  useRedStoneOnChainData,
  type UseRedStoneOnChainDataReturn,
} from './useRedStoneOnChainData';
import {
  useReflectorOnChainData,
  type UseReflectorOnChainDataReturn,
} from './useReflectorOnChainData';
import { useSupraOnChainData, type UseSupraOnChainDataReturn } from './useSupraOnChainData';
import { useTwapOnChainData, type UseTwapOnChainDataReturn } from './useTwapOnChainData';
import {
  useWINkLinkOnChainData,
  type UseWINkLinkOnChainDataReturn,
} from './useWINkLinkOnChainData';

interface UseOnChainDataByProviderOptions {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

type OnChainDataReturn =
  | UseDIAOnChainDataReturn
  | UseWINkLinkOnChainDataReturn
  | UseRedStoneOnChainDataReturn
  | UseSupraOnChainDataReturn
  | UseTwapOnChainDataReturn
  | UseReflectorOnChainDataReturn
  | UseFlareOnChainDataReturn;

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
  const reflectorResult = useReflectorOnChainData({
    symbol,
    enabled: enabled && provider === 'reflector',
  });
  const flareResult = useFlareOnChainData({
    symbol,
    enabled: enabled && provider === 'flare',
  });

  const results: Record<OracleProvider, OnChainDataReturn> = {
    dia: diaResult,
    winklink: winklinkResult,
    redstone: redstoneResult,
    supra: supraResult,
    twap: twapResult,
    reflector: reflectorResult,
    flare: flareResult,
    chainlink: {
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: async () => {},
    },
    pyth: { data: null, isLoading: false, isError: false, error: null, refetch: async () => {} },
    api3: { data: null, isLoading: false, isError: false, error: null, refetch: async () => {} },
  };

  return (
    results[provider] ?? {
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: async () => {},
    }
  );
}
