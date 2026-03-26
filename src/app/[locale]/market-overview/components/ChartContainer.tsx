'use client';

import { useState, useCallback } from 'react';

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
import { ResponsiveContainer } from 'recharts';

import { useTranslations, useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

import {
  TIME_RANGES,
  type ChartType,
  type ViewType,
  type TVSTrendData,
  type OracleMarketData,
  type ChainBreakdown,
  type ProtocolDetail,
  type AssetCategory,
  type ComparisonData,
  type BenchmarkData,
  type CorrelationData,
} from '../types';

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
  sortedOracleData: OracleMarketData[];
  trendData: TVSTrendData[];
  chainBreakdown: ChainBreakdown[];
  protocolDetails: ProtocolDetail[];
  assetCategories: AssetCategory[];
  comparisonData: ComparisonData[];
  benchmarkData: BenchmarkData[];
  correlationData: CorrelationData;
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

// 支持图表类型切换的图表
const CHARTS_WITH_TYPE_SUPPORT: ChartType[] = ['trend', 'comparison', 'benchmark'];

// 需要 ResponsiveContainer 的图表
const CHARTS_WITH_RESPONSIVE_CONTAINER: ChartType[] = [
  'pie',
  'trend',
  'bar',
  'comparison',
  'benchmark',
  'correlation',
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
  const t = useTranslations('marketOverview');
  const locale = useLocale();
  const isZh = isChineseLocale(locale);

  // 图表类型状态 (line/area/candle)
  const [chartType, setChartType] = useState<'line' | 'area' | 'candle'>('line');

  // 时间范围列表
  const timeRangeList = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'] as const;

  // 处理图表类型切换
  const handleChartTypeChange = useCallback((type: string) => {
    setChartType(type as 'line' | 'area' | 'candle');
  }, []);

  // 处理时间范围切换
  const handleTimeRangeChange = useCallback(
    (range: string) => {
      setSelectedTimeRange(range);
    },
    [setSelectedTimeRange]
  );

  // 处理重置缩放
  const handleResetZoom = useCallback(() => {
    setZoomRange(null);
  }, [setZoomRange]);

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能实现
    console.log('Export chart data');
  }, []);

  const toggleComparisonMode = (mode: 'yoy' | 'mom') => {
    if (comparisonMode === mode) {
      setComparisonMode('none');
      setTrendComparisonData([]);
    } else {
      setComparisonMode(mode);
      const variance = mode === 'yoy' ? 0.15 : 0.08;
      const newComparisonData = trendData.map((item: TVSTrendData) => ({
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

  const prepareComparisonData = (currentData: TVSTrendData[], compareData: TVSTrendData[]) => {
    return currentData.map((item, index) => {
      const compareItem = compareData[index];
      const result: TVSTrendData & Record<string, string | number> = { ...item };

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
      ] as const;

      oracleKeys.forEach((key) => {
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
    { key: 'pie', label: isZh ? '市场份额' : 'Market Share' },
    { key: 'trend', label: isZh ? 'TVS趋势' : 'TVS Trend' },
    { key: 'bar', label: isZh ? '链支持' : 'Chain Support' },
    { key: 'chain', label: isZh ? '链分布' : 'Chain Breakdown' },
  ];

  const getSecondaryChartTypes = () => [
    { key: 'protocol', label: isZh ? '协议' : 'Protocols' },
    { key: 'asset', label: isZh ? '资产' : 'Assets' },
  ];

  // 是否显示 ChartToolbar
  const showChartToolbar = CHARTS_WITH_TYPE_SUPPORT.includes(activeChart);

  // 是否使用 ResponsiveContainer
  const useResponsiveContainer = CHARTS_WITH_RESPONSIVE_CONTAINER.includes(activeChart);

  // 渲染加载状态
  const renderLoadingState = () => (
    <div className="h-[360px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-xs">{isZh ? '加载中...' : 'Loading...'}</span>
      </div>
    </div>
  );

  // 渲染图表
  const renderChart = () => {
    const chartProps = {
      activeChart,
      viewType,
      sortedOracleData,
      trendData,
      chainBreakdown,
      protocolDetails,
      assetCategories,
      comparisonData,
      benchmarkData,
      correlationData,
      loading,
      loadingEnhanced,
      loadingComparison,
      locale,
      hoveredItem,
      setHoveredItem,
      selectedItem,
      setSelectedItem,
      linkedOracle,
      setLinkedOracle,
      zoomRange,
      setZoomRange,
      anomalyThreshold,
      selectedAnomaly,
      setSelectedAnomaly,
      comparisonMode,
      trendComparisonData,
      showConfidenceInterval,
      chartType, // 传递图表类型
    };

    if (!useResponsiveContainer) {
      return <ChartRenderer {...chartProps} />;
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartRenderer {...chartProps} />
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-3">
      {/* Chart Type Tabs */}
      <div className="py-2 border-b border-gray-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-gray-50/80 border border-gray-200 rounded-md p-0.5">
              {getMainChartTypes().map((item, index) => {
                const type = chartTypes.find((t) => t.key === item.key);
                if (!type) return null;
                const Icon = type.icon;
                const isActive = activeChart === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveChart(item.key as ChartType)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-all duration-200 whitespace-nowrap rounded-sm',
                      isActive
                        ? 'text-primary-600 bg-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                    title={isZh ? type.labelZh : type.label}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center bg-gray-50/80 border border-gray-200 rounded-md p-0.5">
              {getSecondaryChartTypes().map((item) => {
                const type = chartTypes.find((t) => t.key === item.key);
                if (!type) return null;
                const Icon = type.icon;
                const isActive = activeChart === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveChart(item.key as ChartType)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-all duration-200 whitespace-nowrap rounded-sm',
                      isActive
                        ? 'text-primary-600 bg-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                    title={isZh ? type.labelZh : type.label}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Time Range */}
            <div className="flex items-center gap-0.5 bg-gray-50 rounded-md p-0.5">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.key}
                  onClick={() => setSelectedTimeRange(range.key)}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200',
                    selectedTimeRange === range.key
                      ? 'text-primary-600 bg-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {activeChart === 'trend' && (
              <>
                <div className="h-3.5 w-px bg-gray-300 hidden sm:block" />

                {/* Comparison Mode */}
                <div className="flex items-center gap-0.5 bg-gray-50 rounded-md p-0.5">
                  <button
                    onClick={() => toggleComparisonMode('yoy')}
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200',
                      comparisonMode === 'yoy'
                        ? 'text-primary-600 bg-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                    title={isZh ? '同比对比' : 'Year-over-Year'}
                  >
                    {isZh ? '同比' : 'YoY'}
                  </button>
                  <button
                    onClick={() => toggleComparisonMode('mom')}
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200',
                      comparisonMode === 'mom'
                        ? 'text-primary-600 bg-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                    title={isZh ? '环比对比' : 'Month-over-Month'}
                  >
                    {isZh ? '环比' : 'MoM'}
                  </button>
                </div>

                {/* Anomaly Threshold */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
                  <AlertTriangle className="w-3 h-3 text-danger-500" />
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={anomalyThreshold * 100}
                    onChange={(e) => setAnomalyThreshold(Number(e.target.value) / 100)}
                    className="w-10 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-danger-500"
                  />
                  <span className="text-xs font-medium text-gray-600 min-w-[1.25rem]">
                    {(anomalyThreshold * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Confidence Interval */}
                {comparisonMode === 'none' && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-md">
                    <span className="text-xs font-medium text-purple-700">
                      {isZh ? 'CI' : 'CI'}
                    </span>
                    <button
                      onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
                      className={cn(
                        'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                        showConfidenceInterval ? 'bg-purple-500' : 'bg-gray-300'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform',
                          showConfidenceInterval ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                    {showConfidenceInterval && (
                      <span className="text-xs text-purple-600 font-medium">95%</span>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="h-3.5 w-px bg-gray-300 hidden lg:block" />

            {/* View Type Toggle */}
            {!['pie', 'trend', 'bar'].includes(activeChart) && (
              <div className="flex items-center bg-gray-50 rounded-md p-0.5">
                <button
                  onClick={() => setViewType('chart')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200',
                    viewType === 'chart'
                      ? 'text-primary-600 bg-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isZh ? '图表' : 'Chart'}</span>
                </button>
                <button
                  onClick={() => setViewType('table')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200',
                    viewType === 'table'
                      ? 'text-primary-600 bg-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isZh ? '表格' : 'Table'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Toolbar - 仅在支持的图表类型显示 */}
      {showChartToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg py-1.5 px-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1">
            {timeRangeList.map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  selectedTimeRange === range
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            {/* Chart Type Switcher */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
              {(['line', 'area'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleChartTypeChange(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                    chartType === type
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                  title={type === 'line' ? t('chartTypes.line') : t('chartTypes.area')}
                >
                  {type === 'line' ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <ActivitySquare className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {type === 'line' ? t('chartTypes.line') : t('chartTypes.area')}
                  </span>
                </button>
              ))}
            </div>

            {/* Reset Zoom */}
            {zoomRange && (
              <button
                onClick={handleResetZoom}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-all duration-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-all duration-200"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div ref={chartContainerRef} className="lg:col-span-2">
          {/* Chart Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900">{getChartTitle()}</h3>
              {linkedOracle && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md">
                  <Link2 className="w-3 h-3 text-purple-600" />
                  <span className="text-xs text-purple-700">
                    {linkedOracle.primary} ↔ {linkedOracle.secondary}
                  </span>
                  <button
                    onClick={() => setLinkedOracle(null)}
                    className="ml-1 p-0.5 hover:bg-purple-200 rounded transition-colors"
                    title={isZh ? '清除联动' : 'Clear Link'}
                  >
                    <X className="w-3 h-3 text-purple-600" />
                  </button>
                </div>
              )}
              {activeChart === 'trend' &&
                comparisonMode !== 'none' &&
                trendComparisonData.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary-50 border border-primary-200 rounded-md">
                    <span className="text-xs text-primary-700">
                      {comparisonMode === 'yoy' ? (isZh ? '同比' : 'YoY') : isZh ? '环比' : 'MoM'}
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
                          const diffPercent = latestData[`${key}DiffPercent`];
                          return sum + (typeof diffPercent === 'number' ? diffPercent : 0);
                        }, 0) / oracleKeys.length;
                      return (
                        <span
                          className={cn(
                            'text-xs font-bold',
                            avgDiff >= 0 ? 'text-success-600' : 'text-danger-600'
                          )}
                        >
                          {avgDiff >= 0 ? '+' : ''}
                          {avgDiff.toFixed(2)}%
                        </span>
                      );
                    })()}
                  </div>
                )}
            </div>
            <div className="flex items-center gap-1.5">
              {activeChart === 'trend' && zoomRange && (
                <button
                  onClick={() => setZoomRange(null)}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 px-2 py-1 hover:bg-primary-50 rounded-md transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {isZh ? '重置' : 'Reset'}
                </button>
              )}
              {selectedItem && (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {isZh ? '清除' : 'Clear'}
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Chart Area */}
          {loading && !['chain', 'protocol', 'asset'].includes(activeChart) ? (
            renderLoadingState()
          ) : (
            <>
              <div
                className={cn(
                  viewType === 'table' && !['chain', 'protocol', 'asset'].includes(activeChart)
                    ? 'h-[320px]'
                    : 'h-[360px]'
                )}
              >
                {renderChart()}
              </div>
              {viewType === 'chart' && !['chain', 'protocol', 'asset'].includes(activeChart) && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                  <Info className="w-3.5 h-3.5" />
                  <span>
                    {isZh ? '悬停查看详情，点击选中项目' : 'Hover for details, click to select'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
