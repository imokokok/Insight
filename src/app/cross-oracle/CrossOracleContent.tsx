'use client';

import { useCallback, useMemo, useState } from 'react';

import { Camera, Check } from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { Button, LiveStatusBar } from '@/components/ui';
import { useCreateSnapshot } from '@/hooks';
import { chartColors } from '@/lib/config/colors';
import { formatTimeString } from '@/lib/utils/format';
import { useUser } from '@/stores/authStore';

import { ControlPanel } from './components/ControlPanel';
import CrossOracleExportSection from './components/CrossOracleExportSection';
import { QueryResults } from './components/QueryResults';
import { useCrossOraclePage } from './hooks';

function CrossOracleContentInner() {
  const {
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    activeTab,
    setActiveTab,

    priceData,
    isLoading,
    lastUpdated,

    priceStats,

    anomalyDetection,
    riskMetrics,

    performanceMetrics,
    isCalculatingMetrics,

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

  const user = useUser();
  const { createSnapshot, isPending: isSavingSnapshot } = useCreateSnapshot();
  const [snapshotSaveSuccess, setSnapshotSaveSuccess] = useState(false);

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

  const handleSaveSnapshot = useCallback(async () => {
    if (!user || priceData.length === 0 || !selectedSymbol) return;

    try {
      await createSnapshot({
        symbol: selectedSymbol,
        selected_oracles: selectedOracles,
        price_data: priceData.map((pd) => ({
          provider: pd.provider,
          chain: pd.chain,
          symbol: pd.symbol,
          price: pd.price,
          timestamp: pd.timestamp,
          decimals: pd.decimals ?? 0,
          confidence: pd.confidence ?? undefined,
          source: pd.source ?? undefined,
        })),
        stats: {
          avgPrice: priceStats.currentStats.avgPrice,
          weightedAvgPrice: priceStats.currentStats.weightedAvgPrice,
          maxPrice: priceStats.currentStats.maxPrice,
          minPrice: priceStats.currentStats.minPrice,
          priceRange: priceStats.currentStats.priceRange,
          variance: priceStats.currentStats.variance,
          standardDeviation: priceStats.currentStats.standardDeviation,
          standardDeviationPercent: priceStats.currentStats.standardDeviationPercent,
        },
      });

      setSnapshotSaveSuccess(true);
      setTimeout(() => setSnapshotSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
  }, [user, priceData, selectedSymbol, selectedOracles, priceStats.currentStats, createSnapshot]);

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
    return count;
  }, [selectedOracles.length, selectedSymbol]);

  const handleClearFilters = useCallback(() => {
    setSelectedOracles([]);
    setSelectedSymbol('');
  }, [setSelectedOracles, setSelectedSymbol]);

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
            {user && priceData.length > 0 && (
              <Button
                variant={snapshotSaveSuccess ? 'primary' : 'secondary'}
                size="sm"
                leftIcon={
                  snapshotSaveSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )
                }
                onClick={handleSaveSnapshot}
                isLoading={isSavingSnapshot}
                disabled={isSavingSnapshot || snapshotSaveSuccess}
              >
                {snapshotSaveSuccess ? 'Saved!' : 'Snapshot'}
              </Button>
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
            riskMetrics={riskMetrics}
            performanceMetrics={performanceMetrics}
            isCalculatingMetrics={isCalculatingMetrics}
            activeTab={activeTab}
            onTabChange={setActiveTab}
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

export default function CrossOracleContent() {
  return (
    <ErrorBoundary level="page" componentName="CrossOracleContent">
      <CrossOracleContentInner />
    </ErrorBoundary>
  );
}
