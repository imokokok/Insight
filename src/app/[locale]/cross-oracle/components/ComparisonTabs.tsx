'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { PriceDeviationHeatmap } from '@/components/oracle/charts/PriceDeviationHeatmap';
import { PriceDistributionBoxPlot } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import { PriceVolatilityChart } from '@/components/oracle/charts/PriceVolatilityChart';
import { PriceCorrelationMatrix } from '@/components/oracle/charts/PriceCorrelationMatrix';
import { LatencyDistributionHistogram } from '@/components/oracle/charts/LatencyDistributionHistogram';
import { OraclePerformanceRanking } from '@/components/oracle/common/OraclePerformanceRanking';
import { MovingAverageChart } from '@/components/oracle/charts/MovingAverageChart';
import { DataQualityTrend } from '@/components/oracle/charts/DataQualityTrend';
import { SnapshotManager } from '@/components/oracle/common/SnapshotManager';
import { SnapshotComparison } from '@/components/oracle/common/SnapshotComparison';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { NoDataEmptyState } from '@/components/ui/EmptyState';
import { OracleProvider, PriceData, SnapshotStats } from '@/types/oracle';
import { OracleSnapshot } from '@/types/oracle';
import { oracleNames } from '../constants';
import { TimeRange } from '../constants';
import { chartColors, baseColors } from '@/lib/config/colors';
import { StatsSection } from './StatsSection';
import { PriceTableSection } from './PriceTableSection';
import { DataSourcePanel } from './DataSourcePanel';
import UnifiedExportSection from './UnifiedExportSection';
import { OracleComparisonSection } from './OracleComparisonSection';
import { BenchmarkComparisonSection } from './BenchmarkComparisonSection';
import { ChartTooltip } from './ChartTooltip';
import { DropdownSelect } from '@/components/ui/selectors';
import { TabId } from './TabNavigation';

interface ComparisonTabsProps {
  activeTab: TabId;
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
  historyMinMax: import('../constants').HistoryMinMax;
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => any[];
  heatmapData: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[];
  boxPlotData: import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[];
  volatilityData: import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[];
  correlationData: import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[];
  performanceData: import('@/components/oracle/common/OraclePerformanceRanking').OraclePerformanceData[];
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  qualityTrendData: { oracle: OracleProvider; data: any[] }[];
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  selectedSnapshot: OracleSnapshot | null;
  setSelectedSnapshot: (snapshot: OracleSnapshot | null) => void;
  showComparison: boolean;
  setShowComparison: (show: boolean) => void;
  selectedPerformanceOracle: OracleProvider | null;
  setSelectedPerformanceOracle: (oracle: OracleProvider | null) => void;
  currentStats: SnapshotStats;
  handleSort: (column: 'price' | 'timestamp' | null) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleSaveSnapshot: () => void;
  handleSelectSnapshot: (snapshot: OracleSnapshot) => void;
  fetchPriceData: () => Promise<void>;
  toggleOracle: (oracle: OracleProvider) => void;
  getLineStrokeDasharray: (oracle: OracleProvider) => string;
  getConsistencyRating: (stdDevPercent: number) => string;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getOracleLatencyData: (oracle: OracleProvider | null) => number[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ComparisonTabs({
  activeTab,
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
  heatmapData,
  boxPlotData,
  volatilityData,
  correlationData,
  performanceData,
  maData,
  qualityTrendData,
  qualityScoreData,
  selectedSnapshot,
  setSelectedSnapshot,
  showComparison,
  setShowComparison,
  selectedPerformanceOracle,
  setSelectedPerformanceOracle,
  currentStats,
  handleSort,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleSaveSnapshot,
  handleSelectSnapshot,
  fetchPriceData,
  toggleOracle,
  getLineStrokeDasharray,
  getConsistencyRating,
  calculateChangePercent,
  getOracleLatencyData,
  t,
}: ComparisonTabsProps) {
  const renderOverviewTab = () => (
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
        onSetSelectedRow={setSelectedRowIndex}
        onHoverOracle={setHoveredOracle}
        onToggleOracle={toggleOracle}
        t={t}
      />

      {priceData.length > 0 && (
        <OracleComparisonSection
          priceData={priceData}
          benchmarkOracle={selectedOracles[0]}
          showCharts={true}
          showRadar={true}
          showTable={true}
        />
      )}

      {priceData.length > 0 && (
        <BenchmarkComparisonSection
          priceData={priceData}
          loading={isLoading}
        />
      )}

      <div className="flex items-center justify-between gap-4">
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

      <div ref={chartContainerRef} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.priceTrend')}
            {timeRange !== 'ALL' && (
              <span className="text-sm text-gray-500 ml-2">
                ({t(`crossOracle.timeRange.${timeRange}`)})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChartFullscreen(true)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors md:hidden"
              title={t('crossOracle.chart.fullscreen')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
            <div className="flex items-center bg-gray-100 p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                title={t('crossOracle.chart.zoomOut')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-2 text-xs text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                title={t('crossOracle.chart.zoomIn')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title={t('crossOracle.chart.resetZoom')}
            >
              {t('crossOracle.chart.reset')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <ChartSkeleton height={400 * zoomLevel} variant="price" showToolbar={false} />
        ) : getChartData().length === 0 ? (
          <div className="border border-gray-200 rounded-lg">
            <NoDataEmptyState onRefresh={fetchPriceData} />
          </div>
        ) : (
          <div className="border border-gray-200 p-4">
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
                <Tooltip content={<ChartTooltip t={t} />} />
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
    </>
  );

  const renderChartsTab = () => (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('crossOracle.chartsTab.detailedAnalysis')}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                title={t('crossOracle.chart.zoomOut')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-2 text-xs text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                title={t('crossOracle.chart.zoomIn')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {t('crossOracle.chart.reset')}
            </button>
          </div>
        </div>
        <div className="border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height={400 * zoomLevel}>
            <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="stdDevGradient1Charts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="stdDevGradient2Charts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
                  <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.01} />
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
              <Tooltip content={<ChartTooltip t={t} />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="upperBound2"
                stroke="none"
                fill="url(#stdDevGradient2Charts)"
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
                fill="url(#stdDevGradient1Charts)"
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
                    stroke: baseColors.gray[50],
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
      </div>

      {heatmapData.length > 0 && (
        <div className="mb-8">
          <PriceDeviationHeatmap data={heatmapData} useAccessibleColors={false} />
        </div>
      )}

      {boxPlotData.some((d) => d.prices.length > 0) && (
        <div className="mb-8">
          <PriceDistributionBoxPlot data={boxPlotData} oracleNames={oracleNames} />
        </div>
      )}

      {volatilityData.some((d) => d.prices.length > 0) && (
        <div className="mb-8">
          <PriceVolatilityChart data={volatilityData} oracleNames={oracleNames} />
        </div>
      )}
    </>
  );

  const renderSnapshotsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <SnapshotManager
          onSaveSnapshot={handleSaveSnapshot}
          onSelectSnapshot={handleSelectSnapshot}
          selectedSnapshotId={selectedSnapshot?.id}
        />
      </div>
      <div className="lg:col-span-2">
        {showComparison && selectedSnapshot ? (
          <SnapshotComparison
            currentStats={currentStats}
            currentPriceData={priceData}
            currentSymbol={selectedSymbol}
            selectedSnapshot={selectedSnapshot}
            onClose={() => {
              setShowComparison(false);
              setSelectedSnapshot(null);
            }}
          />
        ) : (
          <div className="bg-gray-50 border border-gray-200 border-dashed h-full min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm text-gray-500">{t('crossOracle.snapshotsTab.selectSnapshot')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('crossOracle.snapshotsTab.selectHint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvancedTab = () => {
    return (
      <>
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crossOracle.advancedTab.movingAverage')}</h2>
          {maData.some((d) => d.prices.length > 0) && (
            <MovingAverageChart data={maData} oracleNames={oracleNames} />
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crossOracle.advancedTab.dataQuality')}</h2>
          {qualityTrendData.some((d) => d.data.length > 0) && (
            <DataQualityTrend data={qualityTrendData} oracleNames={oracleNames} />
          )}
        </div>
      </>
    );
  };

  const renderPerformanceTab = () => (
    <>
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crossOracle.performanceTab.performanceComparison')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-5">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('crossOracle.performanceTab.selectOracle')}
              </label>
              <DropdownSelect
                options={[
                  { value: '', label: t('crossOracle.performanceTab.allOracles') },
                  ...selectedOracles.map((oracle) => ({
                    value: oracle,
                    label: oracleNames[oracle],
                  })),
                ]}
                value={selectedPerformanceOracle || ''}
                onChange={(value) =>
                  setSelectedPerformanceOracle(
                    value ? (value as OracleProvider) : null
                  )
                }
                placeholder={t('crossOracle.performanceTab.selectOraclePlaceholder')}
                className="w-full"
              />
            </div>
            <LatencyDistributionHistogram
              data={getOracleLatencyData(selectedPerformanceOracle)}
              oracleName={
                selectedPerformanceOracle ? oracleNames[selectedPerformanceOracle] : t('crossOracle.performanceTab.allOracles')
              }
            />
          </div>
          <div className="bg-white border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('crossOracle.performanceTab.summary')}</h3>
            <div className="space-y-3">
              {performanceData.map((data) => (
                <div
                  key={data.provider}
                  className={`flex items-center justify-between p-3 border transition-colors overflow-hidden ${
                    selectedPerformanceOracle === data.provider
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                  onClick={() => setSelectedPerformanceOracle(data.provider)}
                  style={{ cursor: 'pointer' }}
                  title={t('crossOracle.performanceTab.tooltip', { 
                    name: data.name, 
                    responseTime: data.responseTime, 
                    accuracy: data.accuracy.toFixed(1), 
                    stability: data.stability.toFixed(1) 
                  })}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 flex-shrink-0"
                      style={{ backgroundColor: data.color }}
                    />
                    <span className="font-medium text-gray-900 truncate">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-gray-400">{t('crossOracle.performanceTab.responseTime')}</p>
                      <p className="font-semibold text-gray-900 truncate">{data.responseTime}ms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">{t('crossOracle.performanceTab.accuracy')}</p>
                      <p className="font-semibold text-green-600">{data.accuracy.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">{t('crossOracle.performanceTab.stability')}</p>
                      <p className="font-semibold text-blue-600">{data.stability.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crossOracle.performanceTab.advancedAnalysis')}</h2>
        {correlationData.length >= 2 && (
          <div className="mb-6">
            <PriceCorrelationMatrix data={correlationData} oracleNames={oracleNames} />
          </div>
        )}
      </div>

      {performanceData.length > 0 && (
        <div className="mb-8">
          <OraclePerformanceRanking performanceData={performanceData} />
        </div>
      )}
    </>
  );

  switch (activeTab) {
    case 'overview':
      return renderOverviewTab();
    case 'charts':
      return renderChartsTab();
    case 'advanced':
      return renderAdvancedTab();
    case 'snapshots':
      return renderSnapshotsTab();
    case 'performance':
      return renderPerformanceTab();
    default:
      return renderOverviewTab();
  }
}
