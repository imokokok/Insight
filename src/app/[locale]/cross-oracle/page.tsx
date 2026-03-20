'use client';

import { useCrossOraclePage } from './useCrossOraclePage';
import {
  HeaderSection,
  StatsOverview,
  ComparisonTabs,
  ExportSection,
  FullscreenChart,
  TabNavigation,
} from './components';
import { chartColors } from '@/lib/config/colors';

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
  } = useCrossOraclePage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dune min-h-screen">
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

      <HeaderSection
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        selectedOracles={selectedOracles}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        isFilterPanelOpen={isFilterPanelOpen}
        setIsFilterPanelOpen={setIsFilterPanelOpen}
        filterPanelRef={filterPanelRef}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        deviationFilter={deviationFilter}
        setDeviationFilter={setDeviationFilter}
        oracleFilter={oracleFilter}
        setOracleFilter={setOracleFilter}
        activeFilterCount={activeFilterCount}
        useAccessibleColors={useAccessibleColors}
        setUseAccessibleColors={setUseAccessibleColors}
        showFavoritesDropdown={showFavoritesDropdown}
        setShowFavoritesDropdown={setShowFavoritesDropdown}
        favoritesDropdownRef={favoritesDropdownRef}
        user={user}
        oracleFavorites={oracleFavorites}
        currentFavoriteConfig={currentFavoriteConfig}
        handleClearFilters={handleClearFilters}
        getFilterSummary={getFilterSummary}
        handleApplyFavorite={handleApplyFavorite}
        fetchPriceData={fetchPriceData}
        t={t}
      />

      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      <ComparisonTabs
        activeTab={activeTab}
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
        handleSaveSnapshot={handleSaveSnapshot}
        handleSelectSnapshot={handleSelectSnapshot}
        fetchPriceData={fetchPriceData}
        toggleOracle={toggleOracle}
        getLineStrokeDasharray={getLineStrokeDasharray}
        getConsistencyRating={getConsistencyRating}
        calculateChangePercent={calculateChangePercent}
        getOracleLatencyData={getOracleLatencyData}
        t={t}
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
        getLineStrokeDasharray={getLineStrokeDasharray}
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
