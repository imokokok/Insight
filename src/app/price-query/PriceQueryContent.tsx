'use client';

import { useRef, useCallback } from 'react';

import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts, useAllOnChainData } from '@/hooks';

import { QueryHeader, QueryForm, QueryResults } from './components';
import {
  type QueryState,
  type StatsState,
  type ChartConfig,
  type ErrorState,
  type OnChainData,
} from './constants';
import { usePriceQuery } from './hooks/usePriceQuery';

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
      refetch,
    },
    actions: { handleApplyFavorite },
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
    onRefresh: refetch,
    onSearch: debouncedSearchFocus,
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div aria-live="polite" className="sr-only">
        {isLoading ? 'Loading data...' : `${queryResults.length} results`}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <QueryHeader
          loading={isLoading}
          queryResults={queryResults}
          chartContainerRef={chartContainerRef}
          selectedSymbol={selectedSymbol}
          avgPrice={avgPrice}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          standardDeviation={standardDeviation}
          standardDeviationPercent={standardDeviationPercent}
          selectedOracle={selectedOracle}
          selectedChain={selectedChain}
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
            onQuery={refetch}
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
            onRefresh={refetch}
            onTimeRangeChange={setSelectedTimeRange}
          />
        </main>
      </div>
    </div>
  );
}
