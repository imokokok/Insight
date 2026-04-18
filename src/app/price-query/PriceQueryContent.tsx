'use client';

import { useRef, useCallback } from 'react';

import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts, useOnChainDataByProvider } from '@/hooks';
import { OracleProvider } from '@/lib/oracles';

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

  const shouldFetchDIAData =
    !selectedOracle ||
    selectedOracle === OracleProvider.DIA ||
    queryResults.some((r) => r.provider === OracleProvider.DIA);

  const { data: diaOnChainData, isLoading: isDIADataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.DIA,
    symbol: selectedSymbol,
    chain: selectedChain || undefined,
    enabled: shouldFetchDIAData && !!selectedSymbol && queryResults.length > 0,
  });

  const shouldFetchWINkLinkData =
    !selectedOracle ||
    selectedOracle === OracleProvider.WINKLINK ||
    queryResults.some((r) => r.provider === OracleProvider.WINKLINK);

  const { data: winklinkOnChainData, isLoading: isWINkLinkDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.WINKLINK,
    symbol: selectedSymbol,
    enabled: shouldFetchWINkLinkData && !!selectedSymbol && queryResults.length > 0,
  });

  const shouldFetchRedStoneData =
    !selectedOracle ||
    selectedOracle === OracleProvider.REDSTONE ||
    queryResults.some((r) => r.provider === OracleProvider.REDSTONE);

  const { data: redstoneOnChainData, isLoading: isRedStoneDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.REDSTONE,
    symbol: selectedSymbol,
    enabled: shouldFetchRedStoneData && !!selectedSymbol && queryResults.length > 0,
  });

  const shouldFetchSupraData =
    !selectedOracle ||
    selectedOracle === OracleProvider.SUPRA ||
    queryResults.some((r) => r.provider === OracleProvider.SUPRA);

  const { data: supraOnChainData, isLoading: isSupraDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.SUPRA,
    symbol: selectedSymbol,
    enabled: shouldFetchSupraData && !!selectedSymbol && queryResults.length > 0,
  });

  const shouldFetchTwapData =
    !selectedOracle ||
    selectedOracle === OracleProvider.TWAP ||
    queryResults.some((r) => r.provider === OracleProvider.TWAP);

  const { data: twapOnChainData, isLoading: isTwapDataLoading } = useOnChainDataByProvider({
    provider: OracleProvider.TWAP,
    symbol: selectedSymbol,
    chain: selectedChain || undefined,
    enabled: shouldFetchTwapData && !!selectedSymbol && queryResults.length > 0,
  });

  const shouldFetchReflectorData = queryResults.some(
    (r) => r.provider === OracleProvider.REFLECTOR
  );

  const { data: reflectorOnChainData, isLoading: isReflectorDataLoading } =
    useOnChainDataByProvider({
      provider: OracleProvider.REFLECTOR,
      symbol: selectedSymbol,
      enabled: shouldFetchReflectorData && !!selectedSymbol && queryResults.length > 0,
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
      csvTitle: 'priceQuery.priceChart.export.csvTitle',
      symbol: 'priceQuery.priceChart.export.symbol',
      exportTime: 'priceQuery.priceChart.export.exportTime',
      oracle: 'priceQuery.export.oracle',
      blockchain: 'priceQuery.export.blockchain',
      price: 'priceQuery.export.price',
      timestamp: 'priceQuery.export.timestamp',
      change24h: 'priceQuery.export.change24h',
      confidence: 'priceQuery.export.confidence',
      source: 'priceQuery.export.source',
    };

    const pdfTranslations = {
      ...csvTranslations,
      reportTitle: 'priceQuery.priceChart.export.reportTitle',
      generatedAt: 'priceQuery.lastUpdated',
      queryParams: 'priceQuery.priceChart.export.queryParams',
      oracles: 'priceQuery.export.oracle',
      chains: 'priceQuery.export.blockchain',
      timeRange: 'priceQuery.selectors.timeRange',
      hours: 'h',
      statsSummary: 'priceQuery.priceChart.export.statsSummary',
      avgPriceLabel: 'priceQuery.stats.avgPrice',
      maxPriceLabel: 'priceQuery.stats.maxPrice',
      minPriceLabel: 'priceQuery.stats.minPrice',
      priceRangeLabel: 'priceQuery.stats.priceRange',
      stdDevLabel: 'priceQuery.stats.standardDeviation',
      dataPointsLabel: 'priceQuery.stats.dataPoints',
      change24hLabel: 'priceQuery.export.change24h',
      indicator: 'priceQuery.priceChart.export.indicator',
      value: 'priceQuery.priceChart.export.value',
      priceChart: 'priceQuery.chart.title',
      priceData: 'priceQuery.priceChart.export.priceDataTitle',
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
        {isLoading
          ? 'priceQuery.loadingData'
          : `${queryResults.length} ${'priceQuery.results.title'}`}
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
            onChainData={
              {
                diaOnChainData,
                isDIADataLoading,
                winklinkOnChainData,
                isWINkLinkDataLoading,
                redstoneOnChainData,
                isRedStoneDataLoading,
                supraOnChainData,
                isSupraDataLoading,
                twapOnChainData,
                isTwapDataLoading,
                reflectorOnChainData,
                isReflectorDataLoading,
              } satisfies OnChainData
            }
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
