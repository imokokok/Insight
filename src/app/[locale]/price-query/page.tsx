'use client';

/**
 * @fileoverview 价格查询页面 - 专业的区块链预言机价格数据分析平台
 * @description 提供单一预言机、单一链的价格查询功能
 */

import { useRef, useCallback } from 'react';

import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts } from '@/hooks';
import { useTranslations } from '@/i18n';

import { QueryHeader, QueryForm, QueryResults, ExportConfig } from './components';
import { usePriceQuery } from './hooks/usePriceQuery';
import { exportToCSV, exportToJSON, exportToPDF } from './utils/exportUtils';

export default function PriceQueryPage() {
  const t = useTranslations();
  const filterInputRef = useRef<HTMLInputElement>(null);
  const priceQuery = usePriceQuery();

  const {
    selectedOracle,
    setSelectedOracle,
    selectedChain,
    setSelectedChain,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    queryResults,
    historicalData,
    isLoading,
    queryDuration,
    queryProgress,
    currentQueryTarget,
    showExportConfig,
    setShowExportConfig,
    chartContainerRef,
    chartData,
    validPrices,
    avgPrice,
    avgChange24hPercent,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviation,
    standardDeviationPercent,
    supportedChainsBySelectedOracles,
    fetchQueryData,
    handleExportCSV,
    handleExportJSON,
    symbolFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
    queryErrors,
    clearErrors,
    retryDataSource,
    retryAllErrors,
  } = priceQuery;

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

    const csvTranslations = {
      csvTitle: t('priceQuery.priceChart.export.csvTitle'),
      symbol: t('priceQuery.priceChart.export.symbol'),
      exportTime: t('priceQuery.priceChart.export.exportTime'),
      oracle: t('priceQuery.export.oracle'),
      blockchain: t('priceQuery.export.blockchain'),
      price: t('priceQuery.export.price'),
      timestamp: t('priceQuery.export.timestamp'),
      change24h: t('priceQuery.export.change24h'),
      confidence: t('priceQuery.export.confidence'),
      source: t('priceQuery.export.source'),
    };

    const pdfTranslations = {
      ...csvTranslations,
      reportTitle: t('priceQuery.priceChart.export.reportTitle'),
      generatedAt: t('priceQuery.lastUpdated'),
      queryParams: t('priceQuery.priceChart.export.queryParams'),
      oracles: t('priceQuery.export.oracle'),
      chains: t('priceQuery.export.blockchain'),
      timeRange: t('priceQuery.selectors.timeRange'),
      hours: 'h',
      statsSummary: t('priceQuery.priceChart.export.statsSummary'),
      avgPriceLabel: t('priceQuery.stats.avgPrice'),
      maxPriceLabel: t('priceQuery.stats.maxPrice'),
      minPriceLabel: t('priceQuery.stats.minPrice'),
      priceRangeLabel: t('priceQuery.stats.priceRange'),
      stdDevLabel: t('priceQuery.stats.standardDeviation'),
      dataPointsLabel: t('priceQuery.stats.dataPoints'),
      change24hLabel: t('priceQuery.export.change24h'),
      indicator: t('priceQuery.priceChart.export.indicator'),
      value: t('priceQuery.priceChart.export.value'),
      priceChart: t('priceQuery.chart.title'),
      priceData: t('priceQuery.priceChart.export.priceDataTitle'),
    };

    switch (config.format) {
      case 'csv':
        exportToCSV(queryResults, config, selectedSymbol, csvTranslations);
        break;
      case 'json':
        exportToJSON(queryResults, config, selectedSymbol, selectedOracle ? [selectedOracle] : [], selectedChain ? [selectedChain] : []);
        break;
      case 'pdf':
        await exportToPDF(
          queryResults,
          config,
          selectedSymbol,
          selectedOracle ? [selectedOracle] : [],
          selectedChain ? [selectedChain] : [],
          selectedTimeRange,
          stats,
          chartContainerRef,
          pdfTranslations
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
      <div className="flex flex-col gap-3 mb-4">
        <QueryHeader
          loading={isLoading}
          queryResultsLength={queryResults.length}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onOpenExportConfig={() => setShowExportConfig(true)}
          selectedOracle={selectedOracle}
          selectedChain={selectedChain}
          selectedSymbol={selectedSymbol}
          selectedTimeRange={selectedTimeRange}
          setSelectedOracle={setSelectedOracle}
          setSelectedChain={setSelectedChain}
          setSelectedSymbol={setSelectedSymbol}
          setSelectedTimeRange={setSelectedTimeRange}
          symbolFavorites={symbolFavorites}
          currentFavoriteConfig={currentFavoriteConfig}
          showFavoritesDropdown={showFavoritesDropdown}
          setShowFavoritesDropdown={setShowFavoritesDropdown}
          favoritesDropdownRef={favoritesDropdownRef}
          handleApplyFavorite={handleApplyFavorite}
        />
        <LiveStatusBar />
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* 左侧查询表单 */}
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <QueryForm
            selectedOracle={selectedOracle}
            setSelectedOracle={setSelectedOracle}
            selectedChain={selectedChain}
            setSelectedChain={setSelectedChain}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            isLoading={isLoading}
            onQuery={fetchQueryData}
            supportedChainsBySelectedOracles={supportedChainsBySelectedOracles}
          />
        </aside>

        {/* 右侧结果展示 */}
        <main className="flex-1 min-w-0">
          <QueryResults
            queryResults={queryResults}
            historicalData={historicalData}
            isLoading={isLoading}
            queryDuration={queryDuration}
            queryProgress={queryProgress}
            currentQueryTarget={currentQueryTarget}
            selectedTimeRange={selectedTimeRange}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            onRefresh={fetchQueryData}
            chartContainerRef={chartContainerRef}
            chartData={chartData}
            validPrices={validPrices}
            avgPrice={avgPrice}
            avgChange24hPercent={avgChange24hPercent}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            queryErrors={queryErrors}
            onRetryDataSource={retryDataSource}
            onRetryAllErrors={retryAllErrors}
            onClearErrors={clearErrors}
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
        selectedOracles={selectedOracle ? [selectedOracle] : []}
        selectedChains={selectedChain ? [selectedChain] : []}
        selectedTimeRange={selectedTimeRange}
        chartRef={chartContainerRef}
      />
    </div>
  );
}
