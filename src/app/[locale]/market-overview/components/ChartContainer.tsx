'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { ResponsiveContainer } from 'recharts';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  Network,
  Building2,
  PieChart as PieChartIcon2,
  GitCompare,
  Target,
  ActivitySquare,
  Table as TableIcon,
  Info,
  RefreshCw,
  Link2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { TIME_RANGES, ChartType, ViewType, TVSTrendData } from '../types';
import ChartRenderer from './ChartRenderer';

interface ChartContainerProps {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  activeChart: ChartType;
  setActiveChart: (chart: ChartType) => void;
  viewType: ViewType;
  setViewType: (view: ViewType) => void;
  selectedTimeRange: string;
  setSelectedTimeRange: (range: string) => void;
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
  hoveredItem: string | null;
  setHoveredItem: (item: string | null) => void;
  linkedOracle: { primary: string; secondary: string } | null;
  setLinkedOracle: (link: { primary: string; secondary: string } | null) => void;
  zoomRange: { startIndex?: number; endIndex?: number } | null;
  setZoomRange: (range: { startIndex?: number; endIndex?: number } | null) => void;
  anomalyThreshold: number;
  setAnomalyThreshold: (threshold: number) => void;
  selectedAnomaly: {
    dataKey: string;
    date: string;
    value: number;
    prevValue: number;
    changeRate: number;
  } | null;
  setSelectedAnomaly: (
    anomaly: {
      dataKey: string;
      date: string;
      value: number;
      prevValue: number;
      changeRate: number;
    } | null
  ) => void;
  comparisonMode: 'none' | 'yoy' | 'mom';
  setComparisonMode: (mode: 'none' | 'yoy' | 'mom') => void;
  trendComparisonData: TVSTrendData[];
  setTrendComparisonData: (data: TVSTrendData[]) => void;
  showConfidenceInterval: boolean;
  setShowConfidenceInterval: (show: boolean) => void;
  getChartTitle: () => string;
  loading: boolean;
  loadingEnhanced: boolean;
  loadingComparison: boolean;
  // Data from useMarketOverviewData
  sortedOracleData: any[];
  trendData: TVSTrendData[];
  chainBreakdown: any[];
  protocolDetails: any[];
  assetCategories: any[];
  comparisonData: any[];
  benchmarkData: any[];
  correlationData: any;
}

const chartTypes = [
  { key: 'pie', label: 'Market Share', labelZh: '市场份额', icon: PieChartIcon },
  { key: 'trend', label: 'TVS Trend', labelZh: 'TVS趋势', icon: TrendingUp },
  { key: 'bar', label: 'Chain Support', labelZh: '链支持', icon: BarChart3 },
  { key: 'chain', label: 'Chain Breakdown', labelZh: '链分布', icon: Network },
  { key: 'protocol', label: 'Protocols', labelZh: '协议', icon: Building2 },
  { key: 'asset', label: 'Asset Categories', labelZh: '资产类别', icon: PieChartIcon2 },
  { key: 'comparison', label: 'Oracle Comparison', labelZh: '多预言机对比', icon: GitCompare },
  { key: 'benchmark', label: 'Benchmark', labelZh: '行业基准', icon: Target },
  { key: 'correlation', label: 'Correlation', labelZh: '相关性', icon: ActivitySquare },
];

export default function ChartContainer({
  chartContainerRef,
  activeChart,
  setActiveChart,
  viewType,
  setViewType,
  selectedTimeRange,
  setSelectedTimeRange,
  selectedItem,
  setSelectedItem,
  hoveredItem,
  setHoveredItem,
  linkedOracle,
  setLinkedOracle,
  zoomRange,
  setZoomRange,
  anomalyThreshold,
  setAnomalyThreshold,
  selectedAnomaly,
  setSelectedAnomaly,
  comparisonMode,
  setComparisonMode,
  trendComparisonData,
  setTrendComparisonData,
  showConfidenceInterval,
  setShowConfidenceInterval,
  getChartTitle,
  loading,
  loadingEnhanced,
  loadingComparison,
  sortedOracleData,
  trendData,
  chainBreakdown,
  protocolDetails,
  assetCategories,
  comparisonData,
  benchmarkData,
  correlationData,
}: ChartContainerProps) {
  const locale = useLocale();

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
        redstone: item.redstone * (1 + (Math.random() - 0.5) * variance),
        dia: item.dia * (1 + (Math.random() - 0.5) * variance),
        tellor: item.tellor * (1 + (Math.random() - 0.5) * variance),
        chronicle: item.chronicle * (1 + (Math.random() - 0.5) * variance),
        winklink: item.winklink * (1 + (Math.random() - 0.5) * variance),
      }));
      setTrendComparisonData(newComparisonData);
    }
  };

  const prepareComparisonData = (currentData: any[], compareData: any[]) => {
    return currentData.map((item, index) => {
      const compareItem = compareData[index];
      const result: any = { ...item };

      [
        'chainlink',
        'pyth',
        'band',
        'api3',
        'uma',
        'redstone',
        'dia',
        'tellor',
        'chronicle',
        'winklink',
      ].forEach((key) => {
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

  const getMainChartTypes = () => [
    { key: 'pie', label: isChineseLocale(locale) ? '市场份额' : 'Market Share' },
    { key: 'trend', label: isChineseLocale(locale) ? 'TVS趋势' : 'TVS Trend' },
    { key: 'bar', label: isChineseLocale(locale) ? '链支持' : 'Chain Support' },
    { key: 'chain', label: isChineseLocale(locale) ? '链分布' : 'Chain Breakdown' },
  ];

  const getSecondaryChartTypes = () => [
    { key: 'protocol', label: isChineseLocale(locale) ? '协议' : 'Protocols' },
    { key: 'asset', label: isChineseLocale(locale) ? '资产' : 'Assets' },
  ];

  return (
    <div className="space-y-6">
      <div className="py-4 border-b border-gray-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center">
              {getMainChartTypes().map((item) => {
                const type = chartTypes.find((t) => t.key === item.key);
                if (!type) return null;
                const Icon = type.icon;
                const isActive = activeChart === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveChart(item.key as ChartType)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                      isActive
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                    title={isChineseLocale(locale) ? type.labelZh : type.label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-gray-300 hidden md:block" />

            <div className="flex items-center">
              {getSecondaryChartTypes().map((item) => {
                const type = chartTypes.find((t) => t.key === item.key);
                if (!type) return null;
                const Icon = type.icon;
                const isActive = activeChart === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveChart(item.key as ChartType)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                      isActive
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                    title={isChineseLocale(locale) ? type.labelZh : type.label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.key}
                  onClick={() => setSelectedTimeRange(range.key)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                    selectedTimeRange === range.key
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {activeChart === 'trend' && (
              <>
                <div className="h-4 w-px bg-gray-300 hidden sm:block" />

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleComparisonMode('yoy')}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                      comparisonMode === 'yoy'
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title={isChineseLocale(locale) ? '同比对比' : 'Year-over-Year'}
                  >
                    {isChineseLocale(locale) ? '同比' : 'YoY'}
                  </button>
                  <button
                    onClick={() => toggleComparisonMode('mom')}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                      comparisonMode === 'mom'
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title={isChineseLocale(locale) ? '环比对比' : 'Month-over-Month'}
                  >
                    {isChineseLocale(locale) ? '环比' : 'MoM'}
                  </button>
                </div>

                <div className="flex items-center gap-2 px-2 py-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={anomalyThreshold * 100}
                    onChange={(e) => setAnomalyThreshold(Number(e.target.value) / 100)}
                    className="w-12 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-red-500"
                  />
                  <span className="text-xs font-medium text-gray-600 min-w-[1.5rem]">
                    {(anomalyThreshold * 100).toFixed(0)}%
                  </span>
                </div>

                {comparisonMode === 'none' && (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-xs font-medium text-purple-700">
                      {isChineseLocale(locale) ? '置信区间' : 'CI'}
                    </span>
                    <button
                      onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        showConfidenceInterval ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          showConfidenceInterval ? 'translate-x-5' : 'translate-x-1'
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

            <div className="h-4 w-px bg-gray-300 hidden lg:block" />

            {!['pie', 'trend', 'bar'].includes(activeChart) && (
              <div className="flex items-center">
                <button
                  onClick={() => setViewType('chart')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                    viewType === 'chart'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <PieChartIcon className="w-4 h-4" />
                  {isChineseLocale(locale) ? '图表' : 'Chart'}
                </button>
                <button
                  onClick={() => setViewType('table')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                    viewType === 'table'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  {isChineseLocale(locale) ? '表格' : 'Table'}
                </button>
              </div>
            )}
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
                    title={isChineseLocale(locale) ? '清除联动' : 'Clear Link'}
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
                        ? isChineseLocale(locale)
                          ? '同比'
                          : 'YoY'
                        : isChineseLocale(locale)
                          ? '环比'
                          : 'MoM'}
                    </span>
                    {(() => {
                      const latestData = prepareComparisonData(trendData, trendComparisonData)[
                        trendData.length - 1
                      ];
                      const oracleKeys = [
                        'chainlink',
                        'pyth',
                        'band',
                        'api3',
                        'uma',
                        'redstone',
                        'dia',
                        'tellor',
                        'chronicle',
                        'winklink',
                      ];
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
                  {isChineseLocale(locale) ? '重置' : 'Reset'}
                </button>
              )}
              {selectedItem && (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 hover:bg-gray-100 transition-colors"
                >
                  {isChineseLocale(locale) ? '清除' : 'Clear'}
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
                  {isChineseLocale(locale) ? '加载中...' : 'Loading...'}
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
                    {isChineseLocale(locale)
                      ? '悬停查看详情，点击选中项目'
                      : 'Hover for details, click to select'}
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
