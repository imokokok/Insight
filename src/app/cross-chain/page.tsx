'use client';

import { useI18n } from '@/lib/i18n/context';
import { useCrossChainData } from './useCrossChainData';
import { CrossChainFilters } from './components/CrossChainFilters';
import { PriceSpreadHeatmap } from './components/PriceSpreadHeatmap';
import { PriceComparisonTable } from './components/PriceComparisonTable';
import { CorrelationMatrix } from './components/CorrelationMatrix';
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
import { Blockchain } from '@/lib/types/oracle';
import {
  chainNames,
  chainColors,
  getDiffTextColor,
  getIntegrityColor,
  getJumpColor,
  getVolatilityColor,
  getDataFreshness,
  getConsistencyRating,
  getStabilityRating,
  calculateChangePercent,
  formatPrice,
} from './utils';
import { ChainStats, RefreshInterval } from './constants';

export default function CrossChainPage() {
  const { t } = useI18n();
  const data = useCrossChainData();

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

  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey;
    if (typeof dataKey === 'string') {
      const newSet = new Set(hiddenLines);
      if (newSet.has(dataKey)) newSet.delete(dataKey);
      else newSet.add(dataKey);
      setHiddenLines(newSet);
    }
  };

  const handleLegendDoubleClick = (chain: any) => {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const priceData = payload.filter(
      (p: any) => !p.dataKey?.includes('_MA') && filteredChains.includes(p.dataKey)
    );
    return (
      <div className="bg-white border border-gray-200 shadow-lg p-4 min-w-[280px]">
        <p className="text-gray-600 text-xs mb-3 font-medium border-b border-gray-100 pb-2">
          {label}
        </p>
        {priceData.map((entry: any, index: number) => (
          <div key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-medium text-gray-900">{chainNames[entry.dataKey as Blockchain]}</span>
            </div>
            <div className="text-sm text-gray-700 pl-5 font-mono">
              ${Number(entry.value).toFixed(4)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossChain.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0 mb-8 pb-8 border-b border-gray-200">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className={`px-4 py-3 ${index > 0 ? 'border-l border-gray-200' : ''}`}
                title={stat.tooltip}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500 uppercase">{stat.label}</div>
                  {stat.trend !== null && stat.trend !== undefined && (
                    <TrendIndicator changePercent={stat.trend} />
                  )}
                </div>
                <div className="text-lg font-semibold text-gray-900 mt-1">{stat.value}</div>
                {stat.subValue && (
                  <div className="text-xs text-gray-400 mt-0.5">{stat.subValue}</div>
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
                  {boxPlotData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={boxPlotData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(0)}`} />
                        <YAxis type="category" dataKey="chainName" width={80} />
                        <Tooltip
                          formatter={(v) => (typeof v === 'number' ? `$${v.toFixed(4)}` : v)}
                        />
                        {boxPlotData.map((d, i) => (
                          <Scatter
                            key={i}
                            data={[d]}
                            fill={d.color}
                            shape={(props: any) => {
                              const { cx, cy } = props;
                              const boxHeight = 30;
                              const y = cy;
                              return (
                                <g>
                                  <line
                                    x1={cx - 50}
                                    y1={y}
                                    x2={cx + 50}
                                    y2={y}
                                    stroke={d.color}
                                    strokeDasharray="2 2"
                                  />
                                  <rect
                                    x={cx - 30}
                                    y={y - 15}
                                    width={60}
                                    height={30}
                                    fill={d.color}
                                    fillOpacity={0.3}
                                    stroke={d.color}
                                    strokeWidth={2}
                                  />
                                </g>
                              );
                            }}
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      数据不足
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <PriceComparisonTable data={data} />
          <CorrelationMatrix data={data} />

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

          <div>
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('crossChain.priceChart')}
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartDataWithMA}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} />
                  <Brush dataKey="time" height={30} />
                  {filteredChains.map((chain) => (
                    <Line
                      key={chain}
                      type="monotone"
                      dataKey={chain}
                      name={chainNames[chain]}
                      stroke={chainColors[chain]}
                      strokeWidth={2}
                      dot={false}
                      hide={hiddenLines.has(chain)}
                    />
                  ))}
                  {scatterData.length > 0 && (
                    <Scatter
                      data={scatterData}
                      fill="#F97316"
                      name={t('crossChain.anomalyPoint')}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
