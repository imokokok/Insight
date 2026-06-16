'use client';

import { OracleProvider, type Blockchain } from '@/types/oracle';
import type { OnChainData } from '@/types/oracle/onChainData';

import { useDIAOnChainData } from './useDIAOnChainData';
import { useFlareOnChainData } from './useFlareOnChainData';
import { useRedStoneOnChainData } from './useRedStoneOnChainData';
import { useReflectorOnChainData } from './useReflectorOnChainData';
import { useSupraOnChainData } from './useSupraOnChainData';
import { useTwapOnChainData } from './useTwapOnChainData';
import { useWINkLinkOnChainData } from './useWINkLinkOnChainData';

interface UseAllOnChainDataParams {
  selectedOracle: OracleProvider | null;
  selectedSymbol: string;
  selectedChain: Blockchain | null;
  queryResults: Array<{ provider: OracleProvider }>;
}

export function useAllOnChainData(params: UseAllOnChainDataParams): OnChainData {
  const { selectedOracle, selectedSymbol, selectedChain, queryResults } = params;

  const shouldFetch = (provider: OracleProvider) =>
    !selectedOracle ||
    selectedOracle === provider ||
    queryResults.some((r) => r.provider === provider);

  const enabled = (provider: OracleProvider) => shouldFetch(provider) && !!selectedSymbol;

  const { data: diaOnChainData, isLoading: isDIADataLoading } = useDIAOnChainData({
    symbol: selectedSymbol,
    chain: selectedChain ?? undefined,
    enabled: enabled(OracleProvider.DIA),
  });

  const { data: winklinkOnChainData, isLoading: isWINkLinkDataLoading } = useWINkLinkOnChainData({
    symbol: selectedSymbol,
    enabled: enabled(OracleProvider.WINKLINK),
  });

  const { data: redstoneOnChainData, isLoading: isRedStoneDataLoading } = useRedStoneOnChainData({
    symbol: selectedSymbol,
    enabled: enabled(OracleProvider.REDSTONE),
  });

  const { data: supraOnChainData, isLoading: isSupraDataLoading } = useSupraOnChainData({
    symbol: selectedSymbol,
    enabled: enabled(OracleProvider.SUPRA),
  });

  const { data: twapOnChainData, isLoading: isTwapDataLoading } = useTwapOnChainData({
    symbol: selectedSymbol,
    chain: selectedChain ?? undefined,
    enabled: enabled(OracleProvider.TWAP),
  });

  const { data: reflectorOnChainData, isLoading: isReflectorDataLoading } = useReflectorOnChainData(
    {
      symbol: selectedSymbol,
      enabled: enabled(OracleProvider.REFLECTOR),
    }
  );

  const { data: flareOnChainData, isLoading: isFlareDataLoading } = useFlareOnChainData({
    symbol: selectedSymbol,
    enabled: enabled(OracleProvider.FLARE),
  });

  return {
    diaOnChainData,
    isDIADataLoading,
    winklinkOnChainData,
    isWINkLinkDataLoading,
    redstoneOnChainData,
    isRedStoneDataLoading,
    supraOnChainData,
    isSupraDataLoading,
    twapOnChainData,
    isTwapDataLoading,
    reflectorOnChainData,
    isReflectorDataLoading,
    flareOnChainData,
    isFlareDataLoading,
  };
}
