import { useEffect, useCallback, useRef } from 'react';

import { getDefaultFactory, type BaseOracleClient } from '@/lib/oracles';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { type AnomalousPricePoint } from '../utils/anomalyDetection';

import { useDataFetching } from './index';

interface UseCrossChainDataStateReturn {
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
  anomalies: AnomalousPricePoint[];
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useCrossChainDataState(): UseCrossChainDataStateReturn {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const setSelectedBaseChain = useCrossChainSelectorStore((s) => s.setSelectedBaseChain);

  const setVisibleChains = useCrossChainUIStore((s) => s.setVisibleChains);

  const refreshInterval = useCrossChainConfigStore((s) => s.refreshInterval);

  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const historicalPrices = useCrossChainDataStore((s) => s.historicalPrices);
  const loading = useCrossChainDataStore((s) => s.loading);
  const refreshStatus = useCrossChainDataStore((s) => s.refreshStatus);
  const showRefreshSuccess = useCrossChainDataStore((s) => s.showRefreshSuccess);
  const lastUpdated = useCrossChainDataStore((s) => s.lastUpdated);
  const recommendedBaseChain = useCrossChainDataStore((s) => s.recommendedBaseChain);
  const prevStats = useCrossChainDataStore((s) => s.prevStats);
  const anomalies = useCrossChainDataStore((s) => s.anomalies);
  const setCurrentPrices = useCrossChainDataStore((s) => s.setCurrentPrices);
  const setHistoricalPrices = useCrossChainDataStore((s) => s.setHistoricalPrices);
  const setLoading = useCrossChainDataStore((s) => s.setLoading);
  const setRefreshStatus = useCrossChainDataStore((s) => s.setRefreshStatus);
  const setShowRefreshSuccess = useCrossChainDataStore((s) => s.setShowRefreshSuccess);
  const setLastUpdated = useCrossChainDataStore((s) => s.setLastUpdated);
  const setPrevStats = useCrossChainDataStore((s) => s.setPrevStats);
  const setRecommendedBaseChain = useCrossChainDataStore((s) => s.setRecommendedBaseChain);
  const setAnomalies = useCrossChainDataStore((s) => s.setAnomalies);
  const setCrossChainComparison = useCrossChainDataStore((s) => s.setCrossChainComparison);
  const setFetchData = useCrossChainDataStore((s) => s.setFetchData);
  const setClearCache = useCrossChainDataStore((s) => s.setClearCache);
  const setClearCacheForProvider = useCrossChainDataStore((s) => s.setClearCacheForProvider);

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
      setAnomalies,
      setCrossChainComparison,
    },
    refreshInterval || undefined
  );

  const fetchData = useCallback(async () => {
    await fetchDataInternal();
  }, [fetchDataInternal]);

  useEffect(() => {
    setFetchData(fetchData);
  }, [fetchData, setFetchData]);

  useEffect(() => {
    setClearCache(clearCache);
  }, [clearCache, setClearCache]);

  useEffect(() => {
    setClearCacheForProvider(clearCacheForProvider);
  }, [clearCacheForProvider, setClearCacheForProvider]);

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
      setHistoricalPrices({});
      setLastUpdated(null);
      setRefreshStatus('idle');
    }
  }, [
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    setCurrentPrices,
    setHistoricalPrices,
    setLastUpdated,
    setRefreshStatus,
  ]);

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
    anomalies,
    clearCache,
    clearCacheForProvider,
  };
}
