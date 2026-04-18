'use client';

import { useMemo } from 'react';

import { getDefaultFactory } from '@/lib/oracles';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type Blockchain } from '@/types/oracle';

import { useChartData } from './hooks/useChartData';
import { useCrossChainDataState } from './hooks/useCrossChainDataState';
import { useCrossChainExport } from './hooks/useCrossChainExport';
import { useCrossChainTable } from './hooks/useCrossChainTable';
import { useStatistics } from './hooks/useStatistics';
import { type UseCrossChainDataReturn } from './types';
import { calculateDynamicThreshold } from './utils';

export function useCurrentClient() {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  return useMemo(() => getDefaultFactory().getClient(selectedProvider), [selectedProvider]);
}

export function useSupportedChains(): Blockchain[] {
  const currentClient = useCurrentClient();
  return currentClient.supportedChains;
}

export function useFilteredChains(): Blockchain[] {
  const supportedChains = useSupportedChains();
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  return useMemo(
    () => supportedChains.filter((chain) => visibleChains.includes(chain)),
    [supportedChains, visibleChains]
  );
}

export function useChainsWithHighDeviation() {
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const historicalPrices = useCrossChainDataStore((s) => s.historicalPrices);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const filteredChains = useFilteredChains();
  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);

  const priceDifferences = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2 || !selectedBaseChain) return [];
    const basePriceData = filteredPrices.find((p) => p.chain === selectedBaseChain);
    if (!basePriceData) return [];
    const basePrice = basePriceData.price;
    return filteredPrices.map((priceData) => {
      const diff = priceData.price - basePrice;
      const diffPercent = basePrice > 0 && priceData.price > 0 ? (diff / basePrice) * 100 : 0;
      return {
        chain: priceData.chain!,
        price: priceData.price,
        diff,
        diffPercent,
      };
    });
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const dynamicThreshold = useMemo(() => {
    const allHistoricalPrices: number[] = [];
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      allHistoricalPrices.push(...prices);
    });
    return calculateDynamicThreshold(allHistoricalPrices, thresholdConfig);
  }, [historicalPrices, filteredChains, thresholdConfig]);

  return useMemo(
    () => priceDifferences.filter((item) => Math.abs(item.diffPercent) > dynamicThreshold),
    [priceDifferences, dynamicThreshold]
  );
}

export function useCrossChainData(): UseCrossChainDataReturn {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const setSelectedProvider = useCrossChainSelectorStore((s) => s.setSelectedProvider);
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useCrossChainSelectorStore((s) => s.setSelectedSymbol);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const setSelectedTimeRange = useCrossChainSelectorStore((s) => s.setSelectedTimeRange);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const setSelectedBaseChain = useCrossChainSelectorStore((s) => s.setSelectedBaseChain);
  const refreshInterval = useCrossChainConfigStore((s) => s.refreshInterval);
  const setRefreshInterval = useCrossChainConfigStore((s) => s.setRefreshInterval);

  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  const setVisibleChains = useCrossChainUIStore((s) => s.setVisibleChains);
  const showMA = useCrossChainUIStore((s) => s.showMA);
  const setShowMA = useCrossChainUIStore((s) => s.setShowMA);
  const maPeriod = useCrossChainUIStore((s) => s.maPeriod);
  const setMaPeriod = useCrossChainUIStore((s) => s.setMaPeriod);
  const chartKey = useCrossChainUIStore((s) => s.chartKey);
  const setChartKey = useCrossChainUIStore((s) => s.setChartKey);
  const hiddenLines = useCrossChainUIStore((s) => s.hiddenLines);
  const setHiddenLines = useCrossChainUIStore((s) => s.setHiddenLines);
  const focusedChain = useCrossChainUIStore((s) => s.focusedChain);
  const setFocusedChain = useCrossChainUIStore((s) => s.setFocusedChain);
  const tableFilter = useCrossChainUIStore((s) => s.tableFilter);
  const setTableFilter = useCrossChainUIStore((s) => s.setTableFilter);
  const sortColumn = useCrossChainUIStore((s) => s.sortColumn);
  const setSortColumn = useCrossChainUIStore((s) => s.setSortColumn);
  const sortDirection = useCrossChainUIStore((s) => s.sortDirection);
  const setSortDirection = useCrossChainUIStore((s) => s.setSortDirection);

  const dataState = useCrossChainDataState();

  const filteredChains = useMemo(
    () => dataState.supportedChains.filter((chain) => visibleChains.includes(chain)),
    [dataState.supportedChains, visibleChains]
  );

  const statistics = useStatistics({
    currentPrices: dataState.currentPrices,
    historicalPrices: dataState.historicalPrices,
    filteredChains,
    selectedTimeRange,
    currentClient: dataState.currentClient,
    selectedBaseChain,
  });

  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);

  const chart = useChartData({
    currentPrices: dataState.currentPrices,
    historicalPrices: dataState.historicalPrices,
    filteredChains,
    selectedBaseChain,
    selectedTimeRange,
    showMA,
    maPeriod,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    standardDeviation: statistics.standardDeviation,
    medianPrice: statistics.medianPrice,
    thresholdConfig,
  });

  const table = useCrossChainTable({
    priceDifferences: chart.priceDifferences,
    historicalPrices: dataState.historicalPrices,
    filteredChains,
    selectedBaseChain,
    thresholdConfig,
  });

  const exportHook = useCrossChainExport({
    selectedProvider,
    selectedSymbol,
    selectedBaseChain,
    priceDifferences: chart.priceDifferences,
    historicalPrices: dataState.historicalPrices,
    filteredChains,
    avgPrice: statistics.avgPrice,
    maxPrice: statistics.maxPrice,
    minPrice: statistics.minPrice,
    priceRange: statistics.priceRange,
    standardDeviationPercent: statistics.standardDeviationPercent,
    totalDataPoints: chart.totalDataPoints,
    visibleChains,
    clearCache: dataState.clearCache,
    clearCacheForProvider: dataState.clearCacheForProvider,
  });

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
    refreshInterval,
    setRefreshInterval,
    lastUpdated: dataState.lastUpdated,
    currentPrices: dataState.currentPrices,
    historicalPrices: dataState.historicalPrices,
    loading: dataState.loading,
    refreshStatus: dataState.refreshStatus,
    showRefreshSuccess: dataState.showRefreshSuccess,
    recommendedBaseChain: dataState.recommendedBaseChain,
    supportedChains: dataState.supportedChains,
    currentClient: dataState.currentClient,
    fetchData: dataState.fetchData,
    filteredChains: table.filteredChains,
    priceDifferences: chart.priceDifferences,
    sortedPriceDifferences: table.sortedPriceDifferences,
    chartData: chart.chartData,
    chartDataWithMA: chart.chartDataWithMA,
    heatmapData: chart.heatmapData,
    maxHeatmapValue: chart.maxHeatmapValue,
    priceDistributionData: chart.priceDistributionData,
    boxPlotData: chart.boxPlotData,
    totalDataPoints: chart.totalDataPoints,
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
    iqrOutliers: chart.iqrOutliers,
    stdDevHistoricalOutliers: chart.stdDevHistoricalOutliers,
    scatterData: chart.scatterData,
    correlationMatrix: chart.correlationMatrix,
    correlationMatrixWithSignificance: chart.correlationMatrixWithSignificance,
    chainVolatility: statistics.chainVolatility,
    updateDelays: statistics.updateDelays,
    dataIntegrity: statistics.dataIntegrity,
    actualUpdateIntervals: statistics.actualUpdateIntervals,
    priceJumpFrequency: chart.priceJumpFrequency,
    priceChangePercent: chart.priceChangePercent,
    meanBinIndex: chart.meanBinIndex,
    medianBinIndex: chart.medianBinIndex,
    stdDevBinRange: chart.stdDevBinRange,
    chainsWithHighDeviation: table.chainsWithHighDeviation,
    prevStats: dataState.prevStats,
    anomalies: dataState.anomalies,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    toggleChain: table.toggleChain,
    handleSort: table.handleSort,
    exportToCSV: exportHook.exportToCSV,
    exportToJSON: exportHook.exportToJSON,
    user: exportHook.user,
    chainFavorites: exportHook.chainFavorites,
    currentFavoriteConfig: exportHook.currentFavoriteConfig,
    showFavoritesDropdown: exportHook.showFavoritesDropdown,
    setShowFavoritesDropdown: exportHook.setShowFavoritesDropdown,
    favoritesDropdownRef: exportHook.favoritesDropdownRef,
    handleApplyFavorite: exportHook.handleApplyFavorite,
    clearCache: exportHook.clearCache,
    clearCacheForProvider: exportHook.clearCacheForProvider,
  };
}
