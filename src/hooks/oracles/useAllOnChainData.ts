'use client';

import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

import { OracleProvider, type Blockchain } from '@/types/oracle';
import type { AnyOnChainData, OnChainData } from '@/types/oracle/onChainData';

interface UseAllOnChainDataParams {
  selectedOracle: OracleProvider | null;
  selectedSymbol: string;
  selectedChain: Blockchain | null;
  queryResults: Array<{ provider: OracleProvider }>;
}

export function useAllOnChainData(params: UseAllOnChainDataParams): OnChainData {
  const { selectedOracle, selectedSymbol, selectedChain, queryResults } = params;

  const providers = useMemo(
    () => [
      OracleProvider.DIA,
      OracleProvider.WINKLINK,
      OracleProvider.REDSTONE,
      OracleProvider.SUPRA,
      OracleProvider.TWAP,
      OracleProvider.REFLECTOR,
      OracleProvider.FLARE,
    ],
    []
  );

  const results = useQueries({
    queries: providers.map((provider) => ({
      queryKey: ['oracle-on-chain', provider, selectedSymbol, selectedChain ?? 'default'],
      queryFn: async ({ signal }: { signal: AbortSignal }): Promise<AnyOnChainData | null> => {
        const params = new URLSearchParams({ provider, symbol: selectedSymbol });
        if (selectedChain) params.set('chain', selectedChain);
        const response = await fetch(`/api/oracles/on-chain?${params}`, { signal });
        if (!response.ok) throw new Error(`Failed to fetch ${provider} details`);
        const body = (await response.json()) as { data?: AnyOnChainData | null };
        return body.data ?? null;
      },
      enabled:
        !!selectedSymbol &&
        (!selectedOracle ||
          selectedOracle === provider ||
          queryResults.some((result) => result.provider === provider)),
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });

  const getResult = (provider: OracleProvider) => results[providers.indexOf(provider)];
  const dia = getResult(OracleProvider.DIA);
  const winklink = getResult(OracleProvider.WINKLINK);
  const redstone = getResult(OracleProvider.REDSTONE);
  const supra = getResult(OracleProvider.SUPRA);
  const twap = getResult(OracleProvider.TWAP);
  const reflector = getResult(OracleProvider.REFLECTOR);
  const flare = getResult(OracleProvider.FLARE);

  return {
    diaOnChainData: dia?.data ?? null,
    isDIADataLoading: dia?.isLoading ?? false,
    winklinkOnChainData: winklink?.data ?? null,
    isWINkLinkDataLoading: winklink?.isLoading ?? false,
    redstoneOnChainData: redstone?.data ?? null,
    isRedStoneDataLoading: redstone?.isLoading ?? false,
    supraOnChainData: supra?.data ?? null,
    isSupraDataLoading: supra?.isLoading ?? false,
    twapOnChainData: twap?.data ?? null,
    isTwapDataLoading: twap?.isLoading ?? false,
    reflectorOnChainData: reflector?.data ?? null,
    isReflectorDataLoading: reflector?.isLoading ?? false,
    flareOnChainData: flare?.data ?? null,
    isFlareDataLoading: flare?.isLoading ?? false,
  };
}
