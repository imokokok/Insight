'use client';

/**
 * @fileoverview 查询结果展示组件
 * @description 展示价格查询的结果，包括统计、图表和详情
 */

import { TrendingUp } from 'lucide-react';

import { ChartSkeleton, EmptyStateEnhanced, ProgressBar, SegmentedControl } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type OracleProvider, type Blockchain } from '@/lib/oracles';

import { type QueryResult, type PriceData } from '../constants';
import { type QueryError } from '../hooks/usePriceQuery';

import {
  StatsGrid,
  PriceChart,
  DataSourceSection,
  UnifiedExportSection,
  ErrorBanner,
} from './index';

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
}

/**
 * 查询结果展示组件
 *
 * @param props - 组件属性
 * @returns 查询结果 JSX 元素
 */
export function QueryResults({
  isLoading,
  queryResults,
  historicalData,
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  avgChange24hPercent,
  validPrices,
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
}: QueryResultsProps) {
  const t = useTranslations();

  // 加载状态
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('priceQuery.loadingData')}</h3>
            <span className="text-xs text-gray-500">
              {queryProgress.completed} / {queryProgress.total}
            </span>
          </div>
          <ProgressBar
            progress={queryProgress.completed}
            total={queryProgress.total}
            showPercentage={true}
            size="md"
            variant="default"
          />
          <p className="text-xs text-gray-500 mt-2">
            {t('priceQuery.querying')}{' '}
            {currentQueryTarget.oracle && t(`navbar.${currentQueryTarget.oracle.toLowerCase()}`)}{' '}
            {currentQueryTarget.chain && t(`blockchain.${currentQueryTarget.chain.toLowerCase()}`)}
          </p>
        </div>
        <ChartSkeleton height={300} variant="price" showToolbar={true} />
      </div>
    );
  }

  // 空状态
  if (queryResults.length === 0) {
    return (
      <EmptyStateEnhanced
        type="search"
        title={t('priceQuery.noResults.title', { symbol: selectedSymbol })}
        description={t('priceQuery.noResults.description')}
        size="lg"
        variant="page"
      >
        <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-md">
          <p className="text-xs text-gray-400 mb-4 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" aria-hidden="true" />
            {t('priceQuery.noResults.popularTokens')}
          </p>
          <div className="flex items-center justify-center">
            <SegmentedControl
              options={['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'UNI'].map((token) => ({
                value: token,
                label: token,
              }))}
              value={selectedSymbol}
              onChange={(value) => setSelectedSymbol(value as string)}
              size="sm"
            />
          </div>
        </div>
      </EmptyStateEnhanced>
    );
  }

  // 获取当前价格数据（单条数据）
  const currentResult = queryResults[0];
  const currentPrice = currentResult?.priceData;

  return (
    <div className="space-y-6">
      {/* 错误提示横幅 */}
      {queryErrors.length > 0 && (
        <ErrorBanner
          errors={queryErrors}
          onRetry={onRetryDataSource}
          onRetryAll={onRetryAllErrors}
          onDismiss={onClearErrors}
        />
      )}

      {/* 统计网格 */}
      <StatsGrid
        avgPrice={avgPrice}
        maxPrice={maxPrice}
        minPrice={minPrice}
        priceRange={priceRange}
        standardDeviation={standardDeviation}
        standardDeviationPercent={standardDeviationPercent}
        dataPoints={queryResults.length}
        queryDuration={queryDuration}
        avgChange24hPercent={avgChange24hPercent}
        prices={validPrices}
      />

      {/* 数据源和导出区域 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

      {/* 价格图表 */}
      <div ref={chartContainerRef}>
        <PriceChart
          chartData={chartData}
          queryResults={queryResults}
          selectedTimeRange={selectedTimeRange}
          avgPrice={avgPrice}
        />
      </div>

      {/* 价格详情卡片 */}
      {currentPrice && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('priceQuery.currentPriceDetails')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('priceQuery.price')}</p>
              <p className="text-lg font-semibold text-gray-900">
                ${currentPrice.price.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('priceQuery.change24h')}</p>
              <p className={`text-lg font-semibold ${
                (currentPrice.change24hPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(currentPrice.change24hPercent || 0) >= 0 ? '+' : ''}
                {(currentPrice.change24hPercent || 0).toFixed(2)}%
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('priceQuery.volume24h')}</p>
              <p className="text-lg font-semibold text-gray-900">
                ${(currentPrice.volume24h || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('priceQuery.lastUpdated')}</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(currentPrice.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
