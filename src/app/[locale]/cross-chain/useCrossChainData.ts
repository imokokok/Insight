'use client';

import { useEffect, useCallback, useMemo, useState, useRef } from 'react';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import { type OracleProvider, OracleClientFactory } from '@/lib/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useUser } from '@/stores/authStore';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';

import {
  useDataValidation,
  useAnomalyDetection,
  useDataFetching,
  useStatistics,
  useChartData,
  useExport,
  clearCache as clearDataCache,
} from './hooks';
import { type UseCrossChainDataReturn } from './types';
import { chainNames, calculateDynamicThreshold } from './utils';

export function useCrossChainData(): UseCrossChainDataReturn {
  const user = useUser();
  const { favorites: chainFavorites } = useFavorites({ configType: 'chain_config' });
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);
  const refreshSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    selectedBaseChain,
    setSelectedProvider,
    setSelectedSymbol,
    setSelectedTimeRange,
    setSelectedBaseChain,
  } = useCrossChainSelectorStore();

  const {
    visibleChains,
    showMA,
    maPeriod,
    chartKey,
    hiddenLines,
    focusedChain,
    tableFilter,
    hoveredCell,
    selectedCell,
    tooltipPosition,
    sortColumn,
    sortDirection,
    setVisibleChains,
    setShowMA,
    setMaPeriod,
    setChartKey,
    setHiddenLines,
    setFocusedChain,
    setTableFilter,
    setHoveredCell,
    setSelectedCell,
    setTooltipPosition,
    setSortColumn,
    setSortDirection,
    toggleChain,
    handleSort,
  } = useCrossChainUIStore();

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

  const { refreshInterval, setRefreshInterval } = useCrossChainConfigStore();

  const dataValidation = useDataValidation();
  const anomalyDetection = useAnomalyDetection();
  const currentClient = OracleClientFactory.getClient(selectedProvider);
  const supportedChains = currentClient.supportedChains;

  const {
    fetchData: fetchDataInternal,
    clearCache,
    clearCacheForProvider,
  } = useDataFetching(
    selectedProvider,
    currentClient,
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

  const filteredChains = useMemo(
    () => supportedChains.filter((chain) => visibleChains.includes(chain)),
    [supportedChains, visibleChains]
  );

  const statistics = useStatistics({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedTimeRange,
    currentClient,
  });

  const chartDataResult = useChartData({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedBaseChain,
    selectedTimeRange,
    showMA,
    maPeriod,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    standardDeviation: statistics.standardDeviation,
    medianPrice: statistics.medianPrice,
  });

  const sortedPriceDifferences = useMemo(() => {
    const thresholdConfig = useCrossChainConfigStore.getState().thresholdConfig;
    const allHistoricalPrices: number[] = [];
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      allHistoricalPrices.push(...prices);
    });
    const dynamicThreshold = calculateDynamicThreshold(allHistoricalPrices, thresholdConfig);
    let filtered = [...chartDataResult.priceDifferences];

    if (tableFilter === 'abnormal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) > dynamicThreshold);
    } else if (tableFilter === 'normal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) <= dynamicThreshold);
    }

    const baseChainItem = filtered.find((item) => item.chain === selectedBaseChain);
    const otherItems = filtered.filter((item) => item.chain !== selectedBaseChain);

    otherItems.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'chain':
          comparison = chainNames[a.chain].localeCompare(chainNames[b.chain]);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'diff':
          comparison = a.diff - b.diff;
          break;
        case 'diffPercent':
          comparison = a.diffPercent - b.diffPercent;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return baseChainItem ? [baseChainItem, ...otherItems] : otherItems;
  }, [
    chartDataResult.priceDifferences,
    sortColumn,
    sortDirection,
    selectedBaseChain,
    tableFilter,
    historicalPrices,
    filteredChains,
  ]);

  const chainsWithHighDeviation = useMemo(() => {
    const thresholdConfig = useCrossChainConfigStore.getState().thresholdConfig;
    const allHistoricalPrices: number[] = [];
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      allHistoricalPrices.push(...prices);
    });
    const dynamicThreshold = calculateDynamicThreshold(allHistoricalPrices, thresholdConfig);
    return chartDataResult.priceDifferences.filter(
      (item) => Math.abs(item.diffPercent) > dynamicThreshold
    );
  }, [chartDataResult.priceDifferences, historicalPrices, filteredChains]);

  const exportHook = useExport({
    selectedProvider,
    selectedSymbol,
    selectedBaseChain,
    priceDifferences: chartDataResult.priceDifferences,
    historicalPrices,
    filteredChains,
    avgPrice: statistics.avgPrice,
    maxPrice: statistics.maxPrice,
    minPrice: statistics.minPrice,
    priceRange: statistics.priceRange,
    standardDeviationPercent: statistics.standardDeviationPercent,
    totalDataPoints: chartDataResult.totalDataPoints,
  });

  const fetchData = useCallback(async () => {
    await fetchDataInternal();
  }, [fetchDataInternal]);

  // 使用 ref 来跟踪之前的参数和初始加载状态
  const prevParamsRef = useRef({
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
  });
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // 检测参数是否真正发生变化或是初始加载
    const isInitialLoad = isInitialLoadRef.current;
    const paramsChanged =
      prevParamsRef.current.selectedProvider !== selectedProvider ||
      prevParamsRef.current.selectedSymbol !== selectedSymbol ||
      prevParamsRef.current.selectedTimeRange !== selectedTimeRange;

    if (isInitialLoad || paramsChanged) {
      // 更新 ref
      prevParamsRef.current = {
        selectedProvider,
        selectedSymbol,
        selectedTimeRange,
      };
      isInitialLoadRef.current = false;

      // 清理旧数据，避免显示过期数据
      setCurrentPrices([]);
      setHistoricalPrices({});
      setLastUpdated(null);
      setRefreshStatus('idle');

      // 获取新数据
      fetchData();
    }

    return () => clearDataCache();
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
    return () => {
      if (refreshSuccessTimerRef.current) clearTimeout(refreshSuccessTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (refreshInterval === 0) return;
    const intervalId = setInterval(() => fetchData(), refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  useEffect(() => {
    if (supportedChains.length > 0 && visibleChains.length === 0) {
      setVisibleChains([...supportedChains]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportedChains, visibleChains.length]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportedChains, selectedBaseChain, recommendedBaseChain]);

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      chain: selectedProvider,
      symbol: selectedSymbol,
      chains: visibleChains.map((c) => c as string),
    }),
    [selectedProvider, selectedSymbol, visibleChains]
  );

  const handleApplyFavorite = useCallback((config: FavoriteConfig) => {
    if (config.chain) setSelectedProvider(config.chain as OracleProvider);
    if (config.symbol) setSelectedSymbol(config.symbol);
    if (config.chains) setVisibleChains(config.chains.filter(isBlockchain));
    setShowFavoritesDropdown(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    selectedProvider,
    setSelectedProvider,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    selectedBaseChain,
    setSelectedBaseChain,
    visibleChains,
    setVisibleChains,
    showMA,
    setShowMA,
    maPeriod,
    setMaPeriod,
    chartKey,
    setChartKey,
    hiddenLines,
    setHiddenLines,
    focusedChain,
    setFocusedChain,
    tableFilter,
    setTableFilter,
    hoveredCell,
    setHoveredCell,
    selectedCell,
    setSelectedCell,
    tooltipPosition,
    setTooltipPosition,
    refreshInterval,
    setRefreshInterval,
    lastUpdated,
    currentPrices,
    historicalPrices,
    loading,
    refreshStatus,
    showRefreshSuccess,
    recommendedBaseChain,
    supportedChains,
    currentClient,
    fetchData,
    filteredChains,
    priceDifferences: chartDataResult.priceDifferences,
    sortedPriceDifferences,
    chartData: chartDataResult.chartData,
    chartDataWithMA: chartDataResult.chartDataWithMA,
    heatmapData: chartDataResult.heatmapData,
    maxHeatmapValue: chartDataResult.maxHeatmapValue,
    priceDistributionData: chartDataResult.priceDistributionData,
    boxPlotData: chartDataResult.boxPlotData,
    totalDataPoints: chartDataResult.totalDataPoints,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    maxPrice: statistics.maxPrice,
    minPrice: statistics.minPrice,
    priceRange: statistics.priceRange,
    variance: statistics.variance,
    standardDeviation: statistics.standardDeviation,
    standardDeviationPercent: statistics.standardDeviationPercent,
    coefficientOfVariation: statistics.coefficientOfVariation,
    medianPrice: statistics.medianPrice,
    iqrValue: statistics.iqrValue,
    skewness: statistics.skewness,
    kurtosis: statistics.kurtosis,
    confidenceInterval95: statistics.confidenceInterval95,
    iqrOutliers: chartDataResult.iqrOutliers,
    stdDevHistoricalOutliers: chartDataResult.stdDevHistoricalOutliers,
    scatterData: chartDataResult.scatterData,
    correlationMatrix: chartDataResult.correlationMatrix,
    correlationMatrixWithSignificance: chartDataResult.correlationMatrixWithSignificance,
    chainVolatility: statistics.chainVolatility,
    updateDelays: statistics.updateDelays,
    dataIntegrity: statistics.dataIntegrity,
    actualUpdateIntervals: statistics.actualUpdateIntervals,
    priceJumpFrequency: chartDataResult.priceJumpFrequency,
    priceChangePercent: chartDataResult.priceChangePercent,
    meanBinIndex: chartDataResult.meanBinIndex,
    medianBinIndex: chartDataResult.medianBinIndex,
    stdDevBinRange: chartDataResult.stdDevBinRange,
    chainsWithHighDeviation,
    prevStats,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    toggleChain,
    handleSort,
    exportToCSV: exportHook.exportToCSV,
    exportToJSON: exportHook.exportToJSON,
    user,
    chainFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
    clearCache,
    clearCacheForProvider,
  };
}

export { type UseCrossChainDataReturn } from './types';
