import { useEffect, useMemo, useRef } from 'react';

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
  const loading = useCrossChainDataStore((s) => s.loading);
  const refreshStatus = useCrossChainDataStore((s) => s.refreshStatus);
  const showRefreshSuccess = useCrossChainDataStore((s) => s.showRefreshSuccess);
  const lastUpdated = useCrossChainDataStore((s) => s.lastUpdated);
  const recommendedBaseChain = useCrossChainDataStore((s) => s.recommendedBaseChain);
  const prevStats = useCrossChainDataStore((s) => s.prevStats);
  const anomalies = useCrossChainDataStore((s) => s.anomalies);
  const setCurrentPrices = useCrossChainDataStore((s) => s.setCurrentPrices);
  const setLoading = useCrossChainDataStore((s) => s.setLoading);
  const setRefreshStatus = useCrossChainDataStore((s) => s.setRefreshStatus);
  const setShowRefreshSuccess = useCrossChainDataStore((s) => s.setShowRefreshSuccess);
  const setLastUpdated = useCrossChainDataStore((s) => s.setLastUpdated);
  const setPrevStats = useCrossChainDataStore((s) => s.setPrevStats);
  const setRecommendedBaseChain = useCrossChainDataStore((s) => s.setRecommendedBaseChain);
  const setAnomalies = useCrossChainDataStore((s) => s.setAnomalies);
  const setCrossChainComparison = useCrossChainDataStore((s) => s.setCrossChainComparison);
  const registerFetchData = useCrossChainDataStore((s) => s.registerFetchData);
  const registerClearCache = useCrossChainDataStore((s) => s.registerClearCache);
  const registerClearCacheForProvider = useCrossChainDataStore(
    (s) => s.registerClearCacheForProvider
  );

  const currentClient = useMemo(
    () => getDefaultFactory().getClient(selectedProvider),
    [selectedProvider]
  );
  const supportedChains = useMemo(() => currentClient.supportedChains, [currentClient]);

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

  useEffect(() => {
    registerFetchData(fetchDataInternal);
  }, [fetchDataInternal, registerFetchData]);

  useEffect(() => {
    registerClearCache(clearCache);
  }, [clearCache, registerClearCache]);

  useEffect(() => {
    registerClearCacheForProvider(clearCacheForProvider);
  }, [clearCacheForProvider, registerClearCacheForProvider]);

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
    }
  }, [
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    setCurrentPrices,
    setLastUpdated,
    setRefreshStatus,
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
    currentClient,
    fetchData: fetchDataInternal,
    prevStats,
    anomalies,
    clearCache,
    clearCacheForProvider,
  };
}
