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
import { LatencyDistributionHistogram } from '@/components/oracle/charts/LatencyDistributionHistogram';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { NoDataEmptyState } from '@/components/ui/EmptyState';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { ProgressBar } from '@/components/ui/LoadingProgress';
import { PriceDistributionBoxPlot } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import { PriceCorrelationMatrix } from '@/components/oracle/charts/PriceCorrelationMatrix';
import { PriceVolatilityChart } from '@/components/oracle/charts/PriceVolatilityChart';
import { OraclePerformanceRanking } from '@/components/oracle/common/OraclePerformanceRanking';
import { MovingAverageChart } from '@/components/oracle/charts/MovingAverageChart';
import { DataQualityTrend } from '@/components/oracle/charts/DataQualityTrend';
import { SnapshotManager } from '@/components/oracle/common/SnapshotManager';
import { SnapshotComparison } from '@/components/oracle/common/SnapshotComparison';
import { FloatingActionButton } from '@/components/oracle/common/FloatingActionButton';
import { FavoriteButton } from '@/components/favorites';
import { OracleProvider } from '@/types/oracle';
import { oracleNames } from './constants';
import {
  FilterPanel,
  TabNavigation,
  StatsSection,
  PriceTableSection,
  PairSelector,
  DataSourcePanel,
  UnifiedExportSection,
  OracleComparisonSection,
  BenchmarkComparisonSection,
} from './components';
import { symbols } from './constants';
import { useCrossOraclePage } from './useCrossOraclePage';
import { chartColors, baseColors } from '@/lib/config/colors';
import {
  SegmentedControl,
  DropdownSelect,
  MultiSelect,
} from '@/components/ui/selectors';

export default function CrossOraclePage() {
  const {
    selectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    priceData,
    isLoading,
    lastUpdated,
    sortColumn,
    sortDirection,
    timeRange,
    setTimeRange,
    lastStats,
    historyMinMax,
    zoomLevel,
    deviationFilter,
    setDeviationFilter,
    oracleFilter,
    setOracleFilter,
    expandedRow,
    setExpandedRow,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    filterPanelRef,
    isChartFullscreen,
    setIsChartFullscreen,
    selectedSnapshot,
    setSelectedSnapshot,
    showComparison,
    setShowComparison,
    selectedRowIndex,
    hoveredRowIndex,
    highlightedOutlierIndex,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    useAccessibleColors,
    setUseAccessibleColors,
    hoveredOracle,
    setHoveredOracle,
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,
    getOracleLatencyData,
    t,
    router,
    user,
    oracleFavorites,
    currentFavoriteConfig,
    validPrices,
    avgPrice,
    weightedAvgPrice,
    maxPrice,
    minPrice,
    priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    currentStats,
    filteredPriceData,
    activeFilterCount,
    outlierStats,
    oracleChartColors,
    getChartData,
    heatmapData,
    boxPlotData,
    volatilityData,
    correlationData,
    latencyData,
    performanceData,
    maData,
    qualityTrendData,
    qualityScoreData,
    handleSort,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleSaveSnapshot,
    handleSelectSnapshot,
    handleClearFilters,
    getFilterSummary,
    toggleOracle,
    handleApplyFavorite,
    handleExportCSV,
    handleExportJSON,
    scrollToOutlier,
    calculateChangePercent,
    fetchPriceData,
    getLineStrokeDasharray,
    getConsistencyRating,
    activeTab,
    handleTabChange,
    setHoveredRowIndex,
    setSelectedRowIndex,
  } = useCrossOraclePage();

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const avgPriceData = payload.find((p) => p.dataKey === 'avgPrice');
    const oraclePrices = payload.filter((p) =>
      Object.values(oracleNames).includes(p.dataKey as OracleProvider)
    );
    const avgValue = avgPriceData?.value;
    const stdDevValue = payload.find((p) => p.dataKey === 'stdDev')?.value;

    return (
      <div className="bg-white border border-gray-200 p-4 min-w-[280px]">
        <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
          {label}
        </div>
        {avgValue !== undefined && (
          <div className="mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">{t('crossOracle.chartTooltip.avgPrice')}</span>
              <span className="font-semibold text-gray-900">
                $
                {avgValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {stdDevValue !== undefined && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{t('crossOracle.chartTooltip.stdDev')}</span>
                <span>
                  ±$
                  {stdDevValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <div className="text-xs text-gray-500 mb-2">{t('crossOracle.chartTooltip.oraclePrices')}</div>
          {oraclePrices.map((entry, index) => {
            const deviation = avgValue ? ((entry.value - avgValue) / avgValue) * 100 : null;
            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-700">{entry.dataKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-900">
                    $
                    {entry.value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  {deviation !== null && (
                    <span
                      className={`text-xs ${deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      ({deviation >= 0 ? '+' : ''}
                      {deviation.toFixed(3)}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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

      {/* Oracle Comparison Section */}
      {priceData.length > 0 && (
        <OracleComparisonSection
          priceData={priceData}
          benchmarkOracle={selectedOracles[0]}
          showCharts={true}
          showRadar={true}
          showTable={true}
        />
      )}

      {/* Benchmark Comparison Section */}
      {priceData.length > 0 && (
        <BenchmarkComparisonSection
          priceData={priceData}
          loading={isLoading}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <DataSourcePanel
          priceData={priceData}
          lastUpdated={lastUpdated}
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
                (
                {t(`crossOracle.timeRange.${timeRange}`)}
                )
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
                <Tooltip content={<CustomTooltip />} />
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
              <Tooltip content={<CustomTooltip />} />
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
          <PriceDeviationHeatmap data={heatmapData} useAccessibleColors={useAccessibleColors} />
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dune min-h-screen">
      <style jsx>{`
        @keyframes pulse-highlight {
          0%,
          100% {
            box-shadow: 0 0 0 0 ${chartColors.recharts.warning}B3;
          }
          50% {
            box-shadow: 0 0 0 8px ${chartColors.recharts.warning}00;
          }
        }
        .outlier-highlight-pulse {
          animation: pulse-highlight 1s ease-in-out 3;
        }
      `}</style>

      {outlierStats.count > 0 && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 border border-amber-200 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-amber-800">{t('crossOracle.outliers.detected')}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    {t('crossOracle.outliers.count', { count: outlierStats.count })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-medium">{t('crossOracle.outliers.outlierOracles')}:</span>
                    <span className="font-medium">
                      {outlierStats.oracleNames.slice(0, 3).join('、')}
                      {outlierStats.oracleNames.length > 3 &&
                        ` ${t('crossOracle.outliers.andMore', { count: outlierStats.oracleNames.length })}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-medium">{t('crossOracle.outliers.avgDeviation')}:</span>
                    <span className="font-medium">{outlierStats.avgDeviation.toFixed(3)}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={scrollToOutlier}
                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors border border-amber-200"
              >
                {t('crossOracle.outliers.viewDetails')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('crossOracle.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
          </div>
          <div className="hidden sm:block">
            <PairSelector
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              symbols={symbols}
              isLoading={isLoading}
              t={t}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
          <div className="relative" ref={filterPanelRef}>
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition-colors ${
                isFilterPanelOpen || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>{t('crossOracle.filter.button')}</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium bg-blue-600 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <svg
                className={`w-4 h-4 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <FilterPanel
              isOpen={isFilterPanelOpen}
              onClose={() => setIsFilterPanelOpen(false)}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              deviationFilter={deviationFilter}
              onDeviationFilterChange={setDeviationFilter}
              oracleFilter={oracleFilter}
              onOracleFilterChange={setOracleFilter}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
              getFilterSummary={getFilterSummary}
              t={t}
            />
          </div>

          <button
            onClick={() => setUseAccessibleColors(!useAccessibleColors)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm border transition-colors ${
              useAccessibleColors
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title={useAccessibleColors ? t('crossOracle.accessibility.standardColors') : t('crossOracle.accessibility.colorBlindMode')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span className="hidden sm:inline">
                {useAccessibleColors ? t('crossOracle.accessibility.standardMode') : t('crossOracle.accessibility.colorBlindMode')}
              </span>
          </button>

          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            {isLoading ? t('common.status.loading') : t('common.actions.refresh')}
          </button>

          {user && (
            <FavoriteButton
              configType="oracle_config"
              configData={currentFavoriteConfig}
              name={`${selectedSymbol} - ${selectedOracles.map((o) => oracleNames[o]).join(', ')}`}
              variant="button"
              showLabel
            />
          )}

          {user && oracleFavorites && oracleFavorites.length > 0 && (
            <div className="relative" ref={favoritesDropdownRef}>
              <button
                onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <span>{t('crossOracle.favorites.button')}</span>
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {oracleFavorites.length}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showFavoritesDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showFavoritesDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">{t('crossOracle.favorites.quickAccess')}</h3>
                  </div>
                  <div className="p-1">
                    {oracleFavorites.map((favorite) => {
                      const config = favorite.config_data as typeof currentFavoriteConfig;
                      return (
                        <button
                          key={favorite.id}
                          onClick={() => handleApplyFavorite(config)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {favorite.name}
                            </span>
                            <span className="text-xs text-gray-500">{config.symbol}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {config.selectedOracles?.slice(0, 2).map((oracle) => (
                              <span
                                key={oracle}
                                className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-100"
                              >
                                {oracle}
                              </span>
                            ))}
                            {(config.selectedOracles?.length || 0) > 2 && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                +{(config.selectedOracles?.length || 0) - 2}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setShowFavoritesDropdown(false);
                        router.push('/favorites');
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('crossOracle.favorites.viewAll')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('crossOracle.updated')} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'charts' && renderChartsTab()}
      {activeTab === 'advanced' && renderAdvancedTab()}
      {activeTab === 'snapshots' && renderSnapshotsTab()}
      {activeTab === 'performance' && renderPerformanceTab()}

      {isChartFullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('crossOracle.priceTrend')} - {selectedSymbol}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 p-0.5">
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <span className="px-3 text-sm text-gray-600 min-w-[4rem] text-center font-medium">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {t('crossOracle.chart.reset')}
              </button>
              <button
                onClick={() => setIsChartFullscreen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="stdDevGradient1Fullscreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.15} />
                    <stop
                      offset="100%"
                      stopColor={chartColors.recharts.primary}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient id="stdDevGradient2Fullscreen" x1="0" y1="0" x2="0" y2="1">
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
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upperBound2"
                  stroke="none"
                  fill="url(#stdDevGradient2Fullscreen)"
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
                  fill="url(#stdDevGradient1Fullscreen)"
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
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: baseColors.gray[50],
                      fill: oracleChartColors[oracle],
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="p-4 border-t border-gray-200 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-0.5 bg-indigo-500"
                style={{ borderTop: `2px dashed ${chartColors.chart.indigoLight}` }}
              />
              <span>{t('crossOracle.chartLegend.avgPriceLine')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-indigo-500 border border-white" />
              <span>{t('crossOracle.chartLegend.dataPoint')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-3" style={{ backgroundColor: chartColors.chart.blueLight }} />
              <span>{t('crossOracle.chartLegend.stdDev1')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-3" style={{ backgroundColor: baseColors.primary[300] }} />
              <span>{t('crossOracle.chartLegend.stdDev2')}</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">{t('crossOracle.chartLegend.pinchZoom')}</p>
          </div>
        </div>
      )}

      <FloatingActionButton
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onExportExcel={handleExportCSV}
        onSaveSnapshot={handleSaveSnapshot}
        isLoading={isLoading}
      />
    </div>
  );
}
