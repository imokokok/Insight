'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

import { useCrossChainAnalytics } from '@/app/cross-chain/hooks/useCrossChainAnalytics';
import { useCrossChainDataState } from '@/app/cross-chain/hooks/useCrossChainDataState';
import { useCrossOraclePage } from '@/app/cross-oracle/hooks/useCrossOraclePage';
import { ErrorBoundary } from '@/components/error-boundary';
import { LiveStatusBar, SegmentedControl } from '@/components/ui';
import { chartColors } from '@/lib/config/colors';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { formatTimeString } from '@/lib/utils/format';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { type RefreshInterval } from '@/types/common';
import { type OracleProvider, type Blockchain, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

import { ChainControlPanel } from './components/ChainControlPanel';
import { ChainQueryResults } from './components/ChainQueryResults';
import { DimensionSwitcher, type Dimension } from './components/DimensionSwitcher';
import { MarketSnapshotSummary } from './components/MarketSnapshotSummary';
import { OracleControlPanel } from './components/OracleControlPanel';
import { OracleQueryResults } from './components/OracleQueryResults';
import { TabNavigation, type TabId } from './components/TabNavigation';

function normalizeSymbolParam(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  return normalized.includes('/') ? normalized : `${normalized}/USD`;
}

function readUrlSearchParams() {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(search);

  const symbolParam = params.get('symbol');
  const symbol = symbolParam ? normalizeSymbolParam(symbolParam) : undefined;

  const providerParam = params.get('provider');
  const provider =
    providerParam && ORACLE_PROVIDER_VALUES.includes(providerParam as OracleProvider)
      ? (providerParam as OracleProvider)
      : undefined;

  const chainParam = params.get('chain');
  const chain = chainParam && isBlockchain(chainParam) ? (chainParam as Blockchain) : undefined;

  return { symbol, provider, chain };
}

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

  // Initialize cross-chain selector state from URL params on first mount so
  // that links like /price-insight?symbol=ETH&chain=ethereum work for the
  // chain dimension as well.
  useEffect(() => {
    const { symbol, provider, chain } = readUrlSearchParams();
    if (symbol) {
      useCrossChainSelectorStore.getState().setSelectedSymbol(symbol);
    }
    if (provider) {
      useCrossChainSelectorStore.getState().setSelectedProvider(provider);
    }
    if (chain) {
      useCrossChainSelectorStore.getState().setSelectedBaseChain(chain);
    }
  }, []);

  const handleDimensionChange = useCallback((newDim: Dimension) => {
    setDimension(newDim);
    setActiveTab('comparison');
  }, []);

  return (
    <ErrorBoundary level="page" componentName="PriceInsightContent">
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-semibold uppercase tracking-wider mb-3">
                Cross-Oracle Price Verification
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Price Insight
              </h1>
              <p className="text-base text-slate-500 mt-2 max-w-2xl">
                Compare oracle prices across providers and chains. Detect divergence, stale feeds,
                and consensus drift in real time.
              </p>
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
  // Read the symbol from the URL once so links like
  // /price-insight?symbol=ETH actually load ETH/USD instead of the default.
  const initialSymbol = useMemo(() => readUrlSearchParams().symbol, []);

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
  } = useCrossOraclePage({ initialSymbol });

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
      <div className="flex items-center justify-between mb-5 px-1">
        <LiveStatusBar
          isConnected={!isLoading}
          latency={undefined}
          lastUpdate={lastUpdated || undefined}
        />
        {lastUpdated && (
          <span className="text-xs font-medium text-slate-400">
            Last updated: {formatTimeString(lastUpdated, false)}
          </span>
        )}
      </div>

      <MarketSnapshotSummary
        dimension="oracle"
        isLoading={isLoading || priceData.length === 0}
        oracleData={
          priceData.length > 0
            ? {
                symbol: selectedSymbol,
                oracleCount: priceData.length,
                consensusPrice: consensus?.consensus?.price ?? priceStats.avgPrice,
                priceSpread: priceStats.standardDeviationPercent,
                riskLevel: riskMetrics.riskLevel,
                riskScore: riskMetrics.riskScore,
                anomalyCount: anomalyDetection.anomalies.length,
                feedHealthLevel: feedBehavior.overallHealthLevel,
                feedHealthAvg: feedBehavior.overallHealthAvg,
                acceleratingCount: divergenceSignals.acceleratingCount,
              }
            : undefined
        }
      />

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

      <div className="flex items-center justify-between mb-5 px-1">
        <LiveStatusBar
          isConnected={refreshStatus !== 'error'}
          latency={undefined}
          lastUpdate={lastUpdated || undefined}
        />
        {lastUpdated && (
          <span className="text-xs font-medium text-slate-400">
            Last updated: {formatTimeString(lastUpdated, false)}
          </span>
        )}
      </div>

      <MarketSnapshotSummary
        dimension="chain"
        isLoading={isInitialLoading}
        chainData={
          hasData
            ? {
                chainCount: currentPrices.length,
                avgPrice: currentPrices.reduce((sum, p) => sum + p.price, 0) / currentPrices.length,
                priceSpread: analytics.risk.volatilityIndex,
                riskLevel: analytics.risk.riskLevel,
                riskScore: analytics.risk.riskScore,
                consistencyRating:
                  analytics.risk.volatilityLevel === 'low'
                    ? 'Good'
                    : analytics.risk.volatilityLevel === 'medium'
                      ? 'Fair'
                      : 'Poor',
                feedHealthLevel: analytics.feed.overallHealthLevel,
                feedHealthAvg: analytics.feed.overallHealthAvg,
                anomalyCount: analytics.feed.anomalyCount,
              }
            : undefined
        }
      />

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
            <div className="py-20 flex flex-col justify-center items-center gap-3 bg-white rounded-2xl border border-slate-200 mt-4 shadow-sm">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 animate-spin rounded-full" />
              <div className="text-sm text-slate-500 font-medium">Loading cross-chain data...</div>
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
