'use client';

import { memo } from 'react';

import { Database, BarChart3, Shield, Trophy } from 'lucide-react';

import { EmptyStateEnhanced } from '@/components/ui';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { OracleErrorPanel } from './OracleErrorPanel';
import { RiskAlertBanner } from './RiskAlertBanner';
import { OracleRankingTab } from './tabs/OracleRankingTab';
import { RiskAnalysisTab } from './tabs/RiskAnalysisTab';
import { SimplePriceComparisonTab } from './tabs/SimplePriceComparisonTab';

import type { CrossOracleTab } from '../hooks/useCrossOraclePage';
import type { PriceAnomaly, AnomalyDetectionResult } from '../hooks/usePriceAnomalyDetection';
import type { RiskMetricsResult } from '../hooks/useRiskMetrics';
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
              oracleCount={priceData.length}
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
