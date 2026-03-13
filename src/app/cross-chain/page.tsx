'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { useCrossChainData } from './useCrossChainData';
import { CrossChainFilters } from './components/CrossChainFilters';
import { PriceSpreadHeatmap } from './components/PriceSpreadHeatmap';
import { PriceComparisonTable } from './components/PriceComparisonTable';
import { CorrelationMatrix } from './components/CorrelationMatrix';
import { RollingCorrelationChart } from './components/RollingCorrelationChart';
import { CointegrationAnalysis } from './components/CointegrationAnalysis';
import { StandardBoxPlot } from './components/StandardBoxPlot';
import { InteractivePriceChart } from './components/InteractivePriceChart';
import { VolatilitySurface } from './components/VolatilitySurface';
import { ProgressBar, JumpIndicator, TrendIndicator } from './components/SmallComponents';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Scatter,
  Line,
  Legend,
  Brush,
} from 'recharts';
import { TooltipProps, LegendClickEvent, ScatterShapeProps } from '@/lib/types/recharts';
import { Blockchain } from '@/lib/types/oracle';
import {
  chainNames,
  chainColors,
  getIntegrityColor,
  getVolatilityColor,
  getDataFreshness,
  getConsistencyRating,
  getStabilityRating,
  calculateChangePercent,
  formatPrice,
} from './utils';
import { ChainStats, RefreshInterval } from './constants';
import { useColorblindMode, useSetColorblindMode } from '@/stores/crossChainStore';

type ViewMode = 'price' | 'volatility';

export default function CrossChainPage() {
  const { t } = useI18n();
  const data = useCrossChainData();
  const colorblindMode = useColorblindMode();
  const setColorblindMode = useSetColorblindMode();
  const [viewMode, setViewMode] = useState<ViewMode>('price');

  const {
    loading,
    refreshStatus,
    showRefreshSuccess,
    lastUpdated,
    fetchData,
    exportToCSV,
    exportToJSON,
    refreshInterval,
    setRefreshInterval,
    supportedChains,
    filteredChains,
    selectedSymbol,
    priceDifferences,
    chartData,
    chartDataWithMA,
    priceDistributionData,
    boxPlotData,
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    medianPrice,
    iqrValue,
    standardDeviation,
    standardDeviationPercent,
    coefficientOfVariation,
    skewness,
    kurtosis,
    confidenceInterval95,
    totalDataPoints,
    validPrices,
    iqrOutliers,
    scatterData,
    chainVolatility,
    updateDelays,
    dataIntegrity,
    priceJumpFrequency,
    priceChangePercent,
    meanBinIndex,
    medianBinIndex,
    stdDevBinRange,
    prevStats,
    showMA,
    setShowMA,
    maPeriod,
    setMaPeriod,
    chartKey,
    setChartKey,
    hiddenLines,
    setHiddenLines,
    focusedChain,
    setFocusedChain,
    hoveredCell,
    setHoveredCell,
    selectedCell,
    setSelectedCell,
    tooltipPosition,
    setTooltipPosition,
    tableFilter,
    setTableFilter,
    sortedPriceDifferences,
    handleSort,
    sortColumn,
    sortDirection,
    historicalPrices,
    currentPrices,
  } = data;

  const refreshOptions = [
    { value: 0, label: t('crossChain.autoRefreshOff') },
    { value: 30000, label: t('crossChain.autoRefresh30s') },
    { value: 60000, label: t('crossChain.autoRefresh1m') },
    { value: 300000, label: t('crossChain.autoRefresh5m') },
  ];

  const statsData: ChainStats[] = [
    {
      label: t('crossChain.averagePrice'),
      value: avgPrice > 0 ? `$${formatPrice(avgPrice)}` : '-',
      trend: calculateChangePercent(avgPrice, prevStats?.avgPrice || 0),
      tooltip: t('crossChain.tooltip.averagePrice'),
    },
    {
      label: t('crossChain.medianPrice'),
      value: medianPrice > 0 ? `$${formatPrice(medianPrice)}` : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.medianPrice'),
    },
    {
      label: t('crossChain.highestPrice'),
      value: maxPrice > 0 ? `$${formatPrice(maxPrice)}` : '-',
      trend: calculateChangePercent(maxPrice, prevStats?.maxPrice || 0),
      subValue: minPrice > 0 ? `Min: $${formatPrice(minPrice)}` : null,
      tooltip: t('crossChain.tooltip.highestPrice'),
    },
    {
      label: t('crossChain.priceRange'),
      value: priceRange > 0 ? `$${formatPrice(priceRange)}` : '-',
      trend: calculateChangePercent(priceRange, prevStats?.priceRange || 0),
      tooltip: t('crossChain.tooltip.priceRange'),
    },
    {
      label: t('crossChain.iqr'),
      value: iqrValue > 0 ? `$${formatPrice(iqrValue)}` : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.iqr'),
    },
    {
      label: t('crossChain.standardDeviation'),
      value: standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-',
      trend: calculateChangePercent(
        standardDeviationPercent,
        prevStats?.standardDeviationPercent || 0
      ),
      subValue: standardDeviation > 0 ? `$${formatPrice(standardDeviation)}` : null,
      tooltip: t('crossChain.tooltip.standardDeviation'),
    },
    {
      label: t('crossChain.skewness'),
      value: skewness !== 0 ? skewness.toFixed(4) : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.skewness'),
    },
    {
      label: t('crossChain.kurtosis'),
      value: kurtosis !== 0 ? kurtosis.toFixed(4) : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.kurtosis'),
    },
    {
      label: t('crossChain.confidenceInterval95'),
      value:
        confidenceInterval95.lower > 0
          ? `$${confidenceInterval95.lower.toFixed(2)} - $${confidenceInterval95.upper.toFixed(2)}`
          : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.confidenceInterval95'),
    },
    {
      label: t('crossChain.coefficientOfVariation'),
      value: coefficientOfVariation > 0 ? `${(coefficientOfVariation * 100).toFixed(4)}%` : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.coefficientOfVariation'),
    },
    {
      label: t('crossChain.consistencyRating'),
      value:
        standardDeviationPercent > 0
          ? t(`crossChain.consistency.${getConsistencyRating(standardDeviationPercent)}`)
          : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.consistencyRating'),
    },
    {
      label: t('crossChain.dataPoints'),
      value: totalDataPoints.toString(),
      trend: null,
      tooltip: t('crossChain.tooltip.dataPoints'),
    },
  ];

  const handleLegendClick = (e: unknown) => {
    const dataKey = (e as { dataKey?: string | number })?.dataKey;
    if (typeof dataKey === 'string') {
      const newSet = new Set(hiddenLines);
      if (newSet.has(dataKey)) newSet.delete(dataKey);
      else newSet.add(dataKey);
      setHiddenLines(newSet);
    }
  };

  const handleLegendDoubleClick = (chain: Blockchain) => {
    if (focusedChain === chain) {
      setFocusedChain(null);
      setHiddenLines(new Set());
    } else {
      setFocusedChain(chain);
      const newHidden = new Set<string>();
      filteredChains.forEach((c) => {
        if (c !== chain) newHidden.add(c);
      });
      setHiddenLines(newHidden);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossChain.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
          {/* 色盲友好模式切换 */}
          <button
            onClick={() => setColorblindMode(!colorblindMode)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded transition-colors ${
              colorblindMode
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
            title={colorblindMode ? '色盲友好模式已开启' : '切换到色盲友好模式'}
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>色盲友好</span>
            {colorblindMode && (
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <span className="text-sm text-gray-500">{t('crossChain.export')}:</span>
          <button
            onClick={exportToCSV}
            disabled={loading || currentPrices.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            CSV
          </button>
          <button
            onClick={exportToJSON}
            disabled={loading || currentPrices.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            JSON
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200">
            <span className="text-sm text-gray-600">{t('crossChain.autoRefresh')}</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
              className="text-sm bg-transparent border-none focus:outline-none"
            >
              {refreshOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshStatus === 'refreshing'}
            className={`px-4 py-2 text-sm text-white ${refreshStatus === 'error' ? 'bg-red-600' : refreshStatus === 'success' && showRefreshSuccess ? 'bg-green-600' : 'bg-gray-900'} disabled:opacity-50`}
          >
            {refreshStatus === 'refreshing'
              ? t('crossChain.loading')
              : showRefreshSuccess
                ? t('crossChain.refreshSuccess')
                : t('crossChain.refresh')}
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('crossChain.lastUpdated')} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <CrossChainFilters data={data} />
      <PriceSpreadHeatmap data={data} />

      {loading ? (
        <div className="py-16 flex flex-col justify-center items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin" />
          <div className="text-gray-500 text-sm">{t('crossChain.loadingData')}</div>
        </div>
      ) : (
        <>
          {/* Stats Grid - Responsive layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-0 mb-8 pb-8 border-b border-gray-200">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className={`px-3 sm:px-4 py-3 bg-white sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-gray-100 ${index > 0 ? 'sm:border-l sm:border-gray-200' : ''}`}
                title={stat.tooltip}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase truncate">{stat.label}</div>
                  {stat.trend !== null && stat.trend !== undefined && (
                    <TrendIndicator changePercent={stat.trend} />
                  )}
                </div>
                <div className="text-base sm:text-lg font-semibold text-gray-900 mt-1 truncate">{stat.value}</div>
                {stat.subValue && (
                  <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{stat.subValue}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('crossChain.priceDistributionAnalysis')}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-3">
                  {t('crossChain.priceDistributionHistogram')}
                </h4>
                <div className="h-64 bg-gray-50 p-4 rounded-lg">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} width={40} />
                      <Tooltip formatter={(value) => [value, '频率']} />
                      {meanBinIndex >= 0 && priceDistributionData[meanBinIndex] && (
                        <ReferenceLine
                          x={priceDistributionData[meanBinIndex].range}
                          stroke="#3B82F6"
                          strokeDasharray="5 5"
                        />
                      )}
                      {medianBinIndex >= 0 && priceDistributionData[medianBinIndex] && (
                        <ReferenceLine
                          x={priceDistributionData[medianBinIndex].range}
                          stroke="#10B981"
                          strokeDasharray="5 5"
                        />
                      )}
                      <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-white border rounded-lg p-3">
                    <div className="text-xs text-gray-500">{t('crossChain.medianLine')}</div>
                    <div className="text-lg font-semibold text-green-600">
                      ${medianPrice.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg p-3">
                    <div className="text-xs text-gray-500">{t('crossChain.meanLine')}</div>
                    <div className="text-lg font-semibold text-blue-600">
                      ${avgPrice.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg p-3">
                    <div className="text-xs text-gray-500">{t('crossChain.standardDeviation')}</div>
                    <div className="text-lg font-semibold text-purple-600">
                      ${standardDeviation.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-3">
                  {t('crossChain.chainPriceBoxPlot')}
                </h4>
                <div className="h-64 bg-gray-50 p-4 rounded-lg">
                  <StandardBoxPlot data={boxPlotData} />
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'price' ? (
            <>
              <PriceComparisonTable data={data} />
              <CorrelationMatrix data={data} />
              <RollingCorrelationChart data={data} />
              <CointegrationAnalysis data={data} />

              <div className="mb-8 pb-8 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
                  {t('crossChain.stabilityAnalysis')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 text-xs font-medium text-gray-500">
                          {t('crossChain.blockchain')}
                        </th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500">数据完整性</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500">价格波动率</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500">价格跳动频率</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500 text-right">
                          {t('crossChain.stabilityRating')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChains.map((chain) => {
                        const volatility = chainVolatility[chain] ?? 0;
                        const delay = updateDelays[chain];
                        const stabilityRating = getStabilityRating(volatility);
                        const freshness = getDataFreshness(delay);
                        const integrity = dataIntegrity[chain] ?? 0;
                        const jumpCount = priceJumpFrequency[chain] ?? 0;
                        return (
                          <tr key={chain} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 mr-2"
                                  style={{ backgroundColor: chainColors[chain] }}
                                />
                                <span className="text-sm font-medium">{chainNames[chain]}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <ProgressBar value={integrity} color={getIntegrityColor(integrity)} />
                            </td>
                            <td className="py-3 px-4">
                              <ProgressBar
                                value={volatility}
                                color={getVolatilityColor(volatility)}
                                max={1}
                                suffix="%"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <JumpIndicator count={jumpCount} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`text-sm font-medium ${stabilityRating === 'stable' ? 'text-green-600' : stabilityRating === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`}
                              >
                                {volatility > 0 ? t(`crossChain.stability.${stabilityRating}`) : '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <InteractivePriceChart
                chartData={chartData}
                chartDataWithMA={chartDataWithMA}
                filteredChains={filteredChains}
                hiddenLines={hiddenLines}
                scatterData={scatterData}
                avgPrice={avgPrice}
                medianPrice={medianPrice}
                onLegendClick={handleLegendClick}
                onLegendDoubleClick={handleLegendDoubleClick}
              />
            </>
          ) : (
            <VolatilitySurface data={data} />
          )}
        </>
      )}
    </div>
  );
}
