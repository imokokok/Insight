'use client';

import { memo } from 'react';

import { Database } from 'lucide-react';

import { EmptyStateEnhanced } from '@/components/ui';
import { useTranslations } from '@/i18n';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { OracleErrorPanel } from './OracleErrorPanel';
import { SimplePriceComparisonTab } from './tabs/SimplePriceComparisonTab';

import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';
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
  historicalData?: Partial<Record<OracleProvider, Array<{ timestamp: number; price: number }>>>;
  oracleColors: Record<OracleProvider, string>;
  onRefresh: () => void;
  oracleDataError?: OracleDataError;
  retryOracle?: (provider: OracleProvider) => Promise<void>;
  retryAllFailed?: () => Promise<void>;
  isRetrying?: boolean;
  retryingOracles?: OracleProvider[];
}

function LoadingState({
  queryProgress,
  currentQueryTarget,
}: {
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: string | null };
}) {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.loadingData') || 'Loading Data'}
          </h3>
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
        {t('crossOracle.querying') || 'Querying'}{' '}
        {currentQueryTarget.oracle && t(`navbar.${currentQueryTarget.oracle.toLowerCase()}`)}
      </p>
    </div>
  );
}

function EmptyState({ selectedSymbol }: { selectedSymbol: string }) {
  const t = useTranslations();

  return (
    <EmptyStateEnhanced
      type="search"
      title={
        t('crossOracle.noDataTitle', { symbol: selectedSymbol }) || `No data for ${selectedSymbol}`
      }
      description={
        t('crossOracle.noDataDescription') ||
        'Please select oracles and query to view comparison data'
      }
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
  historicalData,
  oracleColors,
  oracleDataError,
  retryOracle,
  retryAllFailed,
  isRetrying,
  retryingOracles,
  onRefresh,
}: QueryResultsProps) {
  const t = useTranslations();

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
          t={t}
        />
      </div>
    );
  }

  if (priceData.length === 0) {
    return <EmptyState selectedSymbol={selectedSymbol} />;
  }

  return (
    <div className="space-y-4">
      {oracleDataError?.hasError && oracleDataError.isPartialSuccess && (
        <OracleErrorPanel
          oracleDataError={oracleDataError}
          retryOracle={retryOracle}
          retryAllFailed={retryAllFailed}
          isRetrying={isRetrying}
          retryingOracles={retryingOracles}
          onRefresh={onRefresh}
          t={t}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="min-h-[400px] p-6">
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
            historicalData={historicalData}
            oracleColors={oracleColors}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

export const QueryResults = memo(QueryResultsComponent);
QueryResults.displayName = 'QueryResults';

export default QueryResults;
