'use client';

import { useMemo } from 'react';

import { LiveStatusBar } from '@/components/ui';
import { chartColors } from '@/lib/config/colors';

import {
  HeaderSection,
  StatsOverview,
  ComparisonTabs,
  ExportSection,
  FullscreenChart,
  StatsSection,
} from './components';
import { useTabNavigation, useCrossOraclePage } from './hooks';

import type { TabId } from './components/TabNavigation';

export default function CrossOraclePage() {
  const {
    selectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    priceData,
    isLoading,
    lastUpdated,
    sortColumn,
    sortDirection,
    timeRange,
    setTimeRange,
    lastStats,
    historyMinMax,
    zoomLevel,
    deviationFilter,
    setDeviationFilter,
    oracleFilter,
    setOracleFilter,
    expandedRow,
    setExpandedRow,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    filterPanelRef,
    isChartFullscreen,
    setIsChartFullscreen,
    selectedSnapshot,
    setSelectedSnapshot,
    showComparison,
    setShowComparison,
    selectedRowIndex,
    hoveredRowIndex,
    chartContainerRef,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    useAccessibleColors,
    setUseAccessibleColors,
    hoveredOracle,
    setHoveredOracle,
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,
    getOracleLatencyData,
    t,
    user,
    oracleFavorites,
    currentFavoriteConfig,
    validPrices,
    avgPrice,
    weightedAvgPrice,
    maxPrice,
    minPrice,
    priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    currentStats,
    filteredPriceData,
    activeFilterCount,
    outlierStats,
    oracleChartColors,
    getChartData,
    heatmapData,
    boxPlotData,
    volatilityData,
    correlationData,
    performanceData,
    maData,
    qualityTrendData,
    qualityScoreData,
    handleSort,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleSaveSnapshot,
    handleSelectSnapshot,
    handleClearFilters,
    getFilterSummary,
    toggleOracle,
    handleApplyFavorite,
    handleExportCSV,
    handleExportJSON,
    scrollToOutlier,
    calculateChangePercent,
    fetchPriceData,
    getLineStrokeDasharray,
    getConsistencyRating,
    activeTab,
    handleTabChange,
    setHoveredRowIndex,
    setSelectedRowIndex,
    symbols,
    onQuery,
    onSymbolChange,
    onDeviationFilterChange,
    onAccessibleColorsChange,
  } = useCrossOraclePage();

  // Generate sparkline data from priceData history
  const sparklineData = useMemo(() => {
    if (!priceData || priceData.length === 0) return undefined;

    // Generate sample sparkline data from price history
    const dataPoints = 20;
    const avgPrices: number[] = [];
    const maxPrices: number[] = [];
    const minPrices: number[] = [];
    const priceRanges: number[] = [];
    const stdDevs: number[] = [];
    const variances: number[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const slice = priceData.slice(
        0,
        Math.max(1, Math.floor((priceData.length * (i + 1)) / dataPoints))
      );
      const prices = slice.map((p) => p.price).filter((p) => p > 0);

      if (prices.length > 0) {
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const range = max - min;

        const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);

        avgPrices.push(avg);
        maxPrices.push(max);
        minPrices.push(min);
        priceRanges.push(range);
        stdDevs.push(stdDev);
        variances.push(variance);
      }
    }

    return {
      avgPrice: avgPrices,
      maxPrice: maxPrices,
      minPrice: minPrices,
      priceRange: priceRanges,
      standardDeviation: stdDevs,
      variance: variances,
    };
  }, [priceData]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-insight min-h-screen">
      <style jsx global>{`
        @keyframes cross-oracle-pulse-highlight {
          0%,
          100% {
            box-shadow: 0 0 0 0 ${chartColors.recharts.warning}B3;
          }
          50% {
            box-shadow: 0 0 0 8px ${chartColors.recharts.warning}00;
          }
        }
        .outlier-highlight-pulse {
          animation: cross-oracle-pulse-highlight 1s ease-in-out 3;
        }
      `}</style>

      <StatsOverview outlierStats={outlierStats} scrollToOutlier={scrollToOutlier} t={t} />

      <div className="flex flex-col gap-3 mb-4">
        <HeaderSection
          selectedSymbol={selectedSymbol}
          selectedOracles={selectedOracles}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          showFavoritesDropdown={showFavoritesDropdown}
          setShowFavoritesDropdown={setShowFavoritesDropdown}
          favoritesDropdownRef={favoritesDropdownRef}
          user={user}
          oracleFavorites={oracleFavorites}
          currentFavoriteConfig={currentFavoriteConfig}
          handleApplyFavorite={handleApplyFavorite}
          fetchPriceData={fetchPriceData}
          t={t}
        />

        {/* Live Status Bar */}
        <LiveStatusBar
          isConnected={!isLoading}
          latency={undefined}
          lastUpdate={lastUpdated || undefined}
        />
      </div>

      <StatsSection
        qualityScoreData={qualityScoreData}
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        avgPrice={avgPrice}
        weightedAvgPrice={weightedAvgPrice}
        maxPrice={maxPrice}
        minPrice={minPrice}
        priceRange={priceRange}
        standardDeviationPercent={standardDeviationPercent}
        variance={variance}
        lastStats={lastStats}
        historyMinMax={historyMinMax}
        calculateChangePercent={calculateChangePercent}
        getConsistencyRating={getConsistencyRating}
        t={t}
        sparklineData={sparklineData}
      />

      <ComparisonTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        priceData={priceData}
        filteredPriceData={filteredPriceData}
        isLoading={isLoading}
        timeRange={timeRange}
        zoomLevel={zoomLevel}
        hoveredOracle={hoveredOracle}
        setHoveredOracle={setHoveredOracle}
        setOracleFilter={setOracleFilter}
        setIsChartFullscreen={setIsChartFullscreen}
        chartContainerRef={chartContainerRef}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        expandedRow={expandedRow}
        setExpandedRow={setExpandedRow}
        selectedRowIndex={selectedRowIndex}
        hoveredRowIndex={hoveredRowIndex}
        setHoveredRowIndex={setHoveredRowIndex}
        setSelectedRowIndex={setSelectedRowIndex}
        avgPrice={avgPrice}
        weightedAvgPrice={weightedAvgPrice}
        maxPrice={maxPrice}
        minPrice={minPrice}
        priceRange={priceRange}
        standardDeviation={standardDeviation}
        standardDeviationPercent={standardDeviationPercent}
        variance={variance}
        validPrices={validPrices}
        lastStats={lastStats}
        historyMinMax={historyMinMax}
        oracleChartColors={oracleChartColors}
        getChartData={getChartData}
        heatmapData={heatmapData}
        boxPlotData={boxPlotData}
        volatilityData={volatilityData}
        correlationData={correlationData}
        performanceData={performanceData}
        maData={maData}
        qualityTrendData={qualityTrendData}
        qualityScoreData={qualityScoreData}
        selectedSnapshot={selectedSnapshot}
        setSelectedSnapshot={setSelectedSnapshot}
        showComparison={showComparison}
        setShowComparison={setShowComparison}
        selectedPerformanceOracle={selectedPerformanceOracle}
        setSelectedPerformanceOracle={setSelectedPerformanceOracle}
        currentStats={currentStats}
        handleSort={handleSort}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        setTimeRange={setTimeRange}
        handleSaveSnapshot={handleSaveSnapshot}
        handleSelectSnapshot={handleSelectSnapshot}
        fetchPriceData={fetchPriceData}
        toggleOracle={toggleOracle}
        getLineStrokeDasharray={getLineStrokeDasharray}
        getConsistencyRating={getConsistencyRating}
        calculateChangePercent={calculateChangePercent}
        getOracleLatencyData={getOracleLatencyData}
        t={t}
        symbols={symbols}
        deviationFilter={deviationFilter}
        onDeviationFilterChange={onDeviationFilterChange}
        useAccessibleColors={useAccessibleColors}
        onAccessibleColorsChange={onAccessibleColorsChange}
        onQuery={onQuery}
        activeFilterCount={activeFilterCount}
        onClearFilters={handleClearFilters}
        onSymbolChange={onSymbolChange}
      />

      <FullscreenChart
        isOpen={isChartFullscreen}
        onClose={() => setIsChartFullscreen(false)}
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        oracleChartColors={oracleChartColors}
        getChartData={getChartData}
        zoomLevel={zoomLevel}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        t={t}
      />

      <ExportSection
        handleExportCSV={handleExportCSV}
        handleExportJSON={handleExportJSON}
        handleSaveSnapshot={handleSaveSnapshot}
        isLoading={isLoading}
      />
    </div>
  );
}
