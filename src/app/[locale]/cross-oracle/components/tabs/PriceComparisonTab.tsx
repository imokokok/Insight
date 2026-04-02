'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';

import {
  ChartSkeleton,
  EmptyState,
  ChartToolbar,
  type TimeRange as ChartToolbarTimeRange,
} from '@/components/ui';
import { chartColors, baseColors } from '@/lib/config/colors';
import { type OracleProvider, type PriceData, type SnapshotStats } from '@/types/oracle';

import { oracleNames } from '../../constants';
import { type TimeRange, type ChartDataPoint } from '../../types';
import { ChartTooltip } from '../ChartTooltip';
import { DataSourcePanel } from '../DataSourcePanel';
import { PriceTableSection } from '../PriceTableSection';
import { QualityScoreCard } from '../QualityScoreCard';
import UnifiedExportSection from '../UnifiedExportSection';

interface PriceComparisonTabProps {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  isLoading: boolean;
  timeRange: TimeRange;
  zoomLevel: number;
  hoveredOracle: OracleProvider | null;
  setHoveredOracle: (oracle: OracleProvider | null) => void;
  setOracleFilter: (filter: OracleProvider | 'all') => void;
  setIsChartFullscreen: (fullscreen: boolean) => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  sortColumn: 'price' | 'timestamp' | null;
  sortDirection: 'asc' | 'desc';
  expandedRow: number | null;
  setExpandedRow: (row: number | null) => void;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  setHoveredRowIndex: (index: number | null) => void;
  setSelectedRowIndex: (index: number | null) => void;
  medianPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  deviationRate: number;
  consistencyRating: string;
  validPrices: number[];
  lastStats: SnapshotStats | null;
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => ChartDataPoint[];
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  handleSort: (column: 'price' | 'timestamp' | null) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  setTimeRange: (range: TimeRange) => void;
  fetchPriceData: () => Promise<void>;
  toggleOracle: (oracle: OracleProvider) => void;
  getLineStrokeDasharray: (oracle: OracleProvider) => string;
  calculateChangePercent: (current: number, previous: number) => number | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// 格式化价格显示
function formatPrice(value: number): string {
  if (value <= 0) return '-';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 格式化百分比显示
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function PriceComparisonTab({
  selectedSymbol,
  selectedOracles,
  priceData,
  filteredPriceData,
  isLoading,
  timeRange,
  zoomLevel,
  hoveredOracle,
  setHoveredOracle,
  setOracleFilter,
  setIsChartFullscreen,
  chartContainerRef,
  sortColumn,
  sortDirection,
  expandedRow,
  setExpandedRow,
  selectedRowIndex,
  hoveredRowIndex,
  setHoveredRowIndex,
  setSelectedRowIndex,
  medianPrice,
  maxPrice,
  minPrice,
  priceRange,
  deviationRate,
  consistencyRating,
  validPrices,
  lastStats,
  oracleChartColors,
  getChartData,
  qualityScoreData,
  handleSort,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  setTimeRange,
  fetchPriceData,
  toggleOracle,
  getLineStrokeDasharray,
  calculateChangePercent,
  t,
}: PriceComparisonTabProps) {
  // 解析交易对
  const [baseAsset, quoteAsset] = selectedSymbol.split('/');

  // 计算变化率
  const medianPriceChange = calculateChangePercent(medianPrice, lastStats?.avgPrice || 0);
  const maxPriceChange = calculateChangePercent(maxPrice, lastStats?.maxPrice || 0);

  return (
    <>
      {/* 简化版统计指标区域 */}
      <div className="mb-6">
        {/* 头部：交易对信息 */}
        <div className="mb-4 border-b border-gray-200 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* 左侧：交易对主信息 */}
            <div className="flex-1">
              {/* Live 徽章 - 带脉冲动画 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 rounded">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">
                    {t('crossOracle.live')}
                  </span>
                </span>
              </div>

              {/* 交易对显示 */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                  {baseAsset}
                </span>
                <span className="text-base text-gray-400 font-medium">/{quoteAsset}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('crossOracle.crossOraclePriceComparison')}
              </p>
            </div>

            {/* 右侧：关键统计 */}
            <div className="lg:w-auto flex gap-6">
              <div>
                <p className="text-xs text-gray-500">{t('crossOracle.oracleCount')}</p>
                <p className="text-base font-semibold text-gray-900">{selectedOracles.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('crossOracle.dataQuality')}</p>
                <p className="text-base font-semibold text-gray-900">
                  {qualityScoreData.reliability.responseSuccessRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 简化统计卡片 - 只保留4个核心指标 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 中位数价格 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('crossOracle.medianPrice')}</p>
            <p className="text-lg font-semibold text-gray-900">{formatPrice(medianPrice)}</p>
            {medianPriceChange !== null && (
              <p
                className={`text-xs mt-1 ${medianPriceChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {formatPercent(medianPriceChange)}
              </p>
            )}
          </div>

          {/* 价格区间 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('crossOracle.priceRange')}</p>
            <p className="text-lg font-semibold text-gray-900">{formatPrice(priceRange)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatPrice(minPrice)} - {formatPrice(maxPrice)}
            </p>
          </div>

          {/* 偏差率 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('crossOracle.deviationRate')}</p>
            <p className="text-lg font-semibold text-gray-900">{formatPercent(deviationRate)}</p>
            <p className="text-xs text-gray-400 mt-1">{t('crossOracle.ofMedian')}</p>
          </div>

          {/* 一致性评级 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('crossOracle.consistencyRating')}</p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                consistencyRating === 'A'
                  ? 'bg-emerald-100 text-emerald-800'
                  : consistencyRating === 'B'
                    ? 'bg-blue-100 text-blue-800'
                    : consistencyRating === 'C'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
              }`}
            >
              {consistencyRating}
            </span>
            <p className="text-xs text-gray-400 mt-1">{t('crossOracle.basedOnDeviation')}</p>
          </div>
        </div>
      </div>

      {/* 质量评分卡片 */}
      <div className="mb-6">
        <QualityScoreCard
          score={{
            consistency: qualityScoreData.reliability.historicalAccuracy,
            freshness: Math.max(
              0,
              100 -
                Math.floor(
                  (Date.now() - qualityScoreData.freshness.lastUpdated.getTime()) / 1000 / 60
                )
            ),
            completeness:
              (qualityScoreData.completeness.successCount /
                qualityScoreData.completeness.totalCount) *
              100,
            overall: qualityScoreData.reliability.responseSuccessRate,
            suggestions: [],
          }}
          variant="compact"
          showSuggestions={false}
        />
      </div>

      <PriceTableSection
        priceData={priceData}
        filteredPriceData={filteredPriceData}
        isLoading={isLoading}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        expandedRow={expandedRow}
        selectedRowIndex={selectedRowIndex}
        hoveredRowIndex={hoveredRowIndex}
        chartColors={oracleChartColors}
        avgPrice={medianPrice}
        standardDeviation={deviationRate}
        validPrices={validPrices}
        selectedOracles={selectedOracles}
        oracleChartColors={oracleChartColors}
        onSort={handleSort}
        onExpandRow={setExpandedRow}
        onSetHoveredRow={setHoveredRowIndex}
        onHoverOracle={setHoveredOracle}
        onToggleOracle={toggleOracle}
        t={t}
      />

      <div ref={chartContainerRef} className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.priceTrend')}
            {timeRange !== 'ALL' && (
              <span className="text-sm text-gray-500 ml-2">
                ({t(`crossOracle.timeRange.${timeRange}`)})
              </span>
            )}
          </h2>
        </div>

        <ChartToolbar
          timeRange={timeRange as ChartToolbarTimeRange}
          onTimeRangeChange={(range) => setTimeRange(range as TimeRange)}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onFullscreen={() => setIsChartFullscreen(true)}
          showChartType={false}
          showExport={false}
          showSync={false}
          className="mb-4"
        />

        {isLoading ? (
          <ChartSkeleton height={400 * zoomLevel} variant="price" showToolbar={false} />
        ) : getChartData().length === 0 ? (
          <div className="border border-gray-200 rounded-lg">
            <EmptyState
              title={t('crossOracle.noDataAvailable')}
              description={t('crossOracle.noDataDescription')}
              action={
                <button
                  onClick={fetchPriceData}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {t('crossOracle.refresh')}
                </button>
              }
            />
          </div>
        ) : (
          <div className="border border-gray-200 p-4 rounded-lg">
            <ResponsiveContainer width="100%" height={400 * zoomLevel}>
              <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="stdDevGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.15} />
                    <stop
                      offset="100%"
                      stopColor={chartColors.recharts.primary}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient id="stdDevGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
                    <stop
                      offset="100%"
                      stopColor={chartColors.recharts.primary}
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} />
                <XAxis
                  dataKey="timestamp"
                  stroke={baseColors.gray[500]}
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke={baseColors.gray[500]}
                  fontSize={12}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <RechartsTooltip content={<ChartTooltip t={t} />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upperBound2"
                  stroke="none"
                  fill="url(#stdDevGradient2)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound2"
                  stroke="none"
                  fill={chartColors.recharts.white}
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="upperBound1"
                  stroke="none"
                  fill="url(#stdDevGradient1)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound1"
                  stroke="none"
                  fill={chartColors.recharts.white}
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="avgPrice"
                  stroke={chartColors.recharts.purple}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  name={t('crossOracle.chart.avgPriceLine')}
                />
                {selectedOracles.map((oracle) => (
                  <Line
                    key={oracle}
                    type="monotone"
                    dataKey={oracleNames[oracle]}
                    stroke={oracleChartColors[oracle]}
                    strokeWidth={hoveredOracle === oracle || hoveredOracle === null ? 2.5 : 1}
                    strokeDasharray={getLineStrokeDasharray(oracle)}
                    strokeOpacity={hoveredOracle === oracle ? 1 : hoveredOracle === null ? 1 : 0.3}
                    dot={false}
                    activeDot={{
                      r: hoveredOracle === oracle ? 8 : 6,
                      strokeWidth: 2,
                      stroke: chartColors.recharts.white,
                      fill: oracleChartColors[oracle],
                    }}
                    onMouseEnter={() => setHoveredOracle(oracle)}
                    onMouseLeave={() => setHoveredOracle(null)}
                    onClick={() => {
                      setOracleFilter(oracle);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-6">
        <DataSourcePanel
          priceData={priceData}
          lastUpdated={new Date()}
          onRefresh={fetchPriceData}
          isLoading={isLoading}
        />
        <UnifiedExportSection
          loading={isLoading}
          crossOracleData={filteredPriceData}
          chartContainerRef={chartContainerRef}
          selectedAssets={[selectedSymbol]}
          selectedOracles={selectedOracles.map((o) => oracleNames[o])}
        />
      </div>
    </>
  );
}
