'use client';

/**
 * @fileoverview 查询结果展示组件
 * @description 展示价格查询的结果，包括统计、图表和表格
 */

import { useTranslations } from '@/i18n';
import { TrendingUp } from 'lucide-react';
import { QueryResult, PriceData } from '../constants';
import {
  StatsGrid,
  PriceResultsTable,
  PriceChart,
  QuickLinks,
  DataQualityPanel,
  DataSourceSection,
  UnifiedExportSection,
  TimeComparisonSection,
} from './index';
import { ChartSkeleton } from '@/components/ui';
import { EmptyStateEnhanced } from '@/components/ui';
import { ProgressBar } from '@/components/ui';
import { SegmentedControl } from '@/components/ui';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { TimeComparisonConfig as ExternalTimeComparisonConfig } from '@/components/comparison/types';

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

interface TimePeriod {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  range: '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
}

interface TimeComparisonConfig {
  primaryPeriod: TimePeriod;
  comparisonPeriod: TimePeriod;
  comparisonType: 'previous' | 'custom' | 'year_over_year';
}

interface QueryResultsProps {
  isLoading: boolean;
  queryResults: QueryResult[];
  filteredQueryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  isCompareMode: boolean;
  compareQueryResults: QueryResult[];
  compareHistoricalData: Partial<Record<string, PriceData[]>>;
  showBaseline: boolean;
  avgPrice: number;
  compareAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  compareMaxPrice: number;
  compareMinPrice: number;
  priceRange: number;
  comparePriceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  avgChange24hPercent?: number;
  compareAvgChange24hPercent?: number;
  validPrices: number[];
  compareValidPrices: number[];
  chartData: ChartDataPoint[];
  compareChartData: ChartDataPoint[];
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  selectedRow: string | null;
  onRowSelect: (row: string | null) => void;
  hiddenSeries: Set<string>;
  onToggleSeries: (seriesName: string) => void;
  selectedTimeRange: number;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  onRefresh: () => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  timeComparisonConfig: TimeComparisonConfig;
  onTimeConfigChange: (config: TimeComparisonConfig) => void;
  filterInputRef?: React.RefObject<HTMLInputElement | null>;
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
  filteredQueryResults,
  historicalData,
  isCompareMode,
  compareQueryResults,
  compareHistoricalData,
  showBaseline,
  avgPrice,
  compareAvgPrice,
  maxPrice,
  minPrice,
  compareMaxPrice,
  compareMinPrice,
  priceRange,
  comparePriceRange,
  standardDeviation,
  standardDeviationPercent,
  avgChange24hPercent,
  compareAvgChange24hPercent,
  validPrices,
  compareValidPrices,
  chartData,
  compareChartData,
  queryDuration,
  queryProgress,
  currentQueryTarget,
  filterText,
  setFilterText,
  sortField,
  sortDirection,
  onSort,
  selectedRow,
  onRowSelect,
  hiddenSeries,
  onToggleSeries,
  selectedTimeRange,
  selectedSymbol,
  setSelectedSymbol,
  onRefresh,
  chartContainerRef,
  timeComparisonConfig,
  onTimeConfigChange,
  filterInputRef,
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

  return (
    <div className="space-y-6">
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
        compareMode={isCompareMode}
        compareAvgPrice={compareAvgPrice}
        compareMaxPrice={compareMaxPrice}
        compareMinPrice={compareMinPrice}
        comparePriceRange={comparePriceRange}
        compareAvgChange24hPercent={compareAvgChange24hPercent}
        comparePrices={compareValidPrices}
      />

      {/* 数据质量面板 */}
      <DataQualityPanel results={queryResults} historicalData={historicalData} />

      {/* 数据源和导出区域 */}
      <div className="flex items-center justify-between gap-4">
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

      {/* 表格和图表区域 */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        {/* 价格结果表格 */}
        <PriceResultsTable
          results={queryResults}
          filteredResults={filteredQueryResults}
          filterText={filterText}
          setFilterText={setFilterText}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          avgPrice={avgPrice}
          selectedRow={selectedRow}
          onRowSelect={onRowSelect}
          historicalData={historicalData}
          filterInputRef={filterInputRef}
        />

        {/* 价格图表 */}
        <div ref={chartContainerRef} className="min-w-0">
          <PriceChart
            chartData={chartData}
            queryResults={queryResults}
            hiddenSeries={hiddenSeries}
            onToggleSeries={onToggleSeries}
            selectedTimeRange={selectedTimeRange}
            selectedRow={selectedRow}
            compareMode={isCompareMode}
            compareChartData={compareChartData}
            compareQueryResults={compareQueryResults}
            showBaseline={showBaseline}
            avgPrice={avgPrice}
          />
        </div>
      </div>

      {/* 时间对比区域 */}
      {isCompareMode && chartData.length > 0 && compareChartData.length > 0 && (
        <TimeComparisonSection
          chartData={chartData}
          compareChartData={compareChartData}
          queryResults={queryResults}
          compareQueryResults={compareQueryResults}
          timeConfig={timeComparisonConfig as unknown as ExternalTimeComparisonConfig}
          onTimeConfigChange={(config) => {
            onTimeConfigChange(config as unknown as TimeComparisonConfig);
          }}
          hiddenSeries={hiddenSeries}
        />
      )}

      {/* 快速链接 */}
      <QuickLinks />
    </div>
  );
}
