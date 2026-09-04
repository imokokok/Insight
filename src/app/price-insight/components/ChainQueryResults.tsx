'use client';

import { lazy, Suspense } from 'react';

import type { useCrossChainAnalytics } from '@/app/cross-chain/hooks/useCrossChainAnalytics';
import { SectionErrorBoundary } from '@/components/error-boundary';

import { CrossDimensionInsight } from './CrossDimensionInsight';

import type { TabId } from './TabNavigation';

type CrossChainAnalyticsResult = ReturnType<typeof useCrossChainAnalytics>;

const LazyRiskAnalysisTab = lazy(() =>
  import('@/app/cross-chain/components/tabs/RiskAnalysisTab').then((m) => ({
    default: m.RiskAnalysisTab,
  }))
);
const LazyDivergenceSignalTab = lazy(() =>
  import('@/app/cross-chain/components/tabs/DivergenceSignalTab').then((m) => ({
    default: m.CrossChainDivergenceSignalTab,
  }))
);
const LazyOverviewTab = lazy(() =>
  import('@/app/cross-chain/components/OverviewTab').then((m) => ({ default: m.OverviewTab }))
);
const LazyFeedHealthTab = lazy(() =>
  import('@/app/cross-oracle/components/tabs/FeedHealthTab').then((m) => ({
    default: m.FeedHealthTab,
  }))
);

interface ChainQueryResultsProps {
  activeTab: TabId;
  analytics: CrossChainAnalyticsResult;
  isRefreshing: boolean;
}

export function ChainQueryResults({ activeTab, analytics, isRefreshing }: ChainQueryResultsProps) {
  return (
    <div className="mt-4">
      {isRefreshing && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
          <span className="text-xs font-medium text-blue-600">Refreshing cross-chain data...</span>
        </div>
      )}
      {activeTab === 'comparison' && (
        <SectionErrorBoundary componentName="OverviewTab">
          <Suspense
            fallback={
              <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
            }
          >
            <LazyOverviewTab />
          </Suspense>
        </SectionErrorBoundary>
      )}
      {activeTab === 'risk' && (
        <SectionErrorBoundary componentName="RiskAnalysisTab">
          <Suspense
            fallback={
              <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
            }
          >
            <LazyRiskAnalysisTab risk={analytics.risk} chainCount={analytics.chainCount} />
          </Suspense>
        </SectionErrorBoundary>
      )}
      {activeTab === 'divergence' && (
        <SectionErrorBoundary componentName="DivergenceSignalTab">
          <Suspense
            fallback={
              <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
            }
          >
            <LazyDivergenceSignalTab divergence={analytics.divergence} feed={analytics.feed} />
          </Suspense>
        </SectionErrorBoundary>
      )}
      {activeTab === 'feedHealth' && (
        <SectionErrorBoundary componentName="FeedHealthTab">
          <Suspense
            fallback={
              <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
            }
          >
            <LazyFeedHealthTab
              rhythmMetrics={analytics.feed.rhythmMetrics}
              confidenceMetrics={analytics.feed.confidenceMetrics}
              heartbeatMetrics={analytics.feed.heartbeatMetrics}
              healthScores={analytics.feed.healthScores}
              overallHealthAvg={analytics.feed.overallHealthAvg}
              overallHealthLevel={analytics.feed.overallHealthLevel}
              anomalyCount={analytics.feed.anomalyCount}
              heartbeatLostCount={analytics.feed.heartbeatLostCount}
              confidenceSurgeCount={analytics.feed.confidenceSurgeCount}
            />
          </Suspense>
        </SectionErrorBoundary>
      )}

      <CrossDimensionInsight
        dimension="chain"
        riskLevel={analytics.risk.riskLevel}
        riskScore={analytics.risk.riskScore}
        anomalyCount={analytics.feed.anomalyCount}
        feedHealthLevel={analytics.feed.overallHealthLevel}
        feedHealthAvg={analytics.feed.overallHealthAvg}
        acceleratingCount={analytics.divergence.acceleratingCount}
        heartbeatLostCount={analytics.feed.heartbeatLostCount}
        healthScores={analytics.feed.healthScores}
        staleOracles={analytics.risk.staleOracles}
        sharedSourceGroups={analytics.risk.sharedSourceGroups}
      />
    </div>
  );
}
