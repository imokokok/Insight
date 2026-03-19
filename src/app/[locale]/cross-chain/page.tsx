'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCrossChainData } from './useCrossChainData';
import { CrossChainFilters } from './components/CrossChainFilters';
import { PriceSpreadHeatmap, HeatmapDetailView } from './components/PriceSpreadHeatmap';
import { PriceComparisonTable } from './components/PriceComparisonTable';
import { CorrelationMatrix } from './components/CorrelationMatrix';
import { RollingCorrelationChart } from './components/RollingCorrelationChart';
import { CointegrationAnalysis } from './components/CointegrationAnalysis';
import { StandardBoxPlot } from './components/StandardBoxPlot';
import { InteractivePriceChart } from './components/InteractivePriceChart';
import { VolatilitySurface } from './components/VolatilitySurface';
import { ProgressBar as CrossChainProgressBar, JumpIndicator } from './components/SmallComponents';
import { CompactStatsGrid } from './components/CompactStatsGrid';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { ProgressBar as LoadingProgressBar, DataLoadingProgress } from '@/components/ui/LoadingProgress';
import { TabNavigation, TabId } from './components/TabNavigation';
import { CollapsibleSection } from './components/CollapsibleSection';
import { DataSourceSection } from './components/DataSourceSection';
import { BenchmarkComparisonSection } from './components/BenchmarkComparisonSection';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Blockchain } from '@/types/oracle';
import {
  chainNames,
  chainColors,
  getIntegrityColor,
  getVolatilityColor,
  getConsistencyRating,
  getStabilityRating,
  calculateChangePercent,
  formatPrice,
} from './utils';
import { ChainStats, RefreshInterval } from './constants';
import { useColorblindMode, useSetColorblindMode } from '@/stores/crossChainStore';
import { baseColors, semanticColors, chartColors } from '@/lib/config/colors';
import { SegmentedControl, DropdownSelect, MultiSelect } from '@/components/ui/selectors';

export default function CrossChainPage() {
  const t = useTranslations();
  const data = useCrossChainData();
  const colorblindMode = useColorblindMode();
  const setColorblindMode = useSetColorblindMode();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

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
    filteredChains,
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
    scatterData,
    chainVolatility,
    updateDelays,
    dataIntegrity,
    priceJumpFrequency,
    meanBinIndex,
    medianBinIndex,
    prevStats,
    hiddenLines,
    setHiddenLines,
    focusedChain,
    setFocusedChain,
    currentPrices,
    selectedProvider,
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
      label: t('crossChain.dataPoints'),
      value: totalDataPoints.toString(),
      trend: null,
      tooltip: t('crossChain.tooltip.dataPoints'),
    },
    {
      label: t('crossChain.iqr'),
      value: iqrValue > 0 ? `$${formatPrice(iqrValue)}` : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.iqr'),
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
          ? t(`common.consistency.${getConsistencyRating(standardDeviationPercent)}`)
          : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.consistencyRating'),
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

  // 渲染概览标签内容
  const renderOverviewTab = () => (
    <>
      <CompactStatsGrid statsData={statsData} />

      <DataSourceSection
        dataPoints={currentPrices.map(p => ({
          chain: p.chain || Blockchain.ETHEREUM,
          price: p.price,
          timestamp: p.timestamp,
          source: p.source,
          confidence: p.confidence,
          provider: selectedProvider,
        }))}
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        isLoading={loading}
      />

      {/* Benchmark Comparison Section */}
      {currentPrices.length > 0 && (
        <BenchmarkComparisonSection
          chainPrices={currentPrices.map(p => ({
            chain: p.chain || Blockchain.ETHEREUM,
            price: p.price,
            timestamp: p.timestamp,
          }))}
          loading={loading}
        />
      )}

      <div id="heatmap">
        <HeatmapDetailView data={data} />
      </div>

      <div id="table">
        <PriceComparisonTable data={data} />
      </div>

      {/* 稳定性分析表格 */}
      <div
        id="stability"
        className="mb-8 pb-8 border-b"
        style={{ borderColor: baseColors.gray[100] }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
          {t('crossChain.stabilityAnalysis')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${baseColors.gray[100]}` }}>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {t('crossChain.blockchain')}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {t('crossChain.dataIntegrity')}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {t('crossChain.priceVolatility')}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {t('crossChain.priceJumpFrequency')}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium text-right"
                  style={{ color: baseColors.gray[500] }}
                >
                  {t('crossChain.stabilityRating')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredChains.map((chain) => {
                const volatility = chainVolatility[chain] ?? 0;
                const stabilityRating = getStabilityRating(volatility);
                const integrity = dataIntegrity[chain] ?? 0;
                const jumpCount = priceJumpFrequency[chain] ?? 0;
                return (
                  <tr
                    key={chain}
                    className="hover:bg-gray-50"
                    style={{
                      borderBottom: `1px solid ${baseColors.gray[100]}`,
                      backgroundColor: 'transparent',
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 mr-2"
                          style={{ backgroundColor: chainColors[chain] }}
                        />
                        <span className="text-sm font-medium">{chainNames[chain]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <CrossChainProgressBar value={integrity} color={getIntegrityColor(integrity)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <CrossChainProgressBar
                        value={volatility}
                        color={getVolatilityColor(volatility)}
                        max={1}
                        suffix="%"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <JumpIndicator count={jumpCount} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className="text-sm font-medium"
                        style={{
                          color:
                            stabilityRating === 'stable'
                              ? semanticColors.success.main
                              : stabilityRating === 'moderate'
                                ? semanticColors.warning.main
                                : semanticColors.danger.main,
                        }}
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
    </>
  );

  // 渲染相关性标签内容
  const renderCorrelationTab = () => (
    <>
      <div id="correlation">
        <CorrelationMatrix data={data} />
      </div>
      <RollingCorrelationChart data={data} />
    </>
  );

  // 渲染高级分析标签内容
  const renderAdvancedTab = () => (
    <>
      <CollapsibleSection
        title={t('crossChain.cointegrationAnalysis')}
        description={t('crossChain.cointegrationDesc')}
        defaultExpanded={false}
        storageKey="cointegrationExpanded"
      >
        <div className="p-4">
          <CointegrationAnalysis data={data} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title={t('crossChain.volatilityAnalysis')}
        description={t('crossChain.volatilityAnalysisDesc')}
        defaultExpanded={false}
        storageKey="volatilityExpanded"
      >
        <div className="p-4">
          <VolatilitySurface data={data} />
        </div>
      </CollapsibleSection>
    </>
  );

  // 渲染图表标签内容
  const renderChartsTab = () => (
    <>
      {/* 价格分布分析 */}
      <div
        id="distribution"
        className="mb-8 pb-8 border-b"
        style={{ borderColor: baseColors.gray[100] }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
          {t('crossChain.priceDistributionAnalysis')}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-medium mb-3" style={{ color: baseColors.gray[700] }}>
              {t('crossChain.priceDistributionHistogram')}
            </h4>
            <div className="h-64 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 9, fill: chartColors.recharts.tick }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    stroke={chartColors.recharts.axis}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    width={40}
                    stroke={chartColors.recharts.axis}
                  />
                  <Tooltip formatter={(value) => [value, t('crossChain.frequency')]} />
                  {meanBinIndex >= 0 && priceDistributionData[meanBinIndex] && (
                    <ReferenceLine
                      x={priceDistributionData[meanBinIndex].range}
                      stroke={chartColors.recharts.primary}
                      strokeDasharray="5 5"
                    />
                  )}
                  {medianBinIndex >= 0 && priceDistributionData[medianBinIndex] && (
                    <ReferenceLine
                      x={priceDistributionData[medianBinIndex].range}
                      stroke={chartColors.recharts.success}
                      strokeDasharray="5 5"
                    />
                  )}
                  <Bar dataKey="count" fill={chartColors.recharts.indigo} radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="py-3">
                <div className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('crossChain.medianLine')}
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ color: semanticColors.success.main }}
                >
                  ${medianPrice.toFixed(4)}
                </div>
              </div>
              <div className="py-3">
                <div className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('crossChain.meanLine')}
                </div>
                <div className="text-lg font-semibold" style={{ color: baseColors.primary[500] }}>
                  ${avgPrice.toFixed(4)}
                </div>
              </div>
              <div className="py-3">
                <div className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('crossChain.standardDeviation')}
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ color: chartColors.recharts.purple }}
                >
                  ${standardDeviation.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium mb-3" style={{ color: baseColors.gray[700] }}>
              {t('crossChain.chainPriceBoxPlot')}
            </h4>
            <div className="h-64 py-4">
              <StandardBoxPlot data={boxPlotData} />
            </div>
          </div>
        </div>
      </div>

      <div id="chart">
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
      </div>
    </>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dune min-h-screen">
      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b"
        style={{ borderColor: baseColors.gray[200] }}
      >
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: baseColors.gray[900] }}>
            {t('crossChain.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: baseColors.gray[500] }}>
            {t('crossOracle.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
          {/* 色盲友好模式切换 */}
          <button
            onClick={() => setColorblindMode(!colorblindMode)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-none transition-colors ${
              colorblindMode ? '' : 'hover:border-gray-400'
            }`}
            style={{
              backgroundColor: colorblindMode ? semanticColors.info.light : 'transparent',
              borderColor: colorblindMode ? semanticColors.info.light : baseColors.gray[300],
              color: colorblindMode ? semanticColors.info.text : baseColors.gray[600],
            }}
            title={
              colorblindMode
                ? t('crossChain.colorblindModeOn')
                : t('crossChain.switchToColorblindMode')
            }
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
            <span>{t('crossChain.colorblindFriendly')}</span>
            {colorblindMode && (
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{ color: semanticColors.info.main }}
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <span className="text-sm" style={{ color: baseColors.gray[500] }}>
            {t('crossChain.export')}:
          </span>
          <button
            onClick={exportToCSV}
            disabled={loading || currentPrices.length === 0}
            className="px-3 py-1.5 text-sm border disabled:opacity-50"
            style={{ borderColor: baseColors.gray[300], color: baseColors.gray[700] }}
          >
            CSV
          </button>
          <button
            onClick={exportToJSON}
            disabled={loading || currentPrices.length === 0}
            className="px-3 py-1.5 text-sm border disabled:opacity-50"
            style={{ borderColor: baseColors.gray[300], color: baseColors.gray[700] }}
          >
            JSON
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 border" style={{ borderColor: baseColors.gray[200] }}>
            <span className="text-sm" style={{ color: baseColors.gray[600] }}>
              {t('crossChain.autoRefresh')}
            </span>
            <SegmentedControl
              options={refreshOptions.map((opt) => ({ value: opt.value.toString(), label: opt.label }))}
              value={refreshInterval.toString()}
              onChange={(value) => setRefreshInterval(Number(value) as RefreshInterval)}
              size="sm"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={refreshStatus === 'refreshing'}
            className="px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{
              backgroundColor:
                refreshStatus === 'error'
                  ? semanticColors.danger.main
                  : refreshStatus === 'success' && showRefreshSuccess
                    ? semanticColors.success.main
                    : baseColors.gray[900],
            }}
          >
            {refreshStatus === 'refreshing'
              ? t('status.loading')
              : showRefreshSuccess
                ? t('crossChain.refreshSuccess')
                : t('actions.refresh')}
          </button>
          {lastUpdated && (
            <span className="text-xs" style={{ color: baseColors.gray[400] }}>
              {t('time.lastUpdated')} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <CrossChainFilters data={data} />
      <PriceSpreadHeatmap data={data} />

      {/* 标签页导航 */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {loading ? (
        <div className="py-16 flex flex-col justify-center items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent animate-spin"
            style={{ borderColor: baseColors.gray[400] }}
          />
          <div className="text-sm" style={{ color: baseColors.gray[500] }}>
            {t('crossChain.loadingData')}
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'correlation' && renderCorrelationTab()}
          {activeTab === 'advanced' && renderAdvancedTab()}
          {activeTab === 'charts' && renderChartsTab()}
        </>
      )}
    </div>
  );
}
