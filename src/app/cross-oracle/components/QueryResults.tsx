'use client';

import { memo } from 'react';

import { Database, BarChart3, Shield, Trophy, Activity, Heart } from 'lucide-react';

import { EmptyStateEnhanced } from '@/components/ui';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { OracleErrorPanel } from './OracleErrorPanel';
import { RiskAlertBanner } from './RiskAlertBanner';
import { DivergenceSignalTab } from './tabs/DivergenceSignalTab';
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
  avgPrice: number;
  medianPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  validPrices: number[];
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
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300 bg-primary-600"
          style={{ width: `${(queryProgress.completed / queryProgress.total) * 100}%` }}
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
  avgPrice,
  medianPrice,
  minPrice,
  maxPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  validPrices,
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
}: QueryResultsProps) {
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
              medianPrice={medianPrice}
              minPrice={minPrice}
              maxPrice={maxPrice}
              priceRange={priceRange}
              standardDeviation={standardDeviation}
              standardDeviationPercent={standardDeviationPercent}
              avgPrice={avgPrice}
              validPrices={validPrices}
              anomalies={anomalies}
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
              riskScore={riskMetrics.riskScore}
              riskLevel={riskMetrics.riskLevel}
              riskColor={riskMetrics.riskColor}
              hhiValue={riskMetrics.hhiValue}
              hhiLevel={riskMetrics.hhiLevel}
              diversificationScore={riskMetrics.diversificationScore}
              diversificationLevel={riskMetrics.diversificationLevel}
              volatilityIndex={riskMetrics.volatilityIndex}
              volatilityLevel={riskMetrics.volatilityLevel}
              correlationScore={riskMetrics.correlationScore}
              correlationLevel={riskMetrics.correlationLevel}
              highCorrelationPairs={riskMetrics.highCorrelationPairs}
              freshnessScore={riskMetrics.freshnessScore}
              freshnessLevel={riskMetrics.freshnessLevel}
              staleOracleCount={riskMetrics.staleOracleCount}
              staleOracles={riskMetrics.staleOracles}
              manipulationResistanceScore={riskMetrics.manipulationResistanceScore}
              manipulationResistanceLevel={riskMetrics.manipulationResistanceLevel}
              manipulationResistanceFactors={riskMetrics.manipulationResistanceFactors}
              sharedDependencyScore={riskMetrics.sharedDependencyScore}
              sharedDependencyLevel={riskMetrics.sharedDependencyLevel}
              sharedSourceGroups={riskMetrics.sharedSourceGroups}
              systemicRiskFactor={riskMetrics.systemicRiskFactor}
              weights={riskMetrics.weights}
              oracleCount={priceData.length}
              divergenceAccelerationScore={
                divergenceSignals.acceleratingCount > 0
                  ? Math.min(divergenceSignals.maxAcceleration * 100, 100)
                  : 0
              }
              divergenceAccelerationLevel={
                divergenceSignals.acceleratingCount > 0
                  ? divergenceSignals.maxAcceleration > 0.5
                    ? 'high'
                    : divergenceSignals.maxAcceleration > 0.2
                      ? 'medium'
                      : 'low'
                  : 'low'
              }
              feedBehaviorHealthAvg={feedBehavior.overallHealthAvg}
              feedBehaviorHealthLevel={
                feedBehavior.overallHealthLevel === 'healthy'
                  ? 'low'
                  : feedBehavior.overallHealthLevel === 'fair'
                    ? 'medium'
                    : feedBehavior.overallHealthLevel === 'degraded'
                      ? 'high'
                      : 'critical'
              }
              stabilityDecayScore={
                stabilityScore.rapidlyDecliningCount > 0
                  ? 80
                  : stabilityScore.decliningCount > 0
                    ? 50
                    : 10
              }
              stabilityDecayLevel={
                stabilityScore.rapidlyDecliningCount > 0
                  ? 'high'
                  : stabilityScore.decliningCount > 0
                    ? 'medium'
                    : 'low'
              }
              riskAttribution={[
                {
                  dimension: 'Market Concentration',
                  contribution: (riskMetrics.hhiValue / 100) * 10,
                  suggestion:
                    riskMetrics.hhiLevel !== 'low'
                      ? 'Consider diversifying oracle sources'
                      : 'Market concentration is healthy',
                },
                {
                  dimension: 'Data Freshness',
                  contribution: (riskMetrics.freshnessScore / 100) * 10,
                  suggestion:
                    riskMetrics.staleOracleCount > 0
                      ? `${riskMetrics.staleOracleCount} oracle(s) have stale data`
                      : 'All oracle data is fresh',
                },
                {
                  dimension: 'Divergence Acceleration',
                  contribution: divergenceSignals.acceleratingCount > 0 ? 25 : 5,
                  suggestion:
                    divergenceSignals.acceleratingCount > 0
                      ? `${divergenceSignals.acceleratingCount} oracle(s) showing accelerating deviation`
                      : 'No accelerating deviations detected',
                },
                {
                  dimension: 'Feed Health',
                  contribution: ((100 - feedBehavior.overallHealthAvg) / 100) * 20,
                  suggestion:
                    feedBehavior.overallHealthLevel !== 'healthy'
                      ? 'Some oracle feeds show abnormal behavior'
                      : 'All oracle feeds are healthy',
                },
                {
                  dimension: 'Stability',
                  contribution:
                    stabilityScore.rapidlyDecliningCount > 0
                      ? 20
                      : stabilityScore.decliningCount > 0
                        ? 10
                        : 2,
                  suggestion:
                    stabilityScore.decliningCount > 0
                      ? `${stabilityScore.decliningCount} oracle(s) showing declining stability`
                      : 'Oracle data stability is good',
                },
              ]
                .sort((a, b) => b.contribution - a.contribution)
                .slice(0, 5)}
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
