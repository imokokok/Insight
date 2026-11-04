'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useCrossChainAnalytics } from '@/app/cross-chain/hooks/useCrossChainAnalytics';
import { useCrossChainDataState } from '@/app/cross-chain/hooks/useCrossChainDataState';
import { useCrossOraclePage } from '@/app/cross-oracle/hooks/useCrossOraclePage';
import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';
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
import { SourceRecordWorkspace } from './components/SourceRecordWorkspace';
import { TabNavigation, type TabId } from './components/TabNavigation';
import { WorkflowSwitcher, type WorkflowStage } from './components/WorkflowSwitcher';

function normalizeSymbolParam(raw: string): string {
  return raw.trim().toUpperCase().split('/')[0] ?? '';
}

function readUrlSearchParams(params: Pick<URLSearchParams, 'get'>) {
  const symbolParam = params.get('symbol');
  const symbol = symbolParam ? normalizeSymbolParam(symbolParam) : undefined;

  const providerParam = params.get('provider') ?? params.get('oracles')?.split(',')[0];
  const provider =
    providerParam && ORACLE_PROVIDER_VALUES.includes(providerParam as OracleProvider)
      ? (providerParam as OracleProvider)
      : undefined;

  const chainParam = params.get('chain') ?? params.get('chains')?.split(',')[0];
  const chain = chainParam && isBlockchain(chainParam) ? (chainParam as Blockchain) : undefined;

  const stageParam = params.get('stage');
  const stage: WorkflowStage =
    stageParam === 'observe' || stageParam === 'assess' || stageParam === 'compare'
      ? stageParam
      : 'compare';

  return { stage, symbol, provider, chain };
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

const WORKFLOW_COPY: Record<
  WorkflowStage,
  {
    index: string;
    stage: string;
    eyebrow: string;
    title: string;
    description: string;
    evidence: string[];
  }
> = {
  observe: {
    index: '01',
    stage: 'Observe',
    eyebrow: 'Inspect one oracle record before it becomes a decision input.',
    title: 'Start with the source behind the price.',
    description:
      'Choose a provider, network and asset to keep the reported price, freshness and verification context together.',
    evidence: ['Source identity', 'Update freshness', 'Verification record'],
  },
  compare: {
    index: '02',
    stage: 'Compare',
    eyebrow:
      'Cross-oracle and cross-chain price verification. Agreement is evidence; divergence is a signal to investigate.',
    title: 'See where the market agrees—and where it does not.',
    description:
      'Compare providers or chains without losing the context of consensus, spread, anomalies, feed behaviour and data freshness.',
    evidence: ['Consensus context', 'Divergence signals', 'Feed behaviour'],
  },
  assess: {
    index: '03',
    stage: 'Assess',
    eyebrow: 'Turn source evidence and agreement signals into an explainable risk assessment.',
    title: 'Decide with the evidence in view.',
    description:
      'Read freshness, concentration, correlation and divergence risk before an application or agent relies on a price.',
    evidence: ['Risk factors', 'Source independence', 'Decision context'],
  },
};

export default function PriceInsightContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const route = useMemo(() => readUrlSearchParams(searchParams), [searchParams]);
  const [dimension, setDimension] = useState<Dimension>('oracle');
  const [activeTab, setActiveTab] = useState<TabId>('comparison');
  const workflow = route.stage;
  const oracleSelection = useMemo(
    () => ({
      ...(route.symbol ? { symbol: route.symbol } : {}),
      ...(route.provider ? { oracles: [route.provider] } : {}),
    }),
    [route.provider, route.symbol]
  );

  useEffect(() => {
    if (route.symbol) {
      useCrossChainSelectorStore.getState().setSelectedSymbol(route.symbol);
    }
    if (route.provider) {
      useCrossChainSelectorStore.getState().setSelectedProvider(route.provider);
    }
    if (route.chain) {
      useCrossChainSelectorStore.getState().setSelectedBaseChain(route.chain);
    }
  }, [route.chain, route.provider, route.symbol]);

  const replaceRoute = useCallback(
    (update: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      update(params);
      router.replace(`/price-insight?${params.toString()}`);
    },
    [router, searchParams]
  );

  const setStage = useCallback(
    (stage: WorkflowStage) => {
      if (stage === 'compare') {
        setDimension('oracle');
        setActiveTab('comparison');
      }
      if (stage === 'assess') {
        setDimension('oracle');
        setActiveTab('risk');
      }
      replaceRoute((params) => params.set('stage', stage));
    },
    [replaceRoute]
  );

  const handleDimensionChange = useCallback((newDim: Dimension) => {
    setDimension(newDim);
    setActiveTab('comparison');
  }, []);

  const handleSourceCompare = useCallback(
    ({
      symbol,
      provider,
      chain,
    }: {
      symbol: string;
      provider: OracleProvider | null;
      chain: Blockchain | null;
    }) => {
      setDimension('oracle');
      setActiveTab('comparison');
      replaceRoute((params) => {
        params.set('stage', 'compare');
        if (symbol) params.set('symbol', symbol);
        if (provider) params.set('provider', provider);
        if (chain) params.set('chain', chain);
        params.delete('oracles');
        params.delete('chains');
      });
    },
    [replaceRoute]
  );

  const copy = WORKFLOW_COPY[workflow];
  const oracleKey = `${oracleSelection.symbol ?? 'default'}-${oracleSelection.oracles?.join(',') ?? 'all'}`;

  return (
    <ErrorBoundary level="page" componentName="PriceInsightContent">
      <div className="editorial-workspace evidence-workbench research-workbench comparison-workbench min-h-screen">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28">
          <EditorialWorkspaceHeader
            index={copy.index}
            stage={copy.stage}
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
            evidence={copy.evidence}
            action={
              <div className="flex flex-col items-start gap-3">
                <WorkflowSwitcher stage={workflow} onStageChange={setStage} />
                {workflow !== 'observe' && (
                  <DimensionSwitcher
                    dimension={dimension}
                    onDimensionChange={handleDimensionChange}
                  />
                )}
              </div>
            }
          />

          <EvidenceProcessRail
            label="Oracle evidence workflow"
            activeIndex={workflow === 'observe' ? 0 : workflow === 'compare' ? 1 : 2}
            items={[
              { label: 'Observe', detail: 'Source · chain · freshness' },
              { label: 'Compare', detail: 'Consensus · spread · divergence' },
              { label: 'Assess', detail: 'Risk · dependence · decision' },
            ]}
          />

          {workflow === 'observe' ? (
            <SourceRecordWorkspace onCompare={handleSourceCompare} />
          ) : (
            <div className="pt-7">
              {dimension === 'oracle' ? (
                <OracleDimension
                  key={oracleKey}
                  activeTab={workflow === 'assess' ? 'risk' : activeTab}
                  onTabChange={setActiveTab}
                  initialSymbol={oracleSelection.symbol}
                  initialOracles={oracleSelection.oracles}
                />
              ) : (
                <ChainDimension
                  activeTab={workflow === 'assess' ? 'risk' : activeTab}
                  onTabChange={setActiveTab}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function OracleDimension({
  activeTab,
  onTabChange,
  initialSymbol,
  initialOracles,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  initialSymbol?: string;
  initialOracles?: OracleProvider[];
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
  } = useCrossOraclePage({ initialSymbol, initialOracles });

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
      <div className="editorial-status-rail flex items-center justify-between border-y border-slate-900/15 px-1 py-3 mb-6">
        <LiveStatusBar
          isConnected={!isLoading && priceData.length > 0 && !oracleDataError.globalError}
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

      <div className="editorial-workbench-grid grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-12">
        <aside>
          <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
            <p className="editorial-index">01 — Set comparison</p>
            <span className="font-mono text-[10px] text-slate-400">INPUT</span>
          </div>
          <div className="xl:sticky xl:top-24">
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

        <section className="min-w-0" aria-label="Oracle comparison evidence">
          <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
            <p className="editorial-index">02 — Read the evidence</p>
            <span className="font-mono text-[10px] text-slate-400">ANALYSIS</span>
          </div>
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
        </section>
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
  const priceHistories = useCrossChainDataStore((s) => s.priceHistories);
  const lastUpdated = useCrossChainDataStore((s) => s.lastUpdated);
  const refreshStatus = useCrossChainDataStore((s) => s.refreshStatus);
  const refreshInterval = useCrossChainConfigStore((s) => s.refreshInterval);
  const setRefreshInterval = useCrossChainConfigStore((s) => s.setRefreshInterval);

  const analytics = useCrossChainAnalytics(currentPrices, priceHistories);

  const hasData = currentPrices.length > 0;
  const isInitialLoading = loading && !hasData;
  const isRefreshing = refreshStatus === 'refreshing' && hasData;

  return (
    <>
      <CrossChainDataInitializer />

      <div className="editorial-status-rail flex items-center justify-between border-y border-slate-900/15 px-1 py-3 mb-6">
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

      <div className="editorial-workbench-grid grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-12">
        <aside>
          <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
            <p className="editorial-index">01 — Set comparison</p>
            <span className="font-mono text-[10px] text-slate-400">INPUT</span>
          </div>
          <div className="xl:sticky xl:top-24 space-y-4">
            <ChainControlPanel />

            <div className="editorial-panel border-y border-slate-900/15 bg-white/35 p-4">
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
        </aside>

        <section className="min-w-0" aria-label="Cross-chain comparison evidence">
          <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
            <p className="editorial-index">02 — Read the evidence</p>
            <span className="font-mono text-[10px] text-slate-400">ANALYSIS</span>
          </div>
          <TabNavigation activeTab={activeTab} onTabChange={onTabChange} dimension="chain" />

          {isInitialLoading ? (
            <div className="py-20 flex flex-col justify-center items-center gap-3 bg-white/35 border-y border-slate-900/15 mt-4">
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
        </section>
      </div>
    </>
  );
}
