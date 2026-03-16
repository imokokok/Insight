'use client';

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { useMarketOverviewData } from './useMarketOverviewData';
import { ChartType, ViewType, TIME_RANGES } from './types';
import { RefreshInterval } from './constants';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatCompactNumber } from '@/lib/utils/format';
import { ResponsiveContainer } from 'recharts';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  Activity,
  DollarSign,
  Layers,
  Globe,
  Info,
  RefreshCw,
  Clock,
  Shield,
  Zap,
  Network,
  Building2,
  PieChart as PieChartIcon2,
  GitCompare,
  Target,
  ActivitySquare,
  Link2,
  X,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import ChartRenderer from './components/ChartRenderer';
import ExportSection from './components/ExportSection';
import RefreshControl from './components/RefreshControl';
import RealtimeIndicator from './components/RealtimeIndicator';

export default function MarketOverviewPage() {
  const { t, locale } = useI18n();
  const data = useMarketOverviewData();

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const chartTypes = [
    { key: 'pie', label: locale === 'zh-CN' ? '市场份额' : 'Market Share', icon: PieChartIcon },
    { key: 'trend', label: locale === 'zh-CN' ? 'TVS趋势' : 'TVS Trend', icon: TrendingUp },
    { key: 'bar', label: locale === 'zh-CN' ? '链支持' : 'Chain Support', icon: BarChart3 },
    { key: 'chain', label: locale === 'zh-CN' ? '链分布' : 'Chain Breakdown', icon: Network },
    { key: 'protocol', label: locale === 'zh-CN' ? '协议' : 'Protocols', icon: Building2 },
    {
      key: 'asset',
      label: locale === 'zh-CN' ? '资产类别' : 'Asset Categories',
      icon: PieChartIcon2,
    },
    {
      key: 'comparison',
      label: locale === 'zh-CN' ? '多预言机对比' : 'Oracle Comparison',
      icon: GitCompare,
    },
    { key: 'benchmark', label: locale === 'zh-CN' ? '行业基准' : 'Benchmark', icon: Target },
    {
      key: 'correlation',
      label: locale === 'zh-CN' ? '相关性' : 'Correlation',
      icon: ActivitySquare,
    },
  ];

  const [zoomRange, setZoomRange] = useState<{ startIndex?: number; endIndex?: number } | null>(
    null
  );

  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.1);
  const [selectedAnomaly, setSelectedAnomaly] = useState<{
    dataKey: string;
    date: string;
    value: number;
    prevValue: number;
    changeRate: number;
  } | null>(null);

  const [linkedOracle, setLinkedOracle] = useState<{ primary: string; secondary: string } | null>(
    null
  );

  const [comparisonMode, setComparisonMode] = useState<'none' | 'yoy' | 'mom'>('none');
  const [trendComparisonData, setTrendComparisonData] = useState<any[]>([]);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(false);

  const {
    oracleData,
    assets,
    trendData,
    marketStats,
    chainBreakdown,
    protocolDetails,
    assetCategories,
    comparisonData,
    benchmarkData,
    correlationData,
    loading,
    loadingEnhanced,
    loadingComparison,
    lastUpdated,
    selectedTimeRange,
    setSelectedTimeRange,
    activeChart,
    setActiveChart,
    viewType,
    setViewType,
    hoveredItem,
    setHoveredItem,
    selectedItem,
    setSelectedItem,
    refreshInterval,
    setRefreshInterval,
    refreshStatus,
    showRefreshSuccess,
    fetchData,
    exportToCSV,
    exportToJSON,
    sortedOracleData,
    totalTVS,
    totalChains,
    totalProtocols,
    wsStatus,
    wsLastUpdated,
    wsReconnect,
    wsMessageCount,
    wsConnectedChannels,
  } = data;

  const getChartTitle = () => {
    switch (activeChart) {
      case 'pie':
        return locale === 'zh-CN' ? '市场份额分布' : 'Market Share Distribution';
      case 'trend':
        return locale === 'zh-CN' ? 'TVS 趋势分析' : 'TVS Trend Analysis';
      case 'bar':
        return locale === 'zh-CN' ? '链支持情况' : 'Chain Support Overview';
      case 'chain':
        return locale === 'zh-CN' ? '链级别 TVS 分布' : 'Chain TVS Breakdown';
      case 'protocol':
        return locale === 'zh-CN' ? '协议列表' : 'Protocol List';
      case 'asset':
        return locale === 'zh-CN' ? '资产类别分析' : 'Asset Category Analysis';
      case 'comparison':
        return locale === 'zh-CN' ? '多预言机对比分析' : 'Multi-Oracle Comparison';
      case 'benchmark':
        return locale === 'zh-CN' ? '行业基准对比' : 'Industry Benchmark Comparison';
      case 'correlation':
        return locale === 'zh-CN' ? 'TVS 相关性分析' : 'TVS Correlation Analysis';
      default:
        return '';
    }
  };

  const toggleComparisonMode = (mode: 'yoy' | 'mom') => {
    if (comparisonMode === mode) {
      setComparisonMode('none');
      setTrendComparisonData([]);
    } else {
      setComparisonMode(mode);
      const variance = mode === 'yoy' ? 0.15 : 0.08;
      const newComparisonData = trendData.map((item: any) => ({
        ...item,
        chainlink: item.chainlink * (1 + (Math.random() - 0.5) * variance),
        pyth: item.pyth * (1 + (Math.random() - 0.5) * variance),
        band: item.band * (1 + (Math.random() - 0.5) * variance),
        api3: item.api3 * (1 + (Math.random() - 0.5) * variance),
        uma: item.uma * (1 + (Math.random() - 0.5) * variance),
      }));
      setTrendComparisonData(newComparisonData);
    }
  };

  const prepareComparisonData = (currentData: any[], compareData: any[]) => {
    return currentData.map((item, index) => {
      const compareItem = compareData[index];
      const result: any = { ...item };

      ['chainlink', 'pyth', 'band', 'api3', 'uma'].forEach((key) => {
        const currentValue = item[key] as number;
        const compareValue = compareItem?.[key] as number;
        result[`${key}Compare`] = compareValue || 0;
        result[`${key}Diff`] = currentValue - (compareValue || 0);
        result[`${key}DiffPercent`] = compareValue
          ? ((currentValue - compareValue) / compareValue) * 100
          : 0;
      });

      return result;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 border border-blue-200">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {locale === 'zh-CN' ? '市场概览' : 'Market Overview'}
              </h1>
            </div>
            <p className="text-gray-600 ml-14">
              {locale === 'zh-CN'
                ? '全面分析预言机市场份额、TVS趋势和链支持情况'
                : 'Comprehensive analysis of oracle market share, TVS trends and chain support'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <ExportSection
              loading={loading}
              chartContainerRef={chartContainerRef}
              activeChart={activeChart}
              getChartTitle={getChartTitle}
              exportToCSV={exportToCSV}
              exportToJSON={exportToJSON}
            />

            <RefreshControl
              lastUpdated={lastUpdated ?? undefined}
              isRefreshing={refreshStatus === 'refreshing'}
              onRefresh={fetchData}
              autoRefreshInterval={refreshInterval}
              onAutoRefreshChange={(interval) => setRefreshInterval(interval as RefreshInterval)}
            />

            <RealtimeIndicator
              isConnected={wsStatus === 'connected'}
              onReconnect={wsReconnect}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 mb-8 border border-gray-200 bg-white">
          <div className="py-4 border-b border-gray-100 md:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span
                className={`text-xs font-medium ${
                  marketStats.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {marketStats.change24h >= 0 ? '+' : ''}
                {marketStats.change24h.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-0.5">
              {locale === 'zh-CN' ? '总 TVS' : 'Total TVS'}
            </p>
            <p className="text-lg font-bold text-gray-900">{totalTVS}</p>
          </div>

          <div className="py-4 border-b border-gray-100 md:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <Globe className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">
              {locale === 'zh-CN' ? '支持链数' : 'Chains'}
            </p>
            <p className="text-lg font-bold text-gray-900">{totalChains}</p>
          </div>

          <div className="py-4 border-b border-gray-100 md:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <Layers className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">
              {locale === 'zh-CN' ? '协议数量' : 'Protocols'}
            </p>
            <p className="text-lg font-bold text-gray-900">{totalProtocols}+</p>
          </div>

          <div className="py-4 border-b border-gray-100 md:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4 h-4 text-pink-600" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">
              {locale === 'zh-CN' ? '市场主导' : 'Dominance'}
            </p>
            <p className="text-lg font-bold text-gray-900">{marketStats.marketDominance}%</p>
          </div>

          <div className="py-4 border-b border-gray-100 md:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">
              {locale === 'zh-CN' ? '平均延迟' : 'Latency'}
            </p>
            <p className="text-lg font-bold text-gray-900">{marketStats.avgUpdateLatency}ms</p>
          </div>

          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">
              {locale === 'zh-CN' ? '预言机数' : 'Oracles'}
            </p>
            <p className="text-lg font-bold text-gray-900">{marketStats.oracleCount}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="py-4 border-b border-gray-100">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <select
                    value={activeChart}
                    onChange={(e) => setActiveChart(e.target.value as ChartType)}
                    className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer font-medium min-w-[140px]"
                  >
                    {chartTypes.map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200">
                  {['pie', 'trend', 'bar', 'chain'].map((key) => {
                    const type = chartTypes.find((t) => t.key === key);
                    if (!type) return null;
                    const Icon = type.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveChart(key as ChartType)}
                        className={`flex items-center gap-1 px-2 py-1.5 text-sm font-medium transition-all ${
                          activeChart === key
                            ? 'bg-white text-blue-600 border border-gray-200'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title={type.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {locale === 'zh-CN' ? '时间' : 'Time'}
                  </span>
                  <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.key}
                        onClick={() => setSelectedTimeRange(range.key)}
                        className={`px-2.5 py-1 text-sm font-medium transition-all ${
                          selectedTimeRange === range.key
                            ? 'bg-white text-blue-600 border border-gray-200'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeChart === 'trend' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {locale === 'zh-CN' ? '对比' : 'Compare'}
                      </span>
                      <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200">
                        <button
                          onClick={() => toggleComparisonMode('yoy')}
                          className={`px-2.5 py-1 text-sm font-medium transition-all ${
                            comparisonMode === 'yoy'
                              ? 'bg-white text-blue-600 border border-gray-200'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title={locale === 'zh-CN' ? '同比对比' : 'Year-over-Year'}
                        >
                          {locale === 'zh-CN' ? '同比' : 'YoY'}
                        </button>
                        <button
                          onClick={() => toggleComparisonMode('mom')}
                          className={`px-2.5 py-1 text-sm font-medium transition-all ${
                            comparisonMode === 'mom'
                              ? 'bg-white text-blue-600 border border-gray-200'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title={locale === 'zh-CN' ? '环比对比' : 'Month-over-Month'}
                        >
                          {locale === 'zh-CN' ? '环比' : 'MoM'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={anomalyThreshold * 100}
                        onChange={(e) => setAnomalyThreshold(Number(e.target.value) / 100)}
                        className="w-14 h-1 bg-red-200 appearance-none cursor-pointer accent-red-500"
                      />
                      <span className="text-xs font-medium text-red-600 min-w-[2rem]">
                        {(anomalyThreshold * 100).toFixed(0)}%
                      </span>
                    </div>

                    {comparisonMode === 'none' && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-200">
                        <span className="text-xs font-medium text-purple-700">
                          {locale === 'zh-CN' ? '置信区间' : 'CI'}
                        </span>
                        <button
                          onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
                          className={`relative inline-flex h-4 w-7 items-center transition-colors ${
                            showConfidenceInterval ? 'bg-purple-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-2.5 w-2.5 transform bg-white transition-transform ${
                              showConfidenceInterval ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        {showConfidenceInterval && (
                          <span className="text-xs text-purple-600 font-medium">95%</span>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="w-px h-6 bg-gray-200 hidden lg:block" />

                <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200">
                  <button
                    onClick={() => setViewType('chart')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium transition-all ${
                      viewType === 'chart'
                        ? 'bg-white text-blue-600 border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <PieChartIcon className="w-4 h-4" />
                    {locale === 'zh-CN' ? '图表' : 'Chart'}
                  </button>
                  <button
                    onClick={() => setViewType('table')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium transition-all ${
                      viewType === 'table'
                        ? 'bg-white text-blue-600 border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <TableIcon className="w-4 h-4" />
                    {locale === 'zh-CN' ? '表格' : 'Table'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div ref={chartContainerRef} className="lg:col-span-2 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">{getChartTitle()}</h3>
                  {linkedOracle && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-purple-50 border border-purple-200">
                      <Link2 className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs text-purple-700">
                        {linkedOracle.primary} ↔ {linkedOracle.secondary}
                      </span>
                      <button
                        onClick={() => setLinkedOracle(null)}
                        className="ml-1 p-0.5 hover:bg-purple-200 transition-colors"
                        title={locale === 'zh-CN' ? '清除联动' : 'Clear Link'}
                      >
                        <X className="w-3 h-3 text-purple-600" />
                      </button>
                    </div>
                  )}
                  {activeChart === 'trend' &&
                    comparisonMode !== 'none' &&
                    trendComparisonData.length > 0 && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200">
                        <span className="text-xs text-blue-700">
                          {comparisonMode === 'yoy'
                            ? locale === 'zh-CN'
                              ? '同比'
                              : 'YoY'
                            : locale === 'zh-CN'
                              ? '环比'
                              : 'MoM'}
                        </span>
                        {(() => {
                          const latestData = prepareComparisonData(trendData, trendComparisonData)[
                            trendData.length - 1
                          ];
                          const oracleKeys = ['chainlink', 'pyth', 'band', 'api3', 'uma'];
                          const avgDiff =
                            oracleKeys.reduce((sum, key) => {
                              return sum + (latestData[`${key}DiffPercent`] || 0);
                            }, 0) / oracleKeys.length;
                          return (
                            <span
                              className={`text-sm font-bold ${avgDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {avgDiff >= 0 ? '+' : ''}
                              {avgDiff.toFixed(2)}%
                            </span>
                          );
                        })()}
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  {activeChart === 'trend' && zoomRange && (
                    <button
                      onClick={() => setZoomRange(null)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 hover:bg-blue-50 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {locale === 'zh-CN' ? '重置' : 'Reset'}
                    </button>
                  )}
                  {selectedItem && (
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 hover:bg-gray-100 transition-colors"
                    >
                      {locale === 'zh-CN' ? '清除' : 'Clear'}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {loading && !['chain', 'protocol', 'asset'].includes(activeChart) ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 animate-spin" />
                    <span className="text-gray-500 text-sm">
                      {locale === 'zh-CN' ? '加载中...' : 'Loading...'}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`${viewType === 'table' && !['chain', 'protocol', 'asset'].includes(activeChart) ? 'h-[360px]' : 'h-[400px]'}`}
                  >
                    {['chain', 'protocol', 'asset'].includes(activeChart) ? (
                      <ChartRenderer
                        activeChart={activeChart}
                        viewType={viewType}
                        sortedOracleData={sortedOracleData}
                        trendData={trendData}
                        chainBreakdown={chainBreakdown}
                        protocolDetails={protocolDetails}
                        assetCategories={assetCategories}
                        comparisonData={comparisonData}
                        benchmarkData={benchmarkData}
                        correlationData={correlationData}
                        loading={loading}
                        loadingEnhanced={loadingEnhanced}
                        loadingComparison={loadingComparison}
                        locale={locale}
                        hoveredItem={hoveredItem}
                        setHoveredItem={setHoveredItem}
                        selectedItem={selectedItem}
                        setSelectedItem={setSelectedItem}
                        linkedOracle={linkedOracle}
                        setLinkedOracle={setLinkedOracle}
                        zoomRange={zoomRange}
                        setZoomRange={setZoomRange}
                        anomalyThreshold={anomalyThreshold}
                        selectedAnomaly={selectedAnomaly}
                        setSelectedAnomaly={setSelectedAnomaly}
                        comparisonMode={comparisonMode}
                        trendComparisonData={trendComparisonData}
                        showConfidenceInterval={showConfidenceInterval}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ChartRenderer
                          activeChart={activeChart}
                          viewType={viewType}
                          sortedOracleData={sortedOracleData}
                          trendData={trendData}
                          chainBreakdown={chainBreakdown}
                          protocolDetails={protocolDetails}
                          assetCategories={assetCategories}
                          comparisonData={comparisonData}
                          benchmarkData={benchmarkData}
                          correlationData={correlationData}
                          loading={loading}
                          loadingEnhanced={loadingEnhanced}
                          loadingComparison={loadingComparison}
                          locale={locale}
                          hoveredItem={hoveredItem}
                          setHoveredItem={setHoveredItem}
                          selectedItem={selectedItem}
                          setSelectedItem={setSelectedItem}
                          linkedOracle={linkedOracle}
                          setLinkedOracle={setLinkedOracle}
                          zoomRange={zoomRange}
                          setZoomRange={setZoomRange}
                          anomalyThreshold={anomalyThreshold}
                          selectedAnomaly={selectedAnomaly}
                          setSelectedAnomaly={setSelectedAnomaly}
                          comparisonMode={comparisonMode}
                          trendComparisonData={trendComparisonData}
                          showConfidenceInterval={showConfidenceInterval}
                        />
                      </ResponsiveContainer>
                    )}
                  </div>
                  {viewType === 'chart' &&
                    !['chain', 'protocol', 'asset'].includes(activeChart) && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <Info className="w-4 h-4" />
                        {locale === 'zh-CN'
                          ? '悬停查看详情，点击选中项目'
                          : 'Hover for details, click to select'}
                      </div>
                    )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      {locale === 'zh-CN' ? '选中时间范围' : 'Time Range'}
                    </p>
                    <p className="text-xl font-bold text-gray-900">{selectedTimeRange}</p>
                  </div>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {lastUpdated
                    ? `${locale === 'zh-CN' ? '更新于' : 'Updated'} ${lastUpdated.toLocaleTimeString()}`
                    : locale === 'zh-CN'
                      ? '数据已更新'
                      : 'Data updated'}
                </div>
              </div>

              <div className="overflow-hidden">
                <div className="py-2 border-b border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {locale === 'zh-CN' ? '预言机市场份额' : 'Oracle Market Share'}
                  </h4>
                </div>
                <div className="py-2 space-y-1 max-h-[280px] overflow-y-auto">
                  {sortedOracleData.map((item) => (
                    <Link
                      key={item.name}
                      href={`/${item.name.toLowerCase().replace(' ', '-')}`}
                      className={`block py-2 border-b border-gray-50 transition-all cursor-pointer hover:bg-gray-50 last:border-b-0 ${
                        selectedItem === item.name ? 'bg-blue-50/30' : ''
                      } ${hoveredItem && hoveredItem !== item.name ? 'opacity-50' : 'opacity-100'}`}
                      onMouseEnter={() => setHoveredItem(item.name)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={(e) => {
                        e.preventDefault();
                        if (selectedItem === item.name) {
                          setSelectedItem(null);
                        } else {
                          setSelectedItem(item.name);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-gray-900">{item.share}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-gray-100 overflow-hidden mb-1">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            backgroundColor: item.color,
                            width: `${item.share}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          TVS: <span className="text-gray-700">{item.tvs}</span>
                        </span>
                        <span>
                          {locale === 'zh-CN' ? '链' : 'Chains'}:{' '}
                          <span className="text-gray-700">{item.chains}</span>
                        </span>
                        <span className={item.change24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.change24h >= 0 ? '+' : ''}
                          {item.change24h.toFixed(1)}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="py-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      {locale === 'zh-CN' ? '总市场份额' : 'Total Market Share'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">100%</p>
                  </div>
                  <PieChartIcon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {locale === 'zh-CN'
                    ? `覆盖 ${marketStats.oracleCount} 个主要预言机`
                    : `Covering ${marketStats.oracleCount} major oracles`}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {locale === 'zh-CN' ? '热门资产' : 'Top Assets'}
                </h3>
              </div>
              <span className="text-xs text-gray-400">
                {assets.length} {locale === 'zh-CN' ? '个资产' : 'assets'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '资产' : 'Asset'}
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '价格' : 'Price'}
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '24h变化' : '24h Change'}
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '7d变化' : '7d Change'}
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '24h成交量' : '24h Volume'}
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '主要预言机' : 'Primary Oracle'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assets.map((asset, index) => (
                    <tr key={asset.symbol} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-400">
                            {index + 1}
                          </span>
                          <div>
                            <span className="font-medium text-gray-900 block text-sm">
                              {asset.symbol}
                            </span>
                            <span className="text-xs text-gray-400">
                              ${formatCompactNumber(asset.marketCap)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-medium text-gray-900">
                          {formatPrice(asset.price)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={`text-xs font-medium ${
                            asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {asset.change24h >= 0 ? '+' : ''}
                          {asset.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={`text-xs font-medium ${
                            asset.change7d >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {asset.change7d >= 0 ? '+' : ''}
                          {asset.change7d.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-gray-500 text-xs">
                          ${formatCompactNumber(asset.volume24h)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium text-blue-600">
                          {asset.primaryOracle}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedAnomaly && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnomaly(null)}
        >
          <div
            className="bg-white border border-gray-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {locale === 'zh-CN' ? '数据异常检测' : 'Anomaly Detected'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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

            <div className="space-y-4">
              <div className="bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-600 mb-1">
                  {locale === 'zh-CN' ? '检测到异常波动' : 'Abnormal fluctuation detected'}
                </p>
                <p className="text-2xl font-bold text-red-700">
                  {(selectedAnomaly.changeRate * 100).toFixed(2)}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">
                    {locale === 'zh-CN' ? '预言机' : 'Oracle'}
                  </p>
                  <p className="font-medium text-gray-900">{selectedAnomaly.dataKey}</p>
                </div>
                <div className="bg-gray-50 p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">
                    {locale === 'zh-CN' ? '日期' : 'Date'}
                  </p>
                  <p className="font-medium text-gray-900">{selectedAnomaly.date}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    {locale === 'zh-CN' ? '当前值' : 'Current Value'}
                  </span>
                  <span className="font-medium text-gray-900">
                    ${selectedAnomaly.value.toFixed(2)}B
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    {locale === 'zh-CN' ? '上一期值' : 'Previous Value'}
                  </span>
                  <span className="font-medium text-gray-900">
                    ${selectedAnomaly.prevValue.toFixed(2)}B
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">
                    {locale === 'zh-CN' ? '变化量' : 'Change'}
                  </span>
                  <span
                    className={`font-medium ${
                      selectedAnomaly.value > selectedAnomaly.prevValue
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {selectedAnomaly.value > selectedAnomaly.prevValue ? '+' : ''}
                    {(selectedAnomaly.value - selectedAnomaly.prevValue).toFixed(2)}B
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 p-3 border border-amber-200">
                <p className="text-xs text-amber-700">
                  {locale === 'zh-CN'
                    ? '该数据点的变化率超过了设定的阈值，可能存在异常波动。建议进一步调查原因。'
                    : 'This data point exceeds the configured threshold. Further investigation is recommended.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                {locale === 'zh-CN' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
