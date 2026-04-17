import { useEffect, useCallback, useRef } from 'react';

import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  getDefaultFactory,
  type BaseOracleClient,
} from '@/lib/oracles';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';

import { useDataValidation, useAnomalyDetection, useDataFetching } from './index';

export interface UseCrossChainDataStateReturn {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  lastUpdated: Date | null;
  recommendedBaseChain: Blockchain | null;
  supportedChains: Blockchain[];
  currentClient: BaseOracleClient;
  fetchData: () => Promise<void>;
  prevStats: {
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  } | null;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useCrossChainDataState(): UseCrossChainDataStateReturn {
  const { selectedProvider, selectedSymbol, selectedTimeRange } = useCrossChainSelectorStore();

  const { setVisibleChains } = useCrossChainUIStore();
  const { selectedBaseChain, setSelectedBaseChain } = useCrossChainSelectorStore();
  const { refreshInterval } = useCrossChainConfigStore();

  const {
    currentPrices,
    historicalPrices,
    loading,
    refreshStatus,
    showRefreshSuccess,
    lastUpdated,
    recommendedBaseChain,
    prevStats,
    setCurrentPrices,
    setHistoricalPrices,
    setLoading,
    setRefreshStatus,
    setShowRefreshSuccess,
    setLastUpdated,
    setPrevStats,
    setRecommendedBaseChain,
  } = useCrossChainDataStore();

  const dataValidation = useDataValidation();
  const anomalyDetection = useAnomalyDetection();
  const currentClient = getDefaultFactory().getClient(selectedProvider);
  const supportedChains = currentClient.supportedChains;

  const {
    fetchData: fetchDataInternal,
    clearCache,
    clearCacheForProvider,
  } = useDataFetching(
    selectedProvider,
    supportedChains,
    {
      selectedSymbol,
      selectedTimeRange,
      setCurrentPrices,
      setHistoricalPrices,
      setPrevStats,
      setRecommendedBaseChain,
      setLastUpdated,
      setRefreshStatus,
      setShowRefreshSuccess,
      setLoading,
    },
    dataValidation,
    anomalyDetection
  );

  const fetchData = useCallback(async () => {
    await fetchDataInternal();
  }, [fetchDataInternal]);

  const prevParamsRef = useRef({
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
  });
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const isInitialLoad = isInitialLoadRef.current;
    const paramsChanged =
      prevParamsRef.current.selectedProvider !== selectedProvider ||
      prevParamsRef.current.selectedSymbol !== selectedSymbol ||
      prevParamsRef.current.selectedTimeRange !== selectedTimeRange;

    if (isInitialLoad || paramsChanged) {
      prevParamsRef.current = {
        selectedProvider,
        selectedSymbol,
        selectedTimeRange,
      };
      isInitialLoadRef.current = false;

      setCurrentPrices([]);
      setHistoricalPrices({});
      setLastUpdated(null);
      setRefreshStatus('idle');

      fetchData();
    }

    return () => {};
  }, [
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    fetchData,
    setCurrentPrices,
    setHistoricalPrices,
    setLastUpdated,
    setRefreshStatus,
  ]);

  useEffect(() => {
    if (refreshInterval === 0) return;
    const intervalId = setInterval(() => fetchData(), refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  // 当支持的链变化时（包括切换预言机），自动更新可见链为所有支持的链
  useEffect(() => {
    if (supportedChains.length > 0) {
      setVisibleChains([...supportedChains]);
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
    historicalPrices,
    loading,
    refreshStatus,
    showRefreshSuccess,
    lastUpdated,
    recommendedBaseChain,
    supportedChains,
    currentClient,
    fetchData,
    prevStats,
    clearCache,
    clearCacheForProvider,
  };
}
