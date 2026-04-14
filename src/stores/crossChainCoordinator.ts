import { useEffect, useCallback, useRef } from 'react';

import { useCrossChainDataStore } from './crossChainDataStore';
import { useCrossChainSelectorStore } from './crossChainSelectorStore';

interface UseCrossChainCoordinatorOptions {
  fetchData: () => Promise<void>;
}

interface UseCrossChainCoordinatorReturn {
  refresh: () => void;
  isLoading: boolean;
  error: boolean;
}

export function useCrossChainCoordinator(
  options: UseCrossChainCoordinatorOptions
): UseCrossChainCoordinatorReturn {
  const { fetchData } = options;

  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);

  const loading = useCrossChainDataStore((s) => s.loading);
  const refreshStatus = useCrossChainDataStore((s) => s.refreshStatus);

  const setCurrentPrices = useCrossChainDataStore((s) => s.setCurrentPrices);
  const setHistoricalPrices = useCrossChainDataStore((s) => s.setHistoricalPrices);
  const setLastUpdated = useCrossChainDataStore((s) => s.setLastUpdated);
  const setRefreshStatus = useCrossChainDataStore((s) => s.setRefreshStatus);

  const prevParamsRef = useRef({
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    selectedBaseChain,
  });
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const isInitialLoad = isInitialLoadRef.current;
    const prev = prevParamsRef.current;

    const providerChanged = prev.selectedProvider !== selectedProvider;
    const symbolChanged = prev.selectedSymbol !== selectedSymbol;
    const timeRangeChanged = prev.selectedTimeRange !== selectedTimeRange;
    const baseChainChanged = prev.selectedBaseChain !== selectedBaseChain;

    const dataParamsChanged = providerChanged || symbolChanged || timeRangeChanged;

    if (isInitialLoad || dataParamsChanged || baseChainChanged) {
      prevParamsRef.current = {
        selectedProvider,
        selectedSymbol,
        selectedTimeRange,
        selectedBaseChain,
      };
      isInitialLoadRef.current = false;

      if (providerChanged || symbolChanged) {
        setCurrentPrices([]);
        setHistoricalPrices({});
        setLastUpdated(null);
        setRefreshStatus('idle');
      } else if (timeRangeChanged) {
        setHistoricalPrices({});
        setRefreshStatus('idle');
      }

      fetchData();
    }
  }, [
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    selectedBaseChain,
    setCurrentPrices,
    setHistoricalPrices,
    setLastUpdated,
    setRefreshStatus,
    fetchData,
  ]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    refresh,
    isLoading: loading,
    error: refreshStatus === 'error',
  };
}
