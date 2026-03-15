'use client';

import { useMemo } from 'react';
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
import {
  PriceDeviationHeatmap,
} from '@/components/oracle/charts/PriceDeviationHeatmap';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { NoDataEmptyState } from '@/components/ui/EmptyState';
import {
  PriceDistributionBoxPlot,
} from '@/components/oracle/charts/PriceDistributionBoxPlot';
import {
  PriceCorrelationMatrix,
} from '@/components/oracle/charts/PriceCorrelationMatrix';
import { PriceVolatilityChart } from '@/components/oracle/charts/PriceVolatilityChart';
import {
  OraclePerformanceRanking,
} from '@/components/oracle/common/OraclePerformanceRanking';
import { MovingAverageChart } from '@/components/oracle/charts/MovingAverageChart';
import { GasFeeComparison } from '@/components/oracle/common/GasFeeComparison';
import { ATRIndicator } from '@/components/oracle/indicators/ATRIndicator';
import { BollingerBands } from '@/components/oracle/indicators/BollingerBands';
import { DataQualityTrend } from '@/components/oracle/charts/DataQualityTrend';
import { SnapshotManager } from '@/components/oracle/common/SnapshotManager';
import { SnapshotComparison } from '@/components/oracle/common/SnapshotComparison';
import { FloatingActionButton } from '@/components/oracle/common/FloatingActionButton';
import { FavoriteButton } from '@/components/favorites';
import { OracleProvider } from '@/types/oracle';
import { oracleNames, TimeRange } from './constants';
import {
  FilterPanel,
  TabNavigation,
  StatsSection,
  PriceTableSection,
} from './components';
import { useCrossOraclePage } from './useCrossOraclePage';
import { chartColors, baseColors } from '@/lib/config/colors';
import { LatencyDistributionHistogram } from '@/components/oracle/charts/LatencyDistributionHistogram';

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
    gasFeeData,
    atrData,
    bollingerData,
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
      <div className="bg-white border border-gray-200 shadow-lg p-4 min-w-[280px]">
        <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
          {label}
        </div>
        {avgValue !== undefined && (
          <div className="mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">平均价格</span>
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
                <span>标准差</span>
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
          <div className="text-xs text-gray-500 mb-2">预言机价格</div>
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
        onSymbolChange={setSelectedSymbol}
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
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        oracleChartColors={oracleChartColors}
        onSort={handleSort}
        onExpandRow={setExpandedRow}
        onSetHoveredRow={setHoveredRowIndex}
        onSetSelectedRow={setSelectedRowIndex}
        onHoverOracle={setHoveredOracle}
        onSymbolChange={setSelectedSymbol}
        onToggleOracle={toggleOracle}
        t={t}
      />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.priceTrend')}
            {timeRange !== 'ALL' && (
              <span className="text-sm text-gray-500 ml-2">
                (
                {timeRange === '1H'
                  ? '1 小时'
                  : timeRange === '24H'
                    ? '24 小时'
                    : timeRange === '7D'
                      ? '7 天'
                      : timeRange === '30D'
                        ? '30 天'
                        : timeRange === '90D'
                          ? '90 天'
                          : '1 年'}
                )
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChartFullscreen(true)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors md:hidden"
              title="全屏查看"
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
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                title="缩小"
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
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                title="放大"
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
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="重置缩放"
            >
              重置
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
          <div className="border border-gray-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={400 * zoomLevel}>
              <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="stdDevGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="stdDevGradient2" x1="0" y1="0" x2="0" y2="1">
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
                  name="平均价格"
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
          <h2 className="text-lg font-semibold text-gray-900">价格趋势详细分析</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                title="缩小"
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
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                title="放大"
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
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              重置
            </button>
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
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
              <XAxis dataKey="timestamp" stroke={baseColors.gray[500]} fontSize={12} tickLine={false} />
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
                name="平均价格"
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
                    stroke: '#ffffff',
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
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg h-full min-h-[200px] flex items-center justify-center">
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
              <p className="text-sm text-gray-500">选择一个快照进行对比</p>
              <p className="text-xs text-gray-400 mt-1">从左侧快照列表中选择一个历史快照</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">移动平均线分析</h2>
          {maData.some((d) => d.prices.length > 0) && (
            <MovingAverageChart data={maData} oracleNames={oracleNames} />
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">布林带分析</h2>
          {bollingerData.some((d) => d.prices.length > 0) && (
            <BollingerBands data={bollingerData} oracleNames={oracleNames} />
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ATR 平均真实波幅</h2>
          {atrData.some((d) => d.prices.length > 0) && (
            <ATRIndicator data={atrData} oracleNames={oracleNames} />
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gas 费用对比</h2>
          <GasFeeComparison data={gasFeeData} oracleNames={oracleNames} />
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">数据质量趋势</h2>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">性能对比分析</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <LatencyDistributionHistogram data={latencyData} oracleName="所有预言机" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">预言机性能摘要</h3>
            <div className="space-y-3">
              {performanceData.map((data) => (
                <div
                  key={data.provider}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                    <span className="font-medium text-gray-900">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="text-center">
                      <p className="text-gray-400">响应时间</p>
                      <p className="font-semibold text-gray-900">{data.responseTime}ms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">准确率</p>
                      <p className="font-semibold text-green-600">{data.accuracy.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">稳定性</p>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">高级分析</h2>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style jsx>{`
        @keyframes pulse-highlight {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
          }
        }
        .outlier-highlight-pulse {
          animation: pulse-highlight 1s ease-in-out 3;
        }
      `}</style>

      {outlierStats.count > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-r-lg shadow-sm overflow-hidden">
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
                  <h3 className="text-sm font-semibold text-amber-800">检测到价格异常值</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    {outlierStats.count} 个异常
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-medium">异常预言机:</span>
                    <span className="font-medium">
                      {outlierStats.oracleNames.slice(0, 3).join('、')}
                      {outlierStats.oracleNames.length > 3 &&
                        ` 等${outlierStats.oracleNames.length}个`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-medium">平均偏差:</span>
                    <span className="font-medium">{outlierStats.avgDeviation.toFixed(3)}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={scrollToOutlier}
                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-200"
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossOracle.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>筛选</span>
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
            title={useAccessibleColors ? '切换标准颜色' : '切换色盲友好颜色'}
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
              {useAccessibleColors ? '色盲模式' : '标准模式'}
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
            {isLoading ? t('crossOracle.loading') : t('crossOracle.refresh')}
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
                <span>收藏</span>
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
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">快速访问收藏</h3>
                  </div>
                  <div className="p-1">
                    {oracleFavorites.map((favorite) => {
                      const config = favorite.config_data as typeof currentFavoriteConfig;
                      return (
                        <button
                          key={favorite.id}
                          onClick={() => handleApplyFavorite(config)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
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
                                className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                              >
                                {oracle}
                              </span>
                            ))}
                            {(config.selectedOracles?.length || 0) > 2 && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
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
                      查看全部收藏
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
              <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
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
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
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
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                重置
              </button>
              <button
                onClick={() => setIsChartFullscreen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
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
                    <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="stdDevGradient2Fullscreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} />
                <XAxis dataKey="timestamp" stroke={baseColors.gray[500]} fontSize={12} tickLine={false} />
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
                  name="平均价格"
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
                      stroke: '#ffffff',
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
              <span>平均价格线</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 border border-white shadow-sm" />
              <span>数据更新点</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-3 rounded"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
              />
              <span>±1 标准差范围</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-3 rounded"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
              />
              <span>±2 标准差范围</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">双指缩放查看更多细节</p>
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
