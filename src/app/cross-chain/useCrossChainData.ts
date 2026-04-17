'use client';

import { useMemo } from 'react';

import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';

import { useCrossChainChart } from './hooks/useCrossChainChart';
import { useCrossChainDataState } from './hooks/useCrossChainDataState';
import { useCrossChainExport } from './hooks/useCrossChainExport';
import { useCrossChainSelector } from './hooks/useCrossChainSelector';
import { useCrossChainStatistics } from './hooks/useCrossChainStatistics';
import { useCrossChainTable } from './hooks/useCrossChainTable';
import { useCrossChainUI } from './hooks/useCrossChainUI';
import { type UseCrossChainDataReturn } from './types';

export function useCrossChainData(): UseCrossChainDataReturn {
  const selector = useCrossChainSelector();
  const ui = useCrossChainUI();
  const dataState = useCrossChainDataState();

  const filteredChains = useMemo(
    () => dataState.supportedChains.filter((chain) => ui.visibleChains.includes(chain)),
    [dataState.supportedChains, ui.visibleChains]
  );

  const statistics = useCrossChainStatistics({
    currentPrices: dataState.currentPrices,
    historicalPrices: dataState.historicalPrices,
    filteredChains,
    selectedTimeRange: selector.selectedTimeRange,
    currentClient: dataState.currentClient,
    selectedBaseChain: selector.selectedBaseChain,
  });

  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);

  const chart = useCrossChainChart({
    currentPrices: dataState.currentPrices,
    historicalPrices: dataState.historicalPrices,
    filteredChains,
    selectedBaseChain: selector.selectedBaseChain,
    selectedTimeRange: selector.selectedTimeRange,
    showMA: ui.showMA,
    maPeriod: ui.maPeriod,
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
    selectedBaseChain: selector.selectedBaseChain,
    thresholdConfig,
  });

  const exportHook = useCrossChainExport({
    selectedProvider: selector.selectedProvider,
    selectedSymbol: selector.selectedSymbol,
    selectedBaseChain: selector.selectedBaseChain,
    priceDifferences: chart.priceDifferences,
    historicalPrices: dataState.historicalPrices,
    filteredChains,
    avgPrice: statistics.avgPrice,
    maxPrice: statistics.maxPrice,
    minPrice: statistics.minPrice,
    priceRange: statistics.priceRange,
    standardDeviationPercent: statistics.standardDeviationPercent,
    totalDataPoints: chart.totalDataPoints,
    visibleChains: ui.visibleChains,
    clearCache: dataState.clearCache,
    clearCacheForProvider: dataState.clearCacheForProvider,
  });

  return {
    selectedProvider: selector.selectedProvider,
    setSelectedProvider: selector.setSelectedProvider,
    selectedSymbol: selector.selectedSymbol,
    setSelectedSymbol: selector.setSelectedSymbol,
    selectedTimeRange: selector.selectedTimeRange,
    setSelectedTimeRange: selector.setSelectedTimeRange,
    selectedBaseChain: selector.selectedBaseChain,
    setSelectedBaseChain: selector.setSelectedBaseChain,
    visibleChains: ui.visibleChains,
    setVisibleChains: ui.setVisibleChains,
    showMA: ui.showMA,
    setShowMA: ui.setShowMA,
    maPeriod: ui.maPeriod,
    setMaPeriod: ui.setMaPeriod,
    chartKey: ui.chartKey,
    setChartKey: ui.setChartKey,
    hiddenLines: ui.hiddenLines,
    setHiddenLines: ui.setHiddenLines,
    focusedChain: ui.focusedChain,
    setFocusedChain: ui.setFocusedChain,
    tableFilter: ui.tableFilter,
    setTableFilter: ui.setTableFilter,
    hoveredCell: ui.hoveredCell,
    setHoveredCell: ui.setHoveredCell,
    selectedCell: ui.selectedCell,
    setSelectedCell: ui.setSelectedCell,
    tooltipPosition: ui.tooltipPosition,
    setTooltipPosition: ui.setTooltipPosition,
    refreshInterval: selector.refreshInterval,
    setRefreshInterval: selector.setRefreshInterval,
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
    sortColumn: ui.sortColumn,
    setSortColumn: ui.setSortColumn,
    sortDirection: ui.sortDirection,
    setSortDirection: ui.setSortDirection,
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

export { type UseCrossChainDataReturn } from './types';
