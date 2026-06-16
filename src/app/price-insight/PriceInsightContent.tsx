'use client';

import { useState, useCallback, useMemo } from 'react';

import { useCrossChainAnalytics } from '@/app/cross-chain/hooks/useCrossChainAnalytics';
import { useCrossChainDataState } from '@/app/cross-chain/hooks/useCrossChainDataState';
import { useCrossOraclePage } from '@/app/cross-oracle/hooks';
import { ErrorBoundary } from '@/components/error-boundary';
import { LiveStatusBar, SegmentedControl } from '@/components/ui';
import { chartColors } from '@/lib/config/colors';
import { formatTimeString } from '@/lib/utils/format';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { type RefreshInterval } from '@/types/common';

import { ChainControlPanel } from './components/ChainControlPanel';
import { ChainQueryResults } from './components/ChainQueryResults';
import { DimensionSwitcher, type Dimension } from './components/DimensionSwitcher';
import { OracleControlPanel } from './components/OracleControlPanel';
import { OracleQueryResults } from './components/OracleQueryResults';
import { TabNavigation, type TabId } from './components/TabNavigation';

function CrossChainDataInitializer() {
  useCrossChainDataState();
  return null;
}

const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
] as const;

export default function PriceInsightContent() {
  const [dimension, setDimension] = useState<Dimension>('oracle');
  const [activeTab, setActiveTab] = useState<TabId>('comparison');

  const handleDimensionChange = useCallback((newDim: Dimension) => {
    setDimension(newDim);
    setActiveTab('comparison');
  }, []);

  return (
    <ErrorBoundary level="page" componentName="PriceInsightContent">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Price Insight</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Compare oracle prices across blockchains and providers
                </p>
              </div>
            </div>
            <DimensionSwitcher dimension={dimension} onDimensionChange={handleDimensionChange} />
          </div>

          {dimension === 'oracle' ? (
            <OracleDimension activeTab={activeTab} onTabChange={setActiveTab} />
          ) : (
            <ChainDimension activeTab={activeTab} onTabChange={setActiveTab} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function OracleDimension({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const {
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    priceData,
    isLoading,
    lastUpdated,
    priceStats,
    anomalyDetection,
    riskMetrics,
    divergenceSignals,
    feedBehavior,
    stabilityScore,
    consensus,
    consensusMethod,
    setConsensusMethod,
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

  const oracleChartColors = useMemo(() => {
    const colors: Record<string, string> = {};
    selectedOracles.forEach((oracle, index) => {
      const oracleColor = chartColors.oracle[oracle];
      colors[oracle] = oracleColor ?? chartColors.sequence[index % chartColors.sequence.length];
    });
    return colors;
  }, [selectedOracles]);

  const activeFilterCount = (() => {
    let count = 0;
    if (selectedOracles.length > 0) count++;
    if (selectedSymbol) count++;
    return count;
  })();

  const handleClearFilters = useCallback(() => {
    setSelectedOracles([]);
    setSelectedSymbol('');
  }, [setSelectedOracles, setSelectedSymbol]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <LiveStatusBar
          isConnected={!isLoading}
          latency={undefined}
          lastUpdate={lastUpdated || undefined}
        />
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Last updated: {formatTimeString(lastUpdated, false)}
          </span>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <div className="xl:sticky xl:top-4">
            <OracleControlPanel
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
          <TabNavigation activeTab={activeTab} onTabChange={onTabChange} dimension="oracle" />

          <OracleQueryResults
            priceData={priceData}
            selectedSymbol={selectedSymbol}
            isLoading={isLoading}
            queryProgress={queryProgress}
            priceStats={{
              avgPrice: priceStats.avgPrice,
              medianPrice: priceStats.medianPrice,
              maxPrice: priceStats.maxPrice,
              minPrice: priceStats.minPrice,
              priceRange: priceStats.priceRange,
              standardDeviation: priceStats.standardDeviation,
              standardDeviationPercent: priceStats.standardDeviationPercent,
              validPrices: priceStats.validPrices,
            }}
            anomalies={anomalyDetection.anomalies}
            anomalyDetection={anomalyDetection}
            riskMetrics={riskMetrics}
            divergenceSignals={divergenceSignals}
            feedBehavior={feedBehavior}
            stabilityScore={stabilityScore}
            activeTab={activeTab}
            onRefresh={fetchPriceData}
            oracleDataError={oracleDataError}
            retryOracle={retryOracle}
            retryAllFailed={retryAllFailed}
            isRetrying={isRetrying}
            retryingOracles={retryingOracles}
            consensusResult={consensus.consensus}
            currentConsensusMethod={consensusMethod}
            onConsensusMethodChange={setConsensusMethod}
          />
        </main>
      </div>
    </>
  );
}

function ChainDimension({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const loading = useCrossChainDataStore((s) => s.loading);
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const lastUpdated = useCrossChainDataStore((s) => s.lastUpdated);
  const refreshStatus = useCrossChainDataStore((s) => s.refreshStatus);
  const refreshInterval = useCrossChainConfigStore((s) => s.refreshInterval);
  const setRefreshInterval = useCrossChainConfigStore((s) => s.setRefreshInterval);

  const analytics = useCrossChainAnalytics(currentPrices);

  const hasData = currentPrices.length > 0;
  const isInitialLoading = loading && !hasData;
  const isRefreshing = refreshStatus === 'refreshing' && hasData;

  return (
    <>
      <CrossChainDataInitializer />

      <div className="flex items-center justify-between mb-4">
        <LiveStatusBar
          isConnected={refreshStatus !== 'error'}
          latency={undefined}
          lastUpdate={lastUpdated || undefined}
        />
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Last updated: {formatTimeString(lastUpdated, false)}
          </span>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="xl:w-[360px] flex-shrink-0">
          <div className="xl:sticky xl:top-6 space-y-4">
            <ChainControlPanel />

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto Refresh</span>
                <SegmentedControl
                  options={REFRESH_OPTIONS.map((opt) => ({
                    value: opt.value.toString(),
                    label: opt.label,
                  }))}
                  value={refreshInterval.toString()}
                  onChange={(value) => setRefreshInterval(Number(value) as RefreshInterval)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <TabNavigation activeTab={activeTab} onTabChange={onTabChange} dimension="chain" />

          {isInitialLoading ? (
            <div className="py-16 flex flex-col justify-center items-center gap-3 bg-white rounded-lg border border-gray-200 mt-4">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
              <div className="text-sm text-gray-500">Loading data...</div>
            </div>
          ) : (
            <ChainQueryResults
              activeTab={activeTab}
              analytics={analytics}
              isRefreshing={isRefreshing}
            />
          )}
        </div>
      </div>
    </>
  );
}
