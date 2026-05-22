'use client';

import { memo, useMemo } from 'react';

import { Database, BarChart3, Shield, Trophy, Activity, Heart } from 'lucide-react';

import { EmptyStateEnhanced } from '@/components/ui';
import type { ConsensusResult, ConsensusMethod } from '@/lib/analytics/consensusPrice';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
import type { PriceStats } from '@/types/analytics';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { OracleErrorPanel } from './OracleErrorPanel';
import { RiskAlertBanner } from './RiskAlertBanner';
import { CrossOracleDivergenceSignalTab as DivergenceSignalTab } from './tabs/DivergenceSignalTab';
import { FeedHealthTab } from './tabs/FeedHealthTab';
import { OracleRankingTab } from './tabs/OracleRankingTab';
import { RiskAnalysisTab } from './tabs/RiskAnalysisTab';
import { SimplePriceComparisonTab } from './tabs/SimplePriceComparisonTab';

import type { CrossOracleTab } from '../hooks/useCrossOraclePage';
import type { DivergenceSignalsResult } from '../hooks/useDivergenceSignals';
import type { FeedBehaviorHookResult } from '../hooks/useFeedBehavior';
import type { PriceAnomaly, AnomalyDetectionResult } from '../hooks/usePriceAnomalyDetection';
import type { RiskMetricsResult } from '../hooks/useRiskMetrics';
import type { StabilityScoreHookResult } from '../hooks/useStabilityScore';
import type { OracleDataError } from '../types';

interface QueryResultsProps {
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  isLoading: boolean;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: string | null };
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
  performanceMetrics: CalculatedPerformanceMetrics[];
  isCalculatingMetrics: boolean;
  activeTab: CrossOracleTab;
  onTabChange: (tab: CrossOracleTab) => void;
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

const TABS: { key: CrossOracleTab; label: string; icon: React.ElementType }[] = [
  { key: 'comparison', label: 'Price Comparison', icon: BarChart3 },
  { key: 'divergence', label: 'Divergence Signals', icon: Activity },
  { key: 'feedHealth', label: 'Feed Health', icon: Heart },
  { key: 'risk', label: 'Risk Analysis', icon: Shield },
  { key: 'ranking', label: 'Oracle Ranking', icon: Trophy },
];

function LoadingState({
  queryProgress,
  currentQueryTarget,
}: {
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: string | null };
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">Loading data...</h3>
        </div>
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
      <p className="text-xs text-gray-500 mt-2">
        Querying {currentQueryTarget.oracle && currentQueryTarget.oracle}
      </p>
    </div>
  );
}

function EmptyState({ selectedSymbol }: { selectedSymbol: string }) {
  return (
    <EmptyStateEnhanced
      type="search"
      title={`No data for ${selectedSymbol}`}
      description="Please select oracles and query to view comparison data"
      size="lg"
      variant="page"
    />
  );
}

function QueryResultsComponent({
  priceData,
  selectedOracles,
  selectedSymbol,
  isLoading,
  queryProgress,
  currentQueryTarget,
  priceStats,
  anomalies,
  anomalyDetection,
  riskMetrics,
  divergenceSignals,
  feedBehavior,
  stabilityScore,
  performanceMetrics,
  isCalculatingMetrics,
  activeTab,
  onTabChange,
  oracleDataError,
  retryOracle,
  retryAllFailed,
  isRetrying,
  retryingOracles,
  onRefresh,
  consensusResult,
  currentConsensusMethod,
  onConsensusMethodChange,
}: QueryResultsProps) {
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
    [
      riskMetrics,
      divergenceAccelerationScore,
      divergenceSignals.acceleratingCount,
      feedBehavior.overallHealthAvg,
      feedBehavior.overallHealthLevel,
      stabilityDecayScore,
      stabilityScore.decliningCount,
    ]
  );

  if (isLoading) {
    return <LoadingState queryProgress={queryProgress} currentQueryTarget={currentQueryTarget} />;
  }

  if (oracleDataError?.globalError && !oracleDataError.isPartialSuccess && priceData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
    return <EmptyState selectedSymbol={selectedSymbol} />;
  }

  return (
    <div className="space-y-4">
      {anomalyDetection.hasAnomalies && (
        <RiskAlertBanner
          anomalies={anomalyDetection.anomalies}
          count={anomalyDetection.count}
          highRiskCount={anomalyDetection.highRiskCount}
          mediumRiskCount={anomalyDetection.mediumRiskCount}
          lowRiskCount={anomalyDetection.lowRiskCount}
          maxDeviation={anomalyDetection.maxDeviation}
        />
      )}

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
        <div className="border-b border-gray-200 px-6 pt-4">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[400px] p-6">
          {activeTab === 'comparison' && (
            <SimplePriceComparisonTab
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
          )}
          {activeTab === 'divergence' && (
            <DivergenceSignalTab
              timeSeries={divergenceSignals.timeSeries}
              leadership={divergenceSignals.leadership}
              divergenceMatrix={divergenceSignals.divergenceMatrix}
              alertCount={divergenceSignals.alertCount}
              acceleratingCount={divergenceSignals.acceleratingCount}
              directionalBiasCount={divergenceSignals.directionalBiasCount}
              leadingOracle={divergenceSignals.leadingOracle}
              maxAcceleration={divergenceSignals.maxAcceleration}
            />
          )}
          {activeTab === 'feedHealth' && (
            <FeedHealthTab
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
          )}
          {activeTab === 'risk' && (
            <RiskAnalysisTab
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
          )}
          {activeTab === 'ranking' && (
            <OracleRankingTab
              priceData={priceData}
              performanceMetrics={performanceMetrics}
              isCalculatingMetrics={isCalculatingMetrics}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export const QueryResults = memo(QueryResultsComponent);
QueryResults.displayName = 'QueryResults';
