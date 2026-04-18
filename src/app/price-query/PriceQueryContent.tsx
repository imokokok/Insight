'use client';

import { useRef, useCallback } from 'react';

import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts, useAllOnChainData } from '@/hooks';

import { QueryHeader, QueryForm, QueryResults, ExportConfig } from './components';
import {
  type QueryState,
  type StatsState,
  type ChartConfig,
  type ErrorState,
  type OnChainData,
} from './constants';
import { usePriceQuery } from './hooks/usePriceQuery';
import { exportToCSV, exportToJSON, exportToPDF } from './utils/exportUtils';

export default function PriceQueryContent() {
  const filterInputRef = useRef<HTMLInputElement>(null);
  const priceQuery = usePriceQuery();

  const {
    state: {
      selectedOracle,
      setSelectedOracle,
      selectedChain,
      setSelectedChain,
      selectedSymbol,
      setSelectedSymbol,
      selectedTimeRange,
      setSelectedTimeRange,
      showExportConfig,
      setShowExportConfig,
      showFavoritesDropdown,
      setShowFavoritesDropdown,
    },
    data: { queryResults, historicalData, chartData, supportedChainsBySelectedOracles },
    stats: {
      validPrices,
      avgPrice,
      avgChange24hPercent,
      maxPrice,
      minPrice,
      priceRange,
      standardDeviation,
      standardDeviationPercent,
    },
    query: {
      isLoading,
      queryDuration,
      queryProgress,
      currentQueryTarget,
      queryErrors,
      clearErrors,
      retryDataSource,
      retryAllErrors,
      fetchQueryData,
    },
    actions: { handleExportCSV, handleExportJSON, handleApplyFavorite },
    refs: { chartContainerRef, favoritesDropdownRef },
    symbolFavorites,
    currentFavoriteConfig,
  } = priceQuery;

  const onChainData = useAllOnChainData({
    selectedOracle,
    selectedSymbol,
    selectedChain,
    queryResults,
  });

  const debouncedSearchFocus = useCallback(() => {
    requestAnimationFrame(() => {
      filterInputRef.current?.focus();
    });
  }, []);

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
      csvTitle: 'Price Query Results',
      symbol: 'Symbol',
      exportTime: 'Export Time',
      oracle: 'Oracle',
      blockchain: 'Blockchain',
      price: 'Price',
      timestamp: 'Timestamp',
      change24h: '24h Change',
      confidence: 'Confidence',
      source: 'Source',
    };

    const pdfTranslations = {
      ...csvTranslations,
      reportTitle: 'Price Query Report',
      generatedAt: 'Generated at',
      queryParams: 'Query Parameters',
      oracles: 'Oracle',
      chains: 'Blockchain',
      timeRange: 'Time Range',
      hours: 'h',
      statsSummary: 'Statistics Summary',
      avgPriceLabel: 'Average Price',
      maxPriceLabel: 'Max Price',
      minPriceLabel: 'Min Price',
      priceRangeLabel: 'Price Range',
      stdDevLabel: 'Std Deviation',
      dataPointsLabel: 'Data Points',
      change24hLabel: '24h Change',
      indicator: 'Indicator',
      value: 'Value',
      priceChart: 'Price Chart',
      priceData: 'Price Data',
    };

    switch (config.format) {
      case 'csv':
        exportToCSV(queryResults, config, selectedSymbol, csvTranslations);
        break;
      case 'json':
        exportToJSON(
          queryResults,
          config,
          selectedSymbol,
          selectedOracle ? [selectedOracle] : [],
          selectedChain ? [selectedChain] : []
        );
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
      <div aria-live="polite" className="sr-only">
        {isLoading ? 'Loading data...' : `${queryResults.length} results`}
      </div>

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
        <LiveStatusBar
          isConnected={queryErrors.length === 0 && !isLoading}
          latency={queryDuration ?? undefined}
          lastUpdate={
            queryResults.length > 0
              ? new Date(
                  queryResults.reduce((max, r) => Math.max(max, r.priceData?.timestamp || 0), 0)
                )
              : undefined
          }
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
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

        <main className="flex-1 min-w-0">
          <QueryResults
            queryState={
              {
                queryResults,
                historicalData,
                isLoading,
                queryDuration,
                queryProgress,
                currentQueryTarget,
              } satisfies QueryState
            }
            stats={
              {
                validPrices,
                avgPrice,
                avgChange24hPercent,
                maxPrice,
                minPrice,
                priceRange,
                standardDeviation,
                standardDeviationPercent,
              } satisfies StatsState
            }
            chartConfig={
              {
                chartData,
                chartContainerRef,
                selectedTimeRange,
              } satisfies ChartConfig
            }
            errorState={
              {
                queryErrors,
                onRetryDataSource: retryDataSource,
                onRetryAllErrors: retryAllErrors,
                onClearErrors: clearErrors,
              } satisfies ErrorState
            }
            onChainData={onChainData satisfies OnChainData}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            onRefresh={fetchQueryData}
            onTimeRangeChange={setSelectedTimeRange}
          />
        </main>
      </div>

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
