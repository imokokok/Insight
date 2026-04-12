'use client';

import { Database, BarChart3, Clock } from 'lucide-react';

import { useTranslations } from '@/i18n';
import type { OracleProvider, Blockchain } from '@/lib/oracles';
import type { DIATokenOnChainData } from '@/lib/oracles/diaDataService';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/winklinkRealDataService';
import type { RedStoneTokenOnChainData } from '@/lib/services/oracle/clients/redstone';

import { type QueryResult, type PriceData } from '../constants';
import { useConsistencyRating } from '../hooks/useConsistencyRating';
import { type QueryError } from '../hooks/usePriceQuery';
import { formatPrice } from '../utils/queryResultsUtils';

import { QueryResultsEmpty } from './QueryResultsEmpty';
import { QueryResultsLoading } from './QueryResultsLoading';
import { StatsCardsSelector } from './stats';
import { TokenIcon } from './TokenIcon';

import { PriceChart, DataSourceSection, UnifiedExportSection, ErrorBanner } from './index';

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

interface QueryResultsProps {
  isLoading: boolean;
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  avgChange24hPercent?: number;
  validPrices: number[];
  chartData: ChartDataPoint[];
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  selectedTimeRange: number;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  onRefresh: () => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  queryErrors: QueryError[];
  onRetryDataSource: (provider: OracleProvider, chain: Blockchain) => void;
  onRetryAllErrors: () => void;
  onClearErrors: () => void;
  diaOnChainData?: DIATokenOnChainData | null;
  isDIADataLoading?: boolean;
  winklinkOnChainData?: WINkLinkTokenOnChainData | null;
  isWINkLinkDataLoading?: boolean;
  redstoneOnChainData?: RedStoneTokenOnChainData | null;
  isRedStoneDataLoading?: boolean;
}

export function QueryResults({
  isLoading,
  queryResults,
  historicalData: _historicalData,
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  avgChange24hPercent: _avgChange24hPercent,
  chartData,
  queryDuration,
  queryProgress,
  currentQueryTarget,
  selectedTimeRange,
  selectedSymbol,
  setSelectedSymbol,
  onRefresh,
  chartContainerRef,
  queryErrors,
  onRetryDataSource,
  onRetryAllErrors,
  onClearErrors,
  diaOnChainData,
  isDIADataLoading: _isDIADataLoading,
  winklinkOnChainData,
  isWINkLinkDataLoading: _isWINkLinkDataLoading,
  redstoneOnChainData,
  isRedStoneDataLoading: _isRedStoneDataLoading,
}: QueryResultsProps) {
  const t = useTranslations();
  const consistencyRating = useConsistencyRating(standardDeviationPercent);

  if (isLoading) {
    return (
      <QueryResultsLoading queryProgress={queryProgress} currentQueryTarget={currentQueryTarget} />
    );
  }

  if (queryResults.length === 0) {
    return <QueryResultsEmpty selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />;
  }

  const currentResult = queryResults[0];
  const currentPrice = currentResult?.priceData;
  const currentPriceValue = currentPrice?.price || avgPrice;
  const volume24hValue = 0;

  return (
    <div className="space-y-4">
      {queryErrors.length > 0 && (
        <ErrorBanner
          errors={queryErrors}
          onRetry={onRetryDataSource}
          onRetryAll={onRetryAllErrors}
          onDismiss={onClearErrors}
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
                  {queryResults.length} {t('priceQuery.dataSources.title')}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500 mb-1">{t('priceQuery.currentPrice')}</p>
              <div className="flex items-baseline gap-3 sm:justify-end">
                <span className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
                  ${formatPrice(currentPriceValue)}
                </span>
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
                {t('priceQuery.stats.standardDeviation')}:{' '}
                <span className="font-medium text-gray-700">
                  {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Database className="w-4 h-4" />
              <span>
                {t('priceQuery.stats.dataPoints')}:{' '}
                <span className="font-medium text-gray-700">{queryResults.length}</span>
              </span>
            </div>
            {queryDuration !== null && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  {t('priceQuery.stats.queryDuration')}:{' '}
                  <span className="font-medium text-gray-700">{queryDuration} ms</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div ref={chartContainerRef} className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-800">
              {t('priceQuery.charts.priceHistory')}
            </h3>
            <span className="text-xs text-gray-400 ml-2">(历史数据来源于 Binance API)</span>
          </div>
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
            <PriceChart
              chartData={chartData}
              queryResults={queryResults}
              selectedTimeRange={selectedTimeRange}
              avgPrice={avgPrice}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <DataSourceSection
          results={queryResults}
          lastUpdated={
            queryResults.length > 0
              ? new Date(Math.max(...queryResults.map((r) => r.priceData.timestamp)))
              : null
          }
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
        <UnifiedExportSection
          loading={isLoading}
          queryResults={queryResults}
          chartContainerRef={chartContainerRef}
          selectedSymbol={selectedSymbol}
          avgPrice={avgPrice}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          standardDeviation={standardDeviation}
          standardDeviationPercent={standardDeviationPercent}
        />
      </div>
    </div>
  );
}
