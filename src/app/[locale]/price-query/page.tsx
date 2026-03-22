'use client';

/**
 * @fileoverview 价格查询页面 - 专业的区块链预言机价格数据分析平台
 * @description 提供多预言机、多链的价格查询、对比和分析功能
 */

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
    isLoading,
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
    isCompareMode,
    setIsCompareMode,
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* 屏幕阅读器通知区域 */}
      <div aria-live="polite" className="sr-only">
        {isLoading
          ? t('priceQuery.loadingData')
          : `${queryResults.length} ${t('priceQuery.results.title')}`}
      </div>

      {/* 页面头部 */}
      <QueryHeader
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        historyItems={historyItems}
        onSelectHistory={handleHistorySelect}
        onClearHistory={handleClearHistory}
        loading={isLoading}
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

      {/* 主内容区域 - 左右分栏布局 */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* 左侧：查询选择器面板 */}
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <QueryForm
            selectedOracles={selectedOracles}
            setSelectedOracles={setSelectedOracles}
            selectedChains={selectedChains}
            setSelectedChains={setSelectedChains}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            isLoading={isLoading}
            onQuery={fetchQueryData}
            supportedChainsBySelectedOracles={supportedChainsBySelectedOracles}
            isCompareMode={isCompareMode}
            setIsCompareMode={setIsCompareMode}
            compareTimeRange={compareTimeRange}
            setCompareTimeRange={setCompareTimeRange}
            showBaseline={showBaseline}
            setShowBaseline={setShowBaseline}
          />
        </aside>

        {/* 右侧：查询结果展示区域 */}
        <main className="flex-1 min-w-0">
          <QueryResults
            isLoading={isLoading}
            queryResults={queryResults}
            filteredQueryResults={filteredQueryResults}
            historicalData={historicalData}
            isCompareMode={isCompareMode}
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
        </main>
      </div>

      {/* 导出配置弹窗 */}
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
