'use client';

import { useRef, useCallback, useMemo } from 'react';

import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts } from '@/hooks';
import { chartColors } from '@/lib/config/colors';
import { formatTimeString } from '@/lib/utils/format';

import { ControlPanel } from './components/ControlPanel';
import CrossOracleExportSection from './components/CrossOracleExportSection';
import { QueryResults } from './components/QueryResults';
import { useCrossOraclePage } from './hooks';

export default function CrossOracleContent() {
  const filterInputRef = useRef<HTMLInputElement>(null);

  const {
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    timeRange,
    setTimeRange,

    priceData,
    historicalData,
    isLoading,
    lastUpdated,

    priceStats,

    anomalyDetection,

    oracleDataError,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,

    queryProgress,

    toggleOracle,

    fetchPriceData,

    refreshInterval,
    setRefreshInterval,
    lastRefreshedAt,
    nextRefreshAt,
  } = useCrossOraclePage();

  const debouncedSearchFocus = useCallback(() => {
    requestAnimationFrame(() => {
      filterInputRef.current?.focus();
    });
  }, []);

  const {
    validPrices,
    avgPrice,
    medianPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviation,
    standardDeviationPercent,
  } = priceStats;

  const { anomalies } = anomalyDetection;

  const currentQueryTarget = useMemo(
    () => ({
      oracle: selectedOracles[0] || null,
      chain: null,
    }),
    [selectedOracles]
  );

  const oracleChartColors = useMemo(() => {
    const colors: Record<string, string> = {};
    selectedOracles.forEach((oracle, index) => {
      const oracleColor = chartColors.oracle[oracle];
      colors[oracle] = oracleColor ?? chartColors.sequence[index % chartColors.sequence.length];
    });
    return colors;
  }, [selectedOracles]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedOracles.length > 0) count++;
    if (selectedSymbol) count++;
    if (timeRange !== '24h') count++;
    return count;
  }, [selectedOracles.length, selectedSymbol, timeRange]);

  const handleClearFilters = useCallback(() => {
    setSelectedOracles([]);
    setSelectedSymbol('');
    setTimeRange('24h');
  }, [setSelectedOracles, setSelectedSymbol, setTimeRange]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div aria-live="polite" className="sr-only">
        {isLoading ? 'Loading data...' : `${priceData.length} results`}
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cross-Oracle Comparison</h1>
            <p className="text-sm text-gray-500 mt-1">Compare prices across multiple oracles</p>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Last updated: {formatTimeString(lastUpdated, false)}
              </span>
            )}
            <CrossOracleExportSection
              loading={isLoading}
              priceData={priceData}
              selectedOracles={selectedOracles}
              selectedSymbol={selectedSymbol}
              avgPrice={avgPrice}
              medianPrice={medianPrice}
              maxPrice={maxPrice}
              minPrice={minPrice}
              priceRange={priceRange}
              standardDeviation={standardDeviation}
              standardDeviationPercent={standardDeviationPercent}
            />
          </div>
        </div>

        <LiveStatusBar
          isConnected={!isLoading}
          latency={undefined}
          lastUpdate={lastUpdated || undefined}
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <div className="xl:sticky xl:top-4">
            <ControlPanel
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              selectedOracles={selectedOracles}
              onOracleToggle={toggleOracle}
              oracleChartColors={oracleChartColors}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onQuery={fetchPriceData}
              isLoading={isLoading}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
              refreshInterval={refreshInterval}
              onRefreshIntervalChange={setRefreshInterval}
              lastRefreshedAt={lastRefreshedAt}
              nextRefreshAt={nextRefreshAt}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <QueryResults
            priceData={priceData}
            selectedOracles={selectedOracles}
            selectedSymbol={selectedSymbol}
            isLoading={isLoading}
            queryProgress={queryProgress}
            currentQueryTarget={currentQueryTarget}
            avgPrice={avgPrice}
            medianPrice={medianPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            validPrices={validPrices}
            anomalies={anomalies}
            anomalyDetection={anomalyDetection}
            historicalData={historicalData}
            oracleColors={oracleChartColors}
            onRefresh={fetchPriceData}
            oracleDataError={oracleDataError}
            retryOracle={retryOracle}
            retryAllFailed={retryAllFailed}
            isRetrying={isRetrying}
            retryingOracles={retryingOracles}
          />
        </main>
      </div>
    </div>
  );
}
