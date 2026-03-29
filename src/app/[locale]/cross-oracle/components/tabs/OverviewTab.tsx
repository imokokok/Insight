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
import { StatsSection } from '../StatsSection';
import UnifiedExportSection from '../UnifiedExportSection';

interface OverviewTabProps {
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
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  variance: number;
  validPrices: number[];
  lastStats: SnapshotStats | null;
  historyMinMax: {
    avgPrice: { min: number; max: number };
    weightedAvgPrice: { min: number; max: number };
    maxPrice: { min: number; max: number };
    minPrice: { min: number; max: number };
    priceRange: { min: number; max: number };
    standardDeviationPercent: { min: number; max: number };
    variance: { min: number; max: number };
  };
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
  getConsistencyRating: (stdDevPercent: number) => string;
  calculateChangePercent: (current: number, previous: number) => number | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function OverviewTab({
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
  avgPrice,
  weightedAvgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  variance,
  validPrices,
  lastStats,
  historyMinMax,
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
  getConsistencyRating,
  calculateChangePercent,
  t,
}: OverviewTabProps) {
  return (
    <>
      <StatsSection
        qualityScoreData={qualityScoreData}
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        avgPrice={avgPrice}
        weightedAvgPrice={weightedAvgPrice}
        maxPrice={maxPrice}
        minPrice={minPrice}
        priceRange={priceRange}
        standardDeviationPercent={standardDeviationPercent}
        variance={variance}
        lastStats={lastStats}
        historyMinMax={historyMinMax}
        calculateChangePercent={calculateChangePercent}
        getConsistencyRating={getConsistencyRating}
        t={t}
      />

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
        avgPrice={avgPrice}
        standardDeviation={standardDeviation}
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
