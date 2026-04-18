'use client';

import type { OnChainData } from '@/app/price-query/constants';
import { OracleProvider, type Blockchain } from '@/types/oracle';

import { useOnChainDataByProvider } from './useOnChainDataByProvider';

interface UseAllOnChainDataParams {
  selectedOracle: OracleProvider | null;
  selectedSymbol: string;
  selectedChain: string | null;
  queryResults: Array<{ provider: OracleProvider }>;
}

export function useAllOnChainData(params: UseAllOnChainDataParams): OnChainData {
  const { selectedOracle, selectedSymbol, selectedChain, queryResults } = params;

  const shouldFetch = (provider: OracleProvider) =>
    !selectedOracle ||
    selectedOracle === provider ||
    queryResults.some((r) => r.provider === provider);

  const enabled = (provider: OracleProvider) =>
    shouldFetch(provider) && !!selectedSymbol && queryResults.length > 0;

  const { data: diaOnChainData, isLoading: isDIADataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.DIA,
    symbol: selectedSymbol,
    chain: (selectedChain as Blockchain) || undefined,
    enabled: enabled(OracleProvider.DIA),
  });

  const { data: winklinkOnChainData, isLoading: isWINkLinkDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.WINKLINK,
    symbol: selectedSymbol,
    enabled: enabled(OracleProvider.WINKLINK),
  });

  const { data: redstoneOnChainData, isLoading: isRedStoneDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.REDSTONE,
    symbol: selectedSymbol,
    enabled: enabled(OracleProvider.REDSTONE),
  });

  const { data: supraOnChainData, isLoading: isSupraDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.SUPRA,
    symbol: selectedSymbol,
    enabled: enabled(OracleProvider.SUPRA),
  });

  const { data: twapOnChainData, isLoading: isTwapDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.TWAP,
    symbol: selectedSymbol,
    chain: (selectedChain as Blockchain) || undefined,
    enabled: enabled(OracleProvider.TWAP),
  });

  const { data: reflectorOnChainData, isLoading: isReflectorDataLoading } =
    useOnChainDataByProvider({
      provider: OracleProvider.REFLECTOR,
      symbol: selectedSymbol,
      enabled: enabled(OracleProvider.REFLECTOR),
    });

  const { data: flareOnChainData, isLoading: isFlareDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.FLARE,
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
