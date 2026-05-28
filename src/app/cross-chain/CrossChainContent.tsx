'use client';

import { lazy, memo, Suspense, useState } from 'react';

import { SectionErrorBoundary } from '@/components/error-boundary';
import { SegmentedControl } from '@/components/ui';
import { formatTimeString } from '@/lib/utils/format';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';

import { CrossChainFilters } from './components/CrossChainFilters';
import { PageHeader } from './components/PageHeader';
import { PriceSpreadHeatmap } from './components/PriceSpreadHeatmap';
import { TabNavigation, type TabId } from './components/TabNavigation';
import { type RefreshInterval } from './constants';
import { useCrossChainAnalytics } from './hooks/useCrossChainAnalytics';
import { useCrossChainDataState } from './hooks/useCrossChainDataState';

function CrossChainDataInitializer() {
  useCrossChainDataState();
  return null;
}

const MemoizedPageHeader = memo(PageHeader);
const MemoizedCrossChainFilters = memo(CrossChainFilters);
const MemoizedPriceSpreadHeatmap = memo(PriceSpreadHeatmap);

const LazyOverviewTab = lazy(() =>
  import('./components/OverviewTab').then((m) => ({ default: m.OverviewTab }))
);
const LazyChartsTab = lazy(() =>
  import('./components/ChartsTab').then((m) => ({ default: m.ChartsTab }))
);
const LazyRiskAnalysisTab = lazy(() =>
  import('./components/tabs/RiskAnalysisTab').then((m) => ({ default: m.RiskAnalysisTab }))
);
const LazyDivergenceSignalTab = lazy(() =>
  import('./components/tabs/DivergenceSignalTab').then((m) => ({
    default: m.CrossChainDivergenceSignalTab,
  }))
);
const LazyChainRankingTab = lazy(() =>
  import('./components/tabs/ChainRankingTab').then((m) => ({ default: m.ChainRankingTab }))
);

const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
] as const;

export default function CrossChainContent() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

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
    <div className="min-h-screen bg-gray-50">
      <CrossChainDataInitializer />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MemoizedPageHeader />

        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:w-[360px] flex-shrink-0">
            <div className="xl:sticky xl:top-6 space-y-4">
              <MemoizedCrossChainFilters />

              <SectionErrorBoundary componentName="Price Spread Heatmap">
                <MemoizedPriceSpreadHeatmap />
              </SectionErrorBoundary>

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

              {lastUpdated && (
                <div className="text-xs text-gray-400 text-center">
                  Last updated: {formatTimeString(lastUpdated, false)}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {isInitialLoading ? (
              <div className="py-16 flex flex-col justify-center items-center gap-3 bg-white rounded-lg border border-gray-200 mt-4">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
                <div className="text-sm text-gray-500">Loading data...</div>
              </div>
            ) : (
              <div className="mt-4">
                {isRefreshing && (
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent animate-spin rounded-full" />
                    <span className="text-xs text-blue-500">Refreshing...</span>
                  </div>
                )}
                {activeTab === 'overview' && (
                  <SectionErrorBoundary componentName="OverviewTab">
                    <Suspense
                      fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}
                    >
                      <LazyOverviewTab />
                    </Suspense>
                  </SectionErrorBoundary>
                )}
                {activeTab === 'charts' && (
                  <SectionErrorBoundary componentName="ChartsTab">
                    <Suspense
                      fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}
                    >
                      <LazyChartsTab />
                    </Suspense>
                  </SectionErrorBoundary>
                )}
                {activeTab === 'risk' && (
                  <SectionErrorBoundary componentName="RiskAnalysisTab">
                    <Suspense
                      fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}
                    >
                      <LazyRiskAnalysisTab
                        risk={analytics.risk}
                        chainCount={analytics.chainCount}
                      />
                    </Suspense>
                  </SectionErrorBoundary>
                )}
                {activeTab === 'divergence' && (
                  <SectionErrorBoundary componentName="DivergenceSignalTab">
                    <Suspense
                      fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}
                    >
                      <LazyDivergenceSignalTab
                        divergence={analytics.divergence}
                        feed={analytics.feed}
                      />
                    </Suspense>
                  </SectionErrorBoundary>
                )}
                {activeTab === 'ranking' && (
                  <SectionErrorBoundary componentName="ChainRankingTab">
                    <Suspense
                      fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}
                    >
                      <LazyChainRankingTab
                        currentPrices={currentPrices}
                        divergence={analytics.divergence}
                        feed={analytics.feed}
                        stability={analytics.stability}
                      />
                    </Suspense>
                  </SectionErrorBoundary>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
