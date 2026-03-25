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
import { PriceDeviationHeatmap } from '@/components/oracle/charts/PriceDeviationHeatmap';
import { PriceDistributionBoxPlot } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import { PriceVolatilityChart } from '@/components/oracle/charts/PriceVolatilityChart';
import { PriceCorrelationMatrix } from '@/components/oracle/charts/PriceCorrelationMatrix';
import { LatencyDistributionHistogram } from '@/components/oracle/charts/LatencyDistributionHistogram';
import { OraclePerformanceRanking } from '@/components/oracle/common/OraclePerformanceRanking';
import { MovingAverageChart } from '@/components/oracle/charts/MovingAverageChart';
import { DataQualityTrend } from '@/components/oracle/charts/DataQualityTrend';
import { ChainCoverageHeatmap } from '@/components/oracle/charts/ChainCoverageHeatmap';
import { ChainSelector } from '@/components/oracle/ChainSelector';
import { SnapshotManager } from '@/components/oracle/common/SnapshotManager';
import { SnapshotComparison } from '@/components/oracle/common/SnapshotComparison';
import { ChartSkeleton } from '@/components/ui';
// NoDataEmptyState is not available, using EmptyState instead
import { EmptyState } from '@/components/ui';
import { OracleProvider, PriceData, SnapshotStats } from '@/types/oracle';
import { OracleSnapshot } from '@/types/oracle';
import { oracleNames } from '../constants';
import { TimeRange, ChartDataPoint, QualityTrendData, DeviationFilter } from '../types';
import { chartColors, baseColors } from '@/lib/config/colors';
import { StatsSection } from './StatsSection';
import { PriceTableSection } from './PriceTableSection';
import { DataSourcePanel } from './DataSourcePanel';
import UnifiedExportSection from './UnifiedExportSection';
import { OracleComparisonSection } from './OracleComparisonSection';
import { BenchmarkComparisonSection } from './BenchmarkComparisonSection';
import { ChartTooltip } from './ChartTooltip';
import { ExportHistoryButton } from './ExportHistoryButton';
import { DropdownSelect } from '@/components/ui';
import { TabId, TabNavigation } from './TabNavigation';
import { ChartToolbar, TimeRange as ChartToolbarTimeRange } from '@/components/ui';
import { ControlPanel } from './ControlPanel';


interface ComparisonTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
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
  getChartData: () => ChartDataPoint[];
  heatmapData: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[];
  boxPlotData: import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[];
  volatilityData: import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[];
  correlationData: import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[];
  performanceData: import('@/components/oracle/common/OraclePerformanceRanking').OraclePerformanceData[];
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  qualityTrendData: QualityTrendData[];
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
  setTimeRange: (range: TimeRange) => void;
  handleSaveSnapshot: () => void;
  handleSelectSnapshot: (snapshot: OracleSnapshot) => void;
  fetchPriceData: () => Promise<void>;
  toggleOracle: (oracle: OracleProvider) => void;
  getLineStrokeDasharray: (oracle: OracleProvider) => string;
  getConsistencyRating: (stdDevPercent: number) => string;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getOracleLatencyData: (oracle: OracleProvider | null) => number[];
  t: (key: string, params?: Record<string, string | number>) => string;
  // ControlPanel props
  symbols: string[];
  deviationFilter: DeviationFilter;
  onDeviationFilterChange: (filter: DeviationFilter) => void;
  useAccessibleColors: boolean;
  onAccessibleColorsChange: (value: boolean) => void;
  onQuery: () => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  onSymbolChange: (symbol: string) => void;
}

export function ComparisonTabs({
  activeTab,
  onTabChange,
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
  setTimeRange,
  handleSaveSnapshot,
  handleSelectSnapshot,
  fetchPriceData,
  toggleOracle,
  getLineStrokeDasharray,
  getConsistencyRating,
  calculateChangePercent,
  getOracleLatencyData,
  t,
  // ControlPanel props
  symbols,
  deviationFilter,
  onDeviationFilterChange,
  useAccessibleColors,
  onAccessibleColorsChange,
  onQuery,
  activeFilterCount,
  onClearFilters,
  onSymbolChange,
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
              title="No Data Available"
              description="There is no price data available for the selected time range."
              action={
                <button
                  onClick={fetchPriceData}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Refresh
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

  const renderAnalysisTab = () => (
    <>
      {/* 预言机对比和基准对比部分 - 从Overview移过来 */}
      {priceData.length > 0 && (
        <OracleComparisonSection
          priceData={priceData}
          benchmarkOracle={selectedOracles[0]}
          showTable={true}
        />
      )}

      {priceData.length > 0 && (
        <BenchmarkComparisonSection priceData={priceData} loading={isLoading} />
      )}

      {/* 价格偏差热力图 */}
      {heatmapData.length > 0 && (
        <div className="mb-6">
          <PriceDeviationHeatmap data={heatmapData} useAccessibleColors={useAccessibleColors} />
        </div>
      )}

      {/* 价格分布箱线图 */}
      {boxPlotData.some((d) => d.prices.length > 0) && (
        <div className="mb-6">
          <PriceDistributionBoxPlot data={boxPlotData} oracleNames={oracleNames} />
        </div>
      )}

      {/* 波动率图表 */}
      {volatilityData.some((d) => d.prices.length > 0) && (
        <div className="mb-6">
          <PriceVolatilityChart data={volatilityData} oracleNames={oracleNames} />
        </div>
      )}

      {/* 移动平均线图表 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.movingAverage')}
        </h2>
        {maData.some((d) => d.prices.length > 0) && (
          <MovingAverageChart data={maData} oracleNames={oracleNames} />
        )}
      </div>

      {/* 数据质量趋势 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.dataQuality')}
        </h2>
        {qualityTrendData.some((d) => d.data.length > 0) && (
          <DataQualityTrend data={qualityTrendData} oracleNames={oracleNames} />
        )}
      </div>

      {/* 性能分析部分 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.performanceComparison')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('crossOracle.analysisTab.selectOracle')}
              </label>
              <DropdownSelect
                options={[
                  { value: '', label: t('crossOracle.analysisTab.allOracles') },
                  ...selectedOracles.map((oracle) => ({
                    value: oracle,
                    label: oracleNames[oracle],
                  })),
                ]}
                value={selectedPerformanceOracle || ''}
                onChange={(value) =>
                  setSelectedPerformanceOracle(value ? (value as OracleProvider) : null)
                }
                placeholder={t('crossOracle.analysisTab.selectOraclePlaceholder')}
                className="w-full"
              />
            </div>
            <LatencyDistributionHistogram
              data={getOracleLatencyData(selectedPerformanceOracle)}
              oracleName={
                selectedPerformanceOracle
                  ? oracleNames[selectedPerformanceOracle]
                  : t('crossOracle.analysisTab.allOracles')
              }
            />
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {t('crossOracle.analysisTab.summary')}
            </h3>
            <div className="space-y-4">
              {performanceData.map((data) => (
                <div
                  key={data.provider}
                  className={`flex items-center justify-between p-4 border transition-colors overflow-hidden rounded-lg ${
                    selectedPerformanceOracle === data.provider
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                  onClick={() => setSelectedPerformanceOracle(data.provider)}
                  style={{ cursor: 'pointer' }}
                  title={t('crossOracle.analysisTab.tooltip', {
                    name: data.name,
                    responseTime: data.responseTime,
                    accuracy: data.accuracy.toFixed(1),
                    stability: data.stability.toFixed(1),
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
                      <p className="text-gray-400">
                        {t('crossOracle.analysisTab.responseTime')}
                      </p>
                      <p className="font-semibold text-gray-900 truncate">{data.responseTime}ms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">{t('crossOracle.analysisTab.accuracy')}</p>
                      <p className="font-semibold text-success-600">{data.accuracy.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">{t('crossOracle.analysisTab.stability')}</p>
                      <p className="font-semibold text-primary-600">{data.stability.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 相关性矩阵 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.advancedAnalysis')}
        </h2>
        {correlationData.length >= 2 && (
          <div className="mb-4">
            <PriceCorrelationMatrix data={correlationData} oracleNames={oracleNames} />
          </div>
        )}
      </div>

      {/* 性能排名 */}
      {performanceData.length > 0 && (
        <div className="mb-6">
          <OraclePerformanceRanking performanceData={performanceData} />
        </div>
      )}
    </>
  );

  const renderHistoryTab = () => (
    <>
      {/* 导出历史数据功能入口 */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('crossOracle.historyTab.title')}
        </h2>
        <ExportHistoryButton
          selectedSymbol={selectedSymbol}
          selectedOracles={selectedOracles}
          oracleNames={oracleNames}
        />
      </div>

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
            <div className="bg-gray-50 border border-gray-200 border-dashed h-full min-h-[200px] flex items-center justify-center rounded-lg">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500">
                  {t('crossOracle.historyTab.selectSnapshot')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('crossOracle.historyTab.selectHint')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderChainsTab = () => (
    <>
      {/* 链覆盖热力图 */}
      <div className="mb-6">
        <ChainCoverageHeatmap
          showLabels={true}
          onCellClick={(provider, chain) => {
            console.log(`Selected: ${provider} - ${chain}`);
          }}
        />
      </div>

      {/* 链选择器示例 */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.chainsTab.chainSelector')}
        </h3>
        <div className="max-w-md">
          <ChainSelector
            selectedChains={[]}
            onChainsChange={(chains) => {
              console.log('Selected chains:', chains);
            }}
            allowMultiSelect={true}
            showOracleCount={true}
            placeholder={t('crossOracle.chainsTab.selectChains')}
          />
        </div>
        <p className="text-sm text-gray-500 mt-3">
          {t('crossOracle.chainsTab.chainSelectorDescription')}
        </p>
      </div>
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'analysis':
        return renderAnalysisTab();
      case 'chains':
        return renderChainsTab();
      case 'history':
        return renderHistoryTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Sidebar - ControlPanel */}
      <aside className="xl:w-[400px] xl:flex-shrink-0">
        <div className="xl:sticky xl:top-6">
          <ControlPanel
          selectedSymbol={selectedSymbol}
          onSymbolChange={onSymbolChange}
          symbols={symbols}
          selectedOracles={selectedOracles}
          onOracleToggle={toggleOracle}
          oracleChartColors={oracleChartColors}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          deviationFilter={deviationFilter}
          onDeviationFilterChange={onDeviationFilterChange}
          useAccessibleColors={useAccessibleColors}
          onAccessibleColorsChange={onAccessibleColorsChange}
          onQuery={onQuery}
          isLoading={isLoading}
          activeFilterCount={activeFilterCount}
          onClearFilters={onClearFilters}
          t={t}
          />
          </div>
      </aside>

      {/* Right Content - Tabs */}
      <main className="flex-1 min-w-0">
        <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
