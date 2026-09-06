import { useEffect, useMemo, useRef } from 'react';

import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import { getOracleChains } from '@/lib/oracles/metadata';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useDataFetching } from './index';

interface UseCrossChainDataStateReturn {
  currentPrices: PriceData[];
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  lastUpdated: Date | null;
  recommendedBaseChain: Blockchain | null;
  supportedChains: Blockchain[];
  fetchData: () => Promise<void>;
}

export function useCrossChainDataState(): UseCrossChainDataStateReturn {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const metadata = useDynamicSymbols();
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const setSelectedBaseChain = useCrossChainSelectorStore((s) => s.setSelectedBaseChain);

  const setVisibleChains = useCrossChainUIStore((s) => s.setVisibleChains);

  const refreshInterval = useCrossChainConfigStore((s) => s.refreshInterval);

  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const loading = useCrossChainDataStore((s) => s.loading);
  const refreshStatus = useCrossChainDataStore((s) => s.refreshStatus);
  const showRefreshSuccess = useCrossChainDataStore((s) => s.showRefreshSuccess);
  const lastUpdated = useCrossChainDataStore((s) => s.lastUpdated);
  const recommendedBaseChain = useCrossChainDataStore((s) => s.recommendedBaseChain);
  const setCurrentPrices = useCrossChainDataStore((s) => s.setCurrentPrices);
  const setLastUpdated = useCrossChainDataStore((s) => s.setLastUpdated);
  const setRefreshStatus = useCrossChainDataStore((s) => s.setRefreshStatus);
  const setCrossChainComparison = useCrossChainDataStore((s) => s.setCrossChainComparison);
  const setFetchData = useCrossChainDataStore((s) => s.setFetchData);

  const supportedChains = useMemo(
    () => getOracleChains(metadata, selectedProvider),
    [metadata, selectedProvider]
  );

  const { fetchData: fetchDataInternal } = useDataFetching(
    selectedProvider,
    supportedChains,
    {
      selectedSymbol,
      selectedTimeRange,
    },
    refreshInterval || undefined
  );

  useEffect(() => {
    setFetchData(fetchDataInternal);
    return () => setFetchData(null);
  }, [fetchDataInternal, setFetchData]);

  const prevParamsRef = useRef({
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
  });

  useEffect(() => {
    const paramsChanged =
      prevParamsRef.current.selectedProvider !== selectedProvider ||
      prevParamsRef.current.selectedSymbol !== selectedSymbol ||
      prevParamsRef.current.selectedTimeRange !== selectedTimeRange;

    if (paramsChanged) {
      prevParamsRef.current = {
        selectedProvider,
        selectedSymbol,
        selectedTimeRange,
      };

      setCurrentPrices([]);
      setLastUpdated(null);
      setRefreshStatus('idle');
      setCrossChainComparison([]);
    }
  }, [
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    setCurrentPrices,
    setLastUpdated,
    setRefreshStatus,
    setCrossChainComparison,
  ]);

  const prevSupportedChainsRef = useRef<Blockchain[]>([]);
  useEffect(() => {
    if (supportedChains.length > 0) {
      const prevChains = prevSupportedChainsRef.current;
      const chainsChanged =
        prevChains.length !== supportedChains.length ||
        prevChains.some((c, i) => c !== supportedChains[i]);
      if (chainsChanged) {
        prevSupportedChainsRef.current = supportedChains;
        setVisibleChains([...supportedChains]);
      }
    }
  }, [supportedChains, setVisibleChains]);

  useEffect(() => {
    if (supportedChains.length > 0 && !selectedBaseChain) {
      setSelectedBaseChain(recommendedBaseChain || supportedChains[0]);
    }
    if (
      supportedChains.length > 0 &&
      selectedBaseChain &&
      !supportedChains.includes(selectedBaseChain)
    ) {
      setSelectedBaseChain(recommendedBaseChain || supportedChains[0]);
    }
  }, [supportedChains, selectedBaseChain, recommendedBaseChain, setSelectedBaseChain]);

  return {
    currentPrices,
    loading,
    refreshStatus,
    showRefreshSuccess,
    lastUpdated,
    recommendedBaseChain,
    supportedChains,
    fetchData: fetchDataInternal,
  };
}
