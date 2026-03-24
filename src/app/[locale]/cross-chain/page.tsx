'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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
import {
  ProgressBar as LoadingProgressBar,
  DataLoadingProgress,
} from '@/components/ui/LoadingProgress';
import { TabNavigation, TabId } from './components/TabNavigation';
import { CollapsibleSection } from './components/CollapsibleSection';
import { DataSourceSection } from './components/DataSourceSection';
import { BenchmarkComparisonSection } from './components/BenchmarkComparisonSection';
import { LiveStatusBar } from '@/components/ui/LiveStatusBar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
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
import { FavoriteButton } from '@/components/favorites';
import type { FavoriteConfig } from '@/hooks/useFavorites';
import { Network, Download, RefreshCw, Eye } from 'lucide-react';

export default function CrossChainPage() {
  const t = useTranslations();
  const router = useRouter();
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
    selectedSymbol,
    visibleChains,
    user,
    chainFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
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
          ? t(`consistency.${getConsistencyRating(standardDeviationPercent)}`)
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
        dataPoints={currentPrices.map((p) => ({
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
          chainPrices={currentPrices.map((p) => ({
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
                      <CrossChainProgressBar
                        value={integrity}
                        color={getIntegrityColor(integrity)}
                      />
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
                  <RechartsTooltip formatter={(value) => [value, t('crossChain.frequency')]} />
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
    <div className="min-h-screen bg-insight">
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('crossChain.title')}
              </h1>
              <p className="text-sm mt-1 text-gray-500">
                {t('crossOracle.subtitle')}
              </p>
            </div>

            {/* Header Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Favorites */}
              {user && (
                <FavoriteButton
                  configType="chain_config"
                  configData={currentFavoriteConfig}
                  name={`${selectedSymbol} - ${selectedProvider} (${visibleChains.length} chains)`}
                  variant="button"
                  showLabel
                />
              )}

              {/* Favorites Dropdown */}
              {user && chainFavorites && chainFavorites.length > 0 && (
                <div className="relative" ref={favoritesDropdownRef}>
                  <button
                    onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 bg-white hover:bg-gray-50 transition-colors rounded-md"
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
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {chainFavorites.length}
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
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 z-50 max-h-96 overflow-y-auto rounded-lg shadow-lg">
                      <div className="p-2 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {t('crossOracle.favorites.quickAccess')}
                        </h3>
                      </div>
                      <div className="p-1">
                        {chainFavorites.map((favorite) => {
                          const config = favorite.config_data as FavoriteConfig;
                          return (
                            <button
                              key={favorite.id}
                              onClick={() => handleApplyFavorite(config)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors rounded"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {favorite.name}
                                </span>
                                <span className="text-xs text-gray-500">{config.symbol}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {config.chains?.slice(0, 3).map((chain) => (
                                  <span
                                    key={chain}
                                    className="px-1.5 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-100 rounded"
                                  >
                                    {chain}
                                  </span>
                                ))}
                                {(config.chains?.length || 0) > 3 && (
                                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded">
                                    +{(config.chains?.length || 0) - 3}
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

              {/* Colorblind Mode */}
              <button
                onClick={() => setColorblindMode(!colorblindMode)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
                  colorblindMode
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
                title={
                  colorblindMode
                    ? t('crossChain.colorblindModeOn')
                    : t('crossChain.switchToColorblindMode')
                }
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">{t('crossChain.colorblindFriendly')}</span>
                {colorblindMode && (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              {/* Export Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={exportToCSV}
                  disabled={loading || currentPrices.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={exportToJSON}
                  disabled={loading || currentPrices.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={refreshStatus === 'refreshing'}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white disabled:opacity-50 rounded-md transition-colors"
                style={{
                  backgroundColor:
                    refreshStatus === 'error'
                      ? semanticColors.danger.main
                      : refreshStatus === 'success' && showRefreshSuccess
                        ? semanticColors.success.main
                        : baseColors.gray[900],
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshStatus === 'refreshing' ? 'animate-spin' : ''}`} />
                {refreshStatus === 'refreshing'
                  ? t('status.loading')
                  : showRefreshSuccess
                    ? t('crossChain.refreshSuccess')
                    : t('actions.refresh')}
              </button>
            </div>
          </div>

          {/* Live Status Bar */}
          <LiveStatusBar
            isConnected={!loading}
            lastUpdate={lastUpdated || undefined}
            isReconnecting={refreshStatus === 'refreshing'}
          />
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left Sidebar - Sticky */}
          <div className="xl:w-[400px] flex-shrink-0">
            <div className="xl:sticky xl:top-6 space-y-6">
              {/* Filters */}
              <CrossChainFilters data={data} />

              {/* Price Spread Heatmap */}
              <PriceSpreadHeatmap data={data} />

              {/* Auto Refresh Setting */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('crossChain.autoRefresh')}</span>
                  <SegmentedControl
                    options={refreshOptions.map((opt) => ({
                      value: opt.value.toString(),
                      label: opt.label,
                    }))}
                    value={refreshInterval.toString()}
                    onChange={(value) => setRefreshInterval(Number(value) as RefreshInterval)}
                    size="sm"
                  />
                </div>
              </div>

              {/* Last Updated */}
              {lastUpdated && (
                <div className="text-xs text-gray-400 text-center">
                  {t('time.lastUpdated')} {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tab Navigation */}
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
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
              <div className="mt-6">
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'correlation' && renderCorrelationTab()}
                {activeTab === 'advanced' && renderAdvancedTab()}
                {activeTab === 'charts' && renderChartsTab()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
