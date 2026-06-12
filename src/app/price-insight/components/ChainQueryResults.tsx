'use client';

import { lazy, Suspense } from 'react';

import type { useCrossChainAnalytics } from '@/app/cross-chain/hooks/useCrossChainAnalytics';
import { SectionErrorBoundary } from '@/components/error-boundary';

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
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent animate-spin rounded-full" />
          <span className="text-xs text-blue-500">Refreshing...</span>
        </div>
      )}
      {activeTab === 'comparison' && (
        <SectionErrorBoundary componentName="OverviewTab">
          <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}>
            <LazyOverviewTab />
          </Suspense>
        </SectionErrorBoundary>
      )}
      {activeTab === 'risk' && (
        <SectionErrorBoundary componentName="RiskAnalysisTab">
          <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}>
            <LazyRiskAnalysisTab risk={analytics.risk} chainCount={analytics.chainCount} />
          </Suspense>
        </SectionErrorBoundary>
      )}
      {activeTab === 'divergence' && (
        <SectionErrorBoundary componentName="DivergenceSignalTab">
          <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}>
            <LazyDivergenceSignalTab divergence={analytics.divergence} feed={analytics.feed} />
          </Suspense>
        </SectionErrorBoundary>
      )}
      {activeTab === 'feedHealth' && (
        <SectionErrorBoundary componentName="FeedHealthTab">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold text-gray-900">Feed Health</span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Overall Health</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.feed.overallHealthAvg.toFixed(1)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Health Level</div>
                  <div className="text-lg font-semibold text-gray-900 capitalize">
                    {analytics.feed.overallHealthLevel}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Anomalies</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.feed.anomalyCount}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Heartbeat Lost</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.feed.heartbeatLostCount}
                  </div>
                </div>
              </div>
              {analytics.feed.healthScores.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Chain Health Scores</h4>
                  {analytics.feed.healthScores.map((score, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                    >
                      <span className="text-sm text-gray-700">{score.provider}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          Rhythm: {score.rhythmStability.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Confidence: {score.confidenceStability.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Heartbeat: {score.heartbeatReliability.toFixed(1)}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {score.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionErrorBoundary>
      )}
    </div>
  );
}
