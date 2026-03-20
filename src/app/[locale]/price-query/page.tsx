'use client';

import { useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useCommonShortcuts } from '@/hooks/useKeyboardShortcuts';
import { QueryHeader, QueryForm, QueryResults, ExportConfig } from './components';
import { usePriceQuery } from './hooks/usePriceQuery';
import { exportToCSV, exportToJSON, exportToPDF } from './utils/exportUtils';

export default function PriceQueryPage() {
  const t = useTranslations();
  const filterInputRef = useRef<HTMLInputElement>(null);
  const {
    selectedOracles,
    setSelectedOracles,
    selectedChains,
    setSelectedChains,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    queryResults,
    historicalData,
    loading,
    filterText,
    setFilterText,
    sortField,
    sortDirection,
    hiddenSeries,
    queryDuration,
    queryProgress,
    currentQueryTarget,
    showHistory,
    setShowHistory,
    historyItems,
    selectedRow,
    setSelectedRow,
    compareMode,
    setCompareMode,
    compareTimeRange,
    setCompareTimeRange,
    compareHistoricalData,
    compareQueryResults,
    showBaseline,
    setShowBaseline,
    showExportConfig,
    setShowExportConfig,
    chartContainerRef,
    timeComparisonConfig,
    setTimeComparisonConfig,
    chartData,
    compareChartData,
    filteredQueryResults,
    validPrices,
    avgPrice,
    avgChange24hPercent,
    maxPrice,
    minPrice,
    priceRange,
    compareValidPrices,
    compareAvgPrice,
    compareAvgChange24hPercent,
    compareMaxPrice,
    compareMinPrice,
    comparePriceRange,
    standardDeviation,
    standardDeviationPercent,
    supportedChainsBySelectedOracles,
    toggleSeries,
    handleSort,
    fetchQueryData,
    handleHistorySelect,
    handleClearHistory,
    handleExportCSV,
    handleExportJSON,
    symbolFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
  } = usePriceQuery();

  // Debounced search focus handler
  const debouncedSearchFocus = useCallback(() => {
    // Use requestAnimationFrame for debouncing
    requestAnimationFrame(() => {
      filterInputRef.current?.focus();
    });
  }, []);

  // Keyboard shortcuts
  useCommonShortcuts({
    onRefresh: fetchQueryData,
    onSearch: debouncedSearchFocus,
  });

  const handleExportWithConfig = async (config: {
    format: 'csv' | 'json' | 'pdf';
    fields: { key: string; label: string; enabled: boolean }[];
    timeRange: { start: number | null; end: number | null };
    includeChart: boolean;
    includeStats: boolean;
  }) => {
    const stats = {
      avgPrice,
      maxPrice,
      minPrice,
      priceRange,
      standardDeviation,
      standardDeviationPercent,
      dataPoints: queryResults.length,
      queryDuration,
      avgChange24hPercent,
    };

    switch (config.format) {
      case 'csv':
        exportToCSV(queryResults, config, selectedSymbol);
        break;
      case 'json':
        exportToJSON(queryResults, config, selectedSymbol, selectedOracles, selectedChains);
        break;
      case 'pdf':
        await exportToPDF(
          queryResults,
          config,
          selectedSymbol,
          selectedOracles,
          selectedChains,
          selectedTimeRange,
          stats,
          chartContainerRef
        );
        break;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-insight min-h-screen">
      <div aria-live="polite" className="sr-only">
        {loading
          ? t('priceQuery.loadingData')
          : `${queryResults.length} ${t('priceQuery.results.title')}`}
      </div>

      <QueryHeader
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        historyItems={historyItems}
        onSelectHistory={handleHistorySelect}
        onClearHistory={handleClearHistory}
        loading={loading}
        queryResultsLength={queryResults.length}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onOpenExportConfig={() => setShowExportConfig(true)}
        selectedOracles={selectedOracles}
        selectedChains={selectedChains}
        selectedSymbol={selectedSymbol}
        selectedTimeRange={selectedTimeRange}
        setSelectedOracles={setSelectedOracles}
        setSelectedChains={setSelectedChains}
        setSelectedSymbol={setSelectedSymbol}
        setSelectedTimeRange={setSelectedTimeRange}
        symbolFavorites={symbolFavorites}
        currentFavoriteConfig={currentFavoriteConfig}
        showFavoritesDropdown={showFavoritesDropdown}
        setShowFavoritesDropdown={setShowFavoritesDropdown}
        favoritesDropdownRef={favoritesDropdownRef}
        handleApplyFavorite={handleApplyFavorite}
      />

      {/* 左右分栏布局 */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* 左侧：选择器区域 */}
        <div className="xl:w-[400px] xl:flex-shrink-0">
          <QueryForm
            selectedOracles={selectedOracles}
            setSelectedOracles={setSelectedOracles}
            selectedChains={selectedChains}
            setSelectedChains={setSelectedChains}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            loading={loading}
            onQuery={fetchQueryData}
            supportedChainsBySelectedOracles={supportedChainsBySelectedOracles}
            compareMode={compareMode}
            setCompareMode={setCompareMode}
            compareTimeRange={compareTimeRange}
            setCompareTimeRange={setCompareTimeRange}
            showBaseline={showBaseline}
            setShowBaseline={setShowBaseline}
          />
        </div>

        {/* 右侧：结果展示区域 */}
        <div className="flex-1 min-w-0">
          <QueryResults
            loading={loading}
            queryResults={queryResults}
            filteredQueryResults={filteredQueryResults}
            historicalData={historicalData}
            compareMode={compareMode}
            compareQueryResults={compareQueryResults}
            compareHistoricalData={compareHistoricalData}
            showBaseline={showBaseline}
            avgPrice={avgPrice}
            compareAvgPrice={compareAvgPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            compareMaxPrice={compareMaxPrice}
            compareMinPrice={compareMinPrice}
            priceRange={priceRange}
            comparePriceRange={comparePriceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            avgChange24hPercent={avgChange24hPercent}
            compareAvgChange24hPercent={compareAvgChange24hPercent}
            validPrices={validPrices}
            compareValidPrices={compareValidPrices}
            chartData={chartData}
            compareChartData={compareChartData}
            queryDuration={queryDuration}
            queryProgress={queryProgress}
            currentQueryTarget={currentQueryTarget}
            filterText={filterText}
            setFilterText={setFilterText}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            selectedRow={selectedRow}
            onRowSelect={setSelectedRow}
            hiddenSeries={hiddenSeries}
            onToggleSeries={toggleSeries}
            selectedTimeRange={selectedTimeRange}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            onRefresh={fetchQueryData}
            chartContainerRef={chartContainerRef}
            timeComparisonConfig={timeComparisonConfig}
            onTimeConfigChange={setTimeComparisonConfig}
            filterInputRef={filterInputRef}
          />
        </div>
      </div>

      <ExportConfig
        isOpen={showExportConfig}
        onClose={() => setShowExportConfig(false)}
        onExport={handleExportWithConfig}
        queryResults={queryResults}
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        selectedChains={selectedChains}
        selectedTimeRange={selectedTimeRange}
        chartRef={chartContainerRef}
      />
    </div>
  );
}
