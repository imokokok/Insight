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

import { CrossDimensionInsight } from './CrossDimensionInsight';

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

  const riskAttribution = useMemo(() => {
    const topStale = riskMetrics.staleOracles
      .slice(0, 3)
      .map((o) => o.name)
      .join(', ');
    const topCorrelated = riskMetrics.highCorrelationPairs.slice(0, 2).join(', ');
    const topShared = riskMetrics.sharedSourceGroups
      .slice(0, 2)
      .map((g) => `${g.source} → ${g.oracles.join(', ')}`)
      .join('; ');
    const manipFactors = riskMetrics.manipulationResistanceFactors;
    const weakestManipFactor = [
      { label: 'data source diversity', value: manipFactors.dataSourceDiversity },
      { label: 'aggregation robustness', value: manipFactors.aggregationRobustness },
      { label: 'update frequency', value: manipFactors.updateFrequency },
      { label: 'on-chain verification', value: manipFactors.onChainVerification },
    ].sort((a, b) => a.value - b.value)[0];

    return [
      {
        dimension: 'Market Concentration',
        contribution: riskMetrics.hhiValue * (riskMetrics.weights?.hhi ?? 0.1),
        suggestion:
          riskMetrics.hhiLevel !== 'low'
            ? `HHI at ${riskMetrics.hhiValue.toFixed(0)} indicates ${riskMetrics.hhiLevel === 'critical' ? 'highly concentrated' : 'moderately concentrated'} market — consider adding ${riskMetrics.hhiLevel === 'critical' ? '2-3 more' : '1-2 more'} independent oracle sources to reduce dependency`
            : `Market concentration is healthy (HHI ${riskMetrics.hhiValue.toFixed(0)}) — no action needed`,
      },
      {
        dimension: 'Volatility',
        contribution: riskMetrics.volatilityIndex * (riskMetrics.weights?.volatility ?? 0.1),
        suggestion:
          riskMetrics.volatilityLevel !== 'low'
            ? `Price volatility index at ${riskMetrics.volatilityIndex.toFixed(1)} (${riskMetrics.volatilityLevel} level) — widen confidence thresholds or increase update frequency to reduce exposure`
            : `Price volatility is within normal range (${riskMetrics.volatilityIndex.toFixed(1)}) — current configuration is adequate`,
      },
      {
        dimension: 'Data Freshness',
        contribution: riskMetrics.freshnessScore * (riskMetrics.weights?.freshness ?? 0.1),
        suggestion:
          riskMetrics.staleOracleCount > 0
            ? `${riskMetrics.staleOracleCount} oracle(s) stale: ${topStale || 'unknown'} — check node health or switch to faster-updating feeds to prevent stale-price exploitation`
            : 'All oracle data is fresh — no staleness risk detected',
      },
      {
        dimension: 'Correlation Risk',
        contribution: riskMetrics.correlationScore * (riskMetrics.weights?.correlation ?? 0.1),
        suggestion:
          riskMetrics.correlationLevel !== 'low'
            ? `High correlation detected: ${topCorrelated || 'multiple pairs'} — these oracles likely share data sources, creating single-point-of-failure risk; diversify to independent sources`
            : 'Oracle correlation is within safe range — sources are sufficiently independent',
      },
      {
        dimension: 'Manipulation Resistance',
        contribution:
          (100 - riskMetrics.manipulationResistanceScore) *
          (riskMetrics.weights?.manipulationResistance ?? 0.1),
        suggestion:
          riskMetrics.manipulationResistanceLevel !== 'low'
            ? `Manipulation resistance at ${riskMetrics.manipulationResistanceScore}/100 — weakest factor is ${weakestManipFactor.label} (${weakestManipFactor.value}%); prioritize improving this to harden against price manipulation attacks`
            : `Manipulation resistance is adequate (${riskMetrics.manipulationResistanceScore}/100) — all sub-factors above threshold`,
      },
      {
        dimension: 'Shared Dependency',
        contribution:
          riskMetrics.sharedDependencyScore * (riskMetrics.weights?.sharedDependency ?? 0.1),
        suggestion:
          riskMetrics.sharedDependencyLevel !== 'low'
            ? `Shared data source risk: ${topShared || 'shared sources detected'} — if the shared source fails, ${riskMetrics.sharedSourceGroups.reduce((sum, g) => sum + g.oracles.length, 0)} oracle(s) are affected simultaneously; add independent data paths`
            : 'No shared data source dependencies — oracle sources are independent',
      },
    ]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5);
  }, [riskMetrics]);

  if (isLoading) {
    return (
      <div className="mt-4 border-y border-slate-900/15 bg-white/55 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Loading oracle data...</h3>
          <span className="text-xs font-medium text-slate-400">
            {queryProgress.completed} / {queryProgress.total}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden bg-slate-100">
          <div
            className="h-2 bg-blue-600 transition-all duration-300"
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
      <div className="mt-4 border-y border-slate-900/15 bg-white/55 p-6">
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

      <div className="overflow-hidden border-y border-slate-900/15 bg-white/55">
        <div className="min-h-[400px] p-6">
          {activeTab === 'comparison' && (
            <Suspense
              fallback={
                <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
              }
            >
              <LazySimplePriceComparisonTab
                priceData={priceData}
                selectedSymbol={selectedSymbol}
                medianPrice={priceStats.medianPrice}
                minPrice={priceStats.minPrice}
                maxPrice={priceStats.maxPrice}
                standardDeviation={priceStats.standardDeviation}
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
            <Suspense
              fallback={
                <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
              }
            >
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
            <Suspense
              fallback={
                <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
              }
            >
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
            <Suspense
              fallback={
                <div className="h-48 animate-pulse border-y border-slate-900/10 bg-slate-100" />
              }
            >
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

      <CrossDimensionInsight
        dimension="oracle"
        riskLevel={riskMetrics.riskLevel}
        riskScore={riskMetrics.riskScore}
        anomalyCount={anomalies.length}
        feedHealthLevel={feedBehavior.overallHealthLevel}
        feedHealthAvg={feedBehavior.overallHealthAvg}
        acceleratingCount={divergenceSignals.acceleratingCount}
        heartbeatLostCount={feedBehavior.heartbeatLostCount}
        healthScores={feedBehavior.healthScores}
        staleOracles={riskMetrics.staleOracles}
        sharedSourceGroups={riskMetrics.sharedSourceGroups}
      />
    </div>
  );
}

export const OracleQueryResults = memo(OracleQueryResultsComponent);
OracleQueryResults.displayName = 'OracleQueryResults';
