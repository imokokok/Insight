'use client';

import { useRef, useEffect } from 'react';

import { Database, BarChart3, Clock } from 'lucide-react';

import { PriceFlash } from '@/components/ui/PriceFlash';
import { safeMax } from '@/lib/utils';

import { type OnChainData } from '../constants';
import { useQueryParams, useQueryData, useQueryUI } from '../contexts';
import { useConsistencyRating } from '../hooks/useConsistencyRating';
import { formatPrice } from '../utils/queryResultsUtils';

import { QueryResultsEmpty } from './QueryResultsEmpty';
import { QueryResultsLoading } from './QueryResultsLoading';
import { StatsCardsSelector } from './stats';
import { TokenIcon } from './TokenIcon';

import { PriceFreshnessMonitor, DataSourceSection, ErrorBanner } from './index';

interface QueryResultsProps {
  onChainData: OnChainData;
}

export function QueryResults({ onChainData }: QueryResultsProps) {
  const params = useQueryParams();
  const queryData = useQueryData();
  const ui = useQueryUI();

  const { selectedSymbol, setSelectedSymbol, selectedTimeRange, setSelectedTimeRange } = params;

  const {
    queryResults,
    isLoading,
    queryDuration,
    queryProgress,
    currentQueryTarget,
    queryErrors,
    retryDataSource,
    retryAllErrors,
    clearErrors,
    refetch,
  } = queryData;

  const { avgPrice, maxPrice, minPrice, priceRange, standardDeviation, standardDeviationPercent } =
    queryData.stats;

  const {
    diaOnChainData,
    isDIADataLoading: _isDIADataLoading,
    winklinkOnChainData,
    isWINkLinkDataLoading: _isWINkLinkDataLoading,
    redstoneOnChainData,
    isRedStoneDataLoading: _isRedStoneDataLoading,
    supraOnChainData,
    isSupraDataLoading: _isSupraDataLoading,
    twapOnChainData,
    isTwapDataLoading: _isTwapDataLoading,
    reflectorOnChainData,
    isReflectorDataLoading: _isReflectorDataLoading,
    flareOnChainData,
    isFlareDataLoading: _isFlareDataLoading,
  } = onChainData;

  const consistencyRating = useConsistencyRating(standardDeviationPercent);
  const prevPriceRef = useRef<number>(0);
  const currentPriceValue =
    queryResults.length > 0
      ? (queryResults[0]?.priceData?.price ?? (avgPrice > 0 ? avgPrice : 0))
      : avgPrice > 0
        ? avgPrice
        : 0;
  const previousPriceValue = prevPriceRef.current;

  useEffect(() => {
    prevPriceRef.current = currentPriceValue;
  }, [currentPriceValue]);

  if (isLoading) {
    return <QueryResultsLoading />;
  }

  if (queryResults.length === 0) {
    return <QueryResultsEmpty />;
  }

  const currentResult = queryResults[0];
  const volume24hValue: number | null = null;

  return (
    <div className="space-y-4">
      {queryErrors.length > 0 && (
        <ErrorBanner
          errors={queryErrors}
          onRetry={retryDataSource}
          onRetryAll={retryAllErrors}
          onDismiss={clearErrors}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <TokenIcon symbol={selectedSymbol} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSymbol}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  {queryResults.length} Data Sources
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500 mb-1">Current Price</p>
              <div className="flex items-baseline gap-3 sm:justify-end">
                <PriceFlash value={currentPriceValue} previousValue={previousPriceValue}>
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
                    {formatPrice(currentPriceValue)}
                  </span>
                </PriceFlash>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatsCardsSelector
              currentResult={currentResult}
              diaOnChainData={diaOnChainData}
              winklinkOnChainData={winklinkOnChainData}
              redstoneOnChainData={redstoneOnChainData}
              supraOnChainData={supraOnChainData}
              twapOnChainData={twapOnChainData}
              reflectorOnChainData={reflectorOnChainData}
              flareOnChainData={flareOnChainData}
              maxPrice={maxPrice}
              minPrice={minPrice}
              avgPrice={avgPrice}
              priceRange={priceRange}
              volume24h={volume24hValue}
              consistencyRating={consistencyRating}
              standardDeviationPercent={standardDeviationPercent}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>
                Standard Deviation:{' '}
                <span className="font-medium text-gray-700">
                  {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Database className="w-4 h-4" />
              <span>
                Data Points:{' '}
                <span className="font-medium text-gray-700">{queryResults.length}</span>
              </span>
            </div>
            {queryDuration !== null && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  Query Duration:{' '}
                  <span className="font-medium text-gray-700">{queryDuration} ms</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-800">Data Freshness Monitor</h3>
            <span className="text-xs text-gray-400 ml-2">Real-time data age tracking</span>
          </div>
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
            <PriceFreshnessMonitor queryResults={queryResults} avgPrice={avgPrice} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <DataSourceSection
          results={queryResults}
          lastUpdated={
            queryResults.length > 0
              ? new Date(safeMax(queryResults.map((r) => r.priceData.timestamp)))
              : null
          }
          onRefresh={refetch}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
