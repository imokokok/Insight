'use client';

import { lazy, memo, Suspense, useMemo } from 'react';

import { OracleErrorPanel } from '@/app/cross-oracle/components/OracleErrorPanel';
import type { DivergenceSignalsResult } from '@/app/cross-oracle/hooks/useDivergenceSignals';
import type { FeedBehaviorHookResult } from '@/app/cross-oracle/hooks/useFeedBehavior';
import type {
  PriceAnomaly,
  AnomalyDetectionResult,
} from '@/app/cross-oracle/hooks/usePriceAnomalyDetection';
import type { RiskMetricsResult } from '@/app/cross-oracle/hooks/useRiskMetrics';
import type { StabilityScoreHookResult } from '@/app/cross-oracle/hooks/useStabilityScore';
import type { OracleDataError } from '@/app/cross-oracle/types';
import { EmptyStateEnhanced } from '@/components/ui';
import type { ConsensusResult, ConsensusMethod } from '@/lib/analytics/consensusPrice';
import type { PriceStats } from '@/types/analytics';
import type { OracleProvider, PriceData } from '@/types/oracle';

import type { TabId } from './TabNavigation';

const LazySimplePriceComparisonTab = lazy(() =>
  import('@/app/cross-oracle/components/tabs/SimplePriceComparisonTab').then((m) => ({
    default: m.SimplePriceComparisonTab,
  }))
);
const LazyDivergenceSignalTab = lazy(() =>
  import('@/app/cross-oracle/components/tabs/DivergenceSignalTab').then((m) => ({
    default: m.CrossOracleDivergenceSignalTab,
  }))
);
const LazyFeedHealthTab = lazy(() =>
  import('@/app/cross-oracle/components/tabs/FeedHealthTab').then((m) => ({
    default: m.FeedHealthTab,
  }))
);
const LazyRiskAnalysisTab = lazy(() =>
  import('@/app/cross-oracle/components/tabs/RiskAnalysisTab').then((m) => ({
    default: m.RiskAnalysisTab,
  }))
);

interface OracleQueryResultsProps {
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  isLoading: boolean;
  queryProgress: { completed: number; total: number };
  priceStats: PriceStats & {
    medianPrice: number;
    standardDeviation: number;
    validPrices: number[];
  };
  anomalies: PriceAnomaly[];
  anomalyDetection: AnomalyDetectionResult;
  riskMetrics: RiskMetricsResult;
  divergenceSignals: DivergenceSignalsResult;
  feedBehavior: FeedBehaviorHookResult;
  stabilityScore: StabilityScoreHookResult;
  activeTab: TabId;
  onRefresh: () => void;
  oracleDataError?: OracleDataError;
  retryOracle?: (provider: OracleProvider) => Promise<void>;
  retryAllFailed?: () => Promise<void>;
  isRetrying?: boolean;
  retryingOracles?: OracleProvider[];
  consensusResult?: ConsensusResult | null;
  currentConsensusMethod?: ConsensusMethod;
  onConsensusMethodChange?: (method: ConsensusMethod) => void;
}

function OracleQueryResultsComponent({
  priceData,
  selectedOracles,
  selectedSymbol,
  isLoading,
  queryProgress,
  priceStats,
  anomalies,
  anomalyDetection: _anomalyDetection,
  riskMetrics,
  divergenceSignals,
  feedBehavior,
  stabilityScore,
  activeTab,
  onRefresh,
  oracleDataError,
  retryOracle,
  retryAllFailed,
  isRetrying,
  retryingOracles,
  consensusResult,
  currentConsensusMethod,
  onConsensusMethodChange,
}: OracleQueryResultsProps) {
  const divergenceAccelerationScore =
    divergenceSignals.acceleratingCount > 0
      ? Math.min(divergenceSignals.maxAcceleration * 100, 100)
      : 0;

  const divergenceAccelerationLevel =
    divergenceSignals.acceleratingCount > 0
      ? divergenceSignals.maxAcceleration > 0.5
        ? 'high'
        : divergenceSignals.maxAcceleration > 0.2
          ? 'medium'
          : 'low'
      : 'low';

  const feedBehaviorHealthLevel =
    feedBehavior.overallHealthLevel === 'healthy'
      ? 'low'
      : feedBehavior.overallHealthLevel === 'fair'
        ? 'medium'
        : feedBehavior.overallHealthLevel === 'degraded'
          ? 'high'
          : 'critical';

  const stabilityDecayScore =
    stabilityScore.rapidlyDecliningCount > 0 ? 80 : stabilityScore.decliningCount > 0 ? 50 : 10;

  const stabilityDecayLevel =
    stabilityScore.rapidlyDecliningCount > 0
      ? 'high'
      : stabilityScore.decliningCount > 0
        ? 'medium'
        : 'low';

  const riskAttribution = useMemo(
    () =>
      [
        {
          dimension: 'Market Concentration',
          contribution: riskMetrics.hhiValue * (riskMetrics.weights?.hhi ?? 0.1),
          suggestion:
            riskMetrics.hhiLevel !== 'low'
              ? 'Consider diversifying oracle sources'
              : 'Market concentration is healthy',
        },
        {
          dimension: 'Volatility',
          contribution: riskMetrics.volatilityIndex * (riskMetrics.weights?.volatility ?? 0.1),
          suggestion:
            riskMetrics.volatilityLevel !== 'low'
              ? 'High price volatility increases oracle risk'
              : 'Price volatility is within normal range',
        },
        {
          dimension: 'Data Freshness',
          contribution: riskMetrics.freshnessScore * (riskMetrics.weights?.freshness ?? 0.1),
          suggestion:
            riskMetrics.staleOracleCount > 0
              ? `${riskMetrics.staleOracleCount} oracle(s) have stale data`
              : 'All oracle data is fresh',
        },
        {
          dimension: 'Correlation Risk',
          contribution: riskMetrics.correlationScore * (riskMetrics.weights?.correlation ?? 0.1),
          suggestion:
            riskMetrics.correlationLevel !== 'low'
              ? 'High correlation between oracles increases systemic risk'
              : 'Oracle correlation is within safe range',
        },
        {
          dimension: 'Manipulation Resistance',
          contribution:
            (100 - riskMetrics.manipulationResistanceScore) *
            (riskMetrics.weights?.manipulationResistance ?? 0.1),
          suggestion:
            riskMetrics.manipulationResistanceLevel !== 'low'
              ? 'Low manipulation resistance detected'
              : 'Manipulation resistance is adequate',
        },
      ]
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 5),
    [riskMetrics]
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Loading data...</h3>
          <span className="text-xs text-gray-500">
            {queryProgress.completed} / {queryProgress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-300 bg-primary-600"
            style={{
              width: `${Math.min(100, queryProgress.total > 0 ? (queryProgress.completed / queryProgress.total) * 100 : 0)}%`,
            }}
          />
        </div>
      </div>
    );
  }

  if (oracleDataError?.globalError && !oracleDataError.isPartialSuccess && priceData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4">
        <OracleErrorPanel
          oracleDataError={oracleDataError}
          retryOracle={retryOracle}
          retryAllFailed={retryAllFailed}
          isRetrying={isRetrying}
          retryingOracles={retryingOracles}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  if (priceData.length === 0) {
    return (
      <div className="mt-4">
        <EmptyStateEnhanced
          type="search"
          title={`No data for ${selectedSymbol}`}
          description="Please select oracles and query to view comparison data"
          size="lg"
          variant="page"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {oracleDataError?.hasError && oracleDataError.isPartialSuccess && (
        <OracleErrorPanel
          oracleDataError={oracleDataError}
          retryOracle={retryOracle}
          retryAllFailed={retryAllFailed}
          isRetrying={isRetrying}
          retryingOracles={retryingOracles}
          onRefresh={onRefresh}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="min-h-[400px] p-6">
          {activeTab === 'comparison' && (
            <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}>
              <LazySimplePriceComparisonTab
                priceData={priceData}
                selectedOracles={selectedOracles}
                selectedSymbol={selectedSymbol}
                medianPrice={priceStats.medianPrice}
                minPrice={priceStats.minPrice}
                maxPrice={priceStats.maxPrice}
                priceRange={priceStats.priceRange}
                standardDeviation={priceStats.standardDeviation}
                standardDeviationPercent={priceStats.standardDeviationPercent}
                avgPrice={priceStats.avgPrice}
                validPrices={priceStats.validPrices}
                anomalies={anomalies}
                consensusResult={consensusResult}
                currentConsensusMethod={currentConsensusMethod}
                onConsensusMethodChange={onConsensusMethodChange}
              />
            </Suspense>
          )}
          {activeTab === 'divergence' && (
            <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}>
              <LazyDivergenceSignalTab
                timeSeries={divergenceSignals.timeSeries}
                leadership={divergenceSignals.leadership}
                divergenceMatrix={divergenceSignals.divergenceMatrix}
                acceleratingCount={divergenceSignals.acceleratingCount}
                directionalBiasCount={divergenceSignals.directionalBiasCount}
                leadingOracle={divergenceSignals.leadingOracle}
                maxAcceleration={divergenceSignals.maxAcceleration}
              />
            </Suspense>
          )}
          {activeTab === 'feedHealth' && (
            <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}>
              <LazyFeedHealthTab
                rhythmMetrics={feedBehavior.rhythmMetrics}
                confidenceMetrics={feedBehavior.confidenceMetrics}
                heartbeatMetrics={feedBehavior.heartbeatMetrics}
                healthScores={feedBehavior.healthScores}
                overallHealthAvg={feedBehavior.overallHealthAvg}
                overallHealthLevel={feedBehavior.overallHealthLevel}
                anomalyCount={feedBehavior.anomalyCount}
                heartbeatLostCount={feedBehavior.heartbeatLostCount}
                confidenceSurgeCount={feedBehavior.confidenceSurgeCount}
              />
            </Suspense>
          )}
          {activeTab === 'risk' && (
            <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded-lg" />}>
              <LazyRiskAnalysisTab
                riskMetrics={riskMetrics}
                oracleCount={priceData.length}
                divergenceAccelerationScore={divergenceAccelerationScore}
                divergenceAccelerationLevel={divergenceAccelerationLevel}
                feedBehaviorHealthAvg={feedBehavior.overallHealthAvg}
                feedBehaviorHealthLevel={feedBehaviorHealthLevel}
                stabilityDecayScore={stabilityDecayScore}
                stabilityDecayLevel={stabilityDecayLevel}
                riskAttribution={riskAttribution}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

export const OracleQueryResults = memo(OracleQueryResultsComponent);
OracleQueryResults.displayName = 'OracleQueryResults';
