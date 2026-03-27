'use client';

import { useState, useCallback, useEffect } from 'react';

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
  ChevronDown,
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

// 主要图表类型（4个）
const mainChartTypes = [
  {
    key: 'pie',
    label: 'Market Share',
    labelZh: '份额',
    shortLabel: 'Share',
    shortLabelZh: '份额',
    icon: PieChartIcon,
  },
  {
    key: 'trend',
    label: 'TVS Trend',
    labelZh: '趋势',
    shortLabel: 'Trend',
    shortLabelZh: '趋势',
    icon: TrendingUp,
  },
  {
    key: 'bar',
    label: 'Chain Support',
    labelZh: '链支持',
    shortLabel: 'Chains',
    shortLabelZh: '链支持',
    icon: BarChart3,
  },
  {
    key: 'chain',
    label: 'Chain Breakdown',
    labelZh: '链分布',
    shortLabel: 'Breakdown',
    shortLabelZh: '链分布',
    icon: Network,
  },
] as const;

// 次要图表类型（5个）
const secondaryChartTypes = [
  {
    key: 'protocol',
    label: 'Protocols',
    labelZh: '协议',
    shortLabel: 'Protocols',
    shortLabelZh: '协议',
    icon: Building2,
  },
  {
    key: 'asset',
    label: 'Asset Categories',
    labelZh: '资产',
    shortLabel: 'Assets',
    shortLabelZh: '资产',
    icon: PieChartIcon2,
  },
  {
    key: 'comparison',
    label: 'Oracle Comparison',
    labelZh: '对比',
    shortLabel: 'Compare',
    shortLabelZh: '对比',
    icon: GitCompare,
  },
  {
    key: 'benchmark',
    label: 'Benchmark',
    labelZh: '基准',
    shortLabel: 'Benchmark',
    shortLabelZh: '基准',
    icon: Target,
  },
  {
    key: 'correlation',
    label: 'Correlation',
    labelZh: '相关性',
    shortLabel: 'Correlation',
    shortLabelZh: '相关性',
    icon: ActivitySquare,
  },
] as const;

// 合并所有图表类型用于查找
const allChartTypes = [...mainChartTypes, ...secondaryChartTypes];

// localStorage key
const CHART_TYPE_STORAGE_KEY = 'market-overview-chart-type';

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

  // 次要图表下拉菜单状态
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);

  // 从 localStorage 读取保存的图表类型
  useEffect(() => {
    const savedChartType = localStorage.getItem(CHART_TYPE_STORAGE_KEY) as ChartType | null;
    if (savedChartType) {
      // 验证保存的图表类型是否有效
      const isValidType = allChartTypes.some((t) => t.key === savedChartType);
      if (isValidType && savedChartType !== activeChart) {
        setActiveChart(savedChartType);
      }
    }
  }, []);

  // 处理图表类型切换并保存到 localStorage
  const handleChartTypeSwitch = useCallback(
    (type: ChartType) => {
      setActiveChart(type);
      localStorage.setItem(CHART_TYPE_STORAGE_KEY, type);
      setIsSecondaryMenuOpen(false);
    },
    [setActiveChart]
  );

  // 处理图表类型切换
  const handleChartTypeChange = useCallback((type: string) => {
    setChartType(type as 'line' | 'area' | 'candle');
  }, []);

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

  // 获取当前选中的次要图表类型信息
  const getCurrentSecondaryChart = () => {
    return secondaryChartTypes.find((t) => t.key === activeChart);
  };

  // 检查当前选中的是否是次要图表
  const isSecondaryChartActive = secondaryChartTypes.some((t) => t.key === activeChart);

  // 是否显示 ChartToolbar
  const showChartToolbar = CHARTS_WITH_TYPE_SUPPORT.includes(activeChart);

  // 是否使用 ResponsiveContainer
  const useResponsiveContainer = CHARTS_WITH_RESPONSIVE_CONTAINER.includes(activeChart);

  // 渲染加载状态
  const renderLoadingState = () => (
    <div className="h-[360px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-xs">{t('common.loading')}</span>
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
    <div>
      {/* Chart Header with Title Bar */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
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
                title={t('ui.chart.clearLink')}
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
                  {comparisonMode === 'yoy'
                    ? t('ui.chart.yoyComparison')
                    : t('ui.chart.momComparison')}
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
              {t('ui.chart.reset')}
            </button>
          )}
          {selectedItem && (
            <button
              onClick={() => setSelectedItem(null)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              {t('common.actions.clear')}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Chart Type Tabs - Flattened */}
      <div className="pb-3 mb-4 border-b border-gray-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 主要图表类型 - 一级标签横向排列 */}
            <div className="flex items-center">
              {mainChartTypes.map((type) => {
                const Icon = type.icon;
                const isActive = activeChart === type.key;
                return (
                  <button
                    key={type.key}
                    onClick={() => handleChartTypeSwitch(type.key as ChartType)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap border-b-2',
                      isActive
                        ? 'text-primary-600 border-primary-500'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                    )}
                    title={t(
                      `ui.chart.${type.key === 'pie' ? 'marketShare' : type.key === 'trend' ? 'tvsTrend' : type.key === 'bar' ? 'chainSupport' : 'chainBreakdown'}`
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {t(
                        `ui.chart.${type.key === 'pie' ? 'marketShare' : type.key === 'trend' ? 'tvsTrend' : type.key === 'bar' ? 'chainSupport' : 'chainBreakdown'}`
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 次要图表类型 - 简化下拉按钮 */}
            <div className="relative">
              <button
                onClick={() => setIsSecondaryMenuOpen(!isSecondaryMenuOpen)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap border-b-2',
                  isSecondaryChartActive
                    ? 'text-primary-600 border-primary-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {(() => {
                  const currentSecondary = getCurrentSecondaryChart();
                  if (currentSecondary) {
                    const Icon = currentSecondary.icon;
                    return (
                      <>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {t(
                            `ui.chart.${currentSecondary.key === 'protocol' ? 'protocols' : currentSecondary.key === 'asset' ? 'assetCategories' : currentSecondary.key === 'comparison' ? 'oracleComparison' : currentSecondary.key === 'benchmark' ? 'benchmark' : 'correlation'}`
                          )}
                        </span>
                      </>
                    );
                  }
                  return (
                    <>
                      <ActivitySquare className="w-4 h-4 flex-shrink-0" />
                      <span>{t('common.actions.more')}</span>
                    </>
                  );
                })()}
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200',
                    isSecondaryMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* 下拉菜单 */}
              {isSecondaryMenuOpen && (
                <>
                  {/* 点击外部关闭菜单的遮罩 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSecondaryMenuOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                    {secondaryChartTypes.map((type) => {
                      const Icon = type.icon;
                      const isActive = activeChart === type.key;
                      return (
                        <button
                          key={type.key}
                          onClick={() => handleChartTypeSwitch(type.key as ChartType)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
                            isActive
                              ? 'text-primary-600 bg-primary-50'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {t(
                              `ui.chart.${type.key === 'protocol' ? 'protocols' : type.key === 'asset' ? 'assetCategories' : type.key === 'comparison' ? 'oracleComparison' : type.key === 'benchmark' ? 'benchmark' : 'correlation'}`
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Time Range - Text Only */}
            <div className="flex items-center gap-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.key}
                  onClick={() => setSelectedTimeRange(range.key)}
                  className={cn(
                    'px-2 py-1 text-xs font-medium transition-all duration-200',
                    selectedTimeRange === range.key
                      ? 'text-primary-600 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {activeChart === 'trend' && (
              <>
                <div className="h-3.5 w-px bg-gray-300 hidden sm:block" />

                {/* Comparison Mode - Text Only */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleComparisonMode('yoy')}
                    className={cn(
                      'px-2 py-1 text-xs font-medium transition-all duration-200',
                      comparisonMode === 'yoy'
                        ? 'text-primary-600 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                    title={t('ui.chart.yoyComparison')}
                  >
                    {t('ui.chart.yoyComparison')}
                  </button>
                  <button
                    onClick={() => toggleComparisonMode('mom')}
                    className={cn(
                      'px-2 py-1 text-xs font-medium transition-all duration-200',
                      comparisonMode === 'mom'
                        ? 'text-primary-600 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                    title={t('ui.chart.momComparison')}
                  >
                    {t('ui.chart.momComparison')}
                  </button>
                </div>

                {/* Anomaly Threshold - Text Only */}
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-danger-500" />
                  <div className="flex items-center gap-1">
                    {[5, 10, 15, 20, 30, 50].map((threshold) => {
                      const isActive = Math.round(anomalyThreshold * 100) === threshold;
                      const getThresholdColor = (t: number) => {
                        switch (t) {
                          case 5:
                            return 'text-success-500 hover:text-success-600';
                          case 10:
                            return 'text-success-400 hover:text-success-500';
                          case 15:
                            return 'text-warning-400 hover:text-warning-500';
                          case 20:
                            return 'text-warning-500 hover:text-warning-600';
                          case 30:
                            return 'text-orange-500 hover:text-orange-600';
                          case 50:
                            return 'text-danger-500 hover:text-danger-600';
                          default:
                            return 'text-gray-500';
                        }
                      };
                      return (
                        <button
                          key={threshold}
                          onClick={() => setAnomalyThreshold(threshold / 100)}
                          className={cn(
                            'px-1.5 py-1 text-xs font-medium transition-all duration-200 min-w-[1.5rem]',
                            isActive
                              ? `font-medium ${getThresholdColor(threshold)}`
                              : `text-gray-400 hover:text-gray-600 ${getThresholdColor(threshold)}`
                          )}
                          title={t('common.confidenceInterval.threshold', {
                            threshold: `${threshold}%`,
                          })}
                        >
                          {threshold}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Confidence Interval - 只在非对比模式下显示 */}
                {comparisonMode === 'none' && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50/80 rounded-lg border border-purple-100">
                    <button
                      onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1',
                        showConfidenceInterval
                          ? 'bg-purple-500 shadow-sm'
                          : 'bg-gray-300 hover:bg-gray-350'
                      )}
                      title={t('ui.chart.toggleConfidence')}
                    >
                      <span
                        className={cn(
                          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
                          showConfidenceInterval ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                    <span
                      className={cn(
                        'text-xs font-semibold transition-colors duration-200',
                        showConfidenceInterval ? 'text-purple-700' : 'text-purple-500/70'
                      )}
                    >
                      {showConfidenceInterval ? '95% CI' : 'CI'}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="h-3.5 w-px bg-gray-300 hidden lg:block" />

            {/* View Type Toggle - Text Only */}
            {!['pie', 'trend', 'bar'].includes(activeChart) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewType('chart')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-200',
                    viewType === 'chart'
                      ? 'text-primary-600 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('ui.chart.chart')}</span>
                </button>
                <button
                  onClick={() => setViewType('table')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-200',
                    viewType === 'table'
                      ? 'text-primary-600 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('ui.chart.table')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Toolbar - 仅在支持的图表类型显示 - Flattened */}
      {showChartToolbar && (
        <div className="flex items-center justify-end gap-2 p-2">
          {/* Chart Type Switcher - Text Only */}
          <div className="flex items-center gap-1">
            {(['line', 'area'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleChartTypeChange(type)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all duration-200',
                  chartType === type
                    ? 'text-primary-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
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

          {/* Reset Zoom - Text Only */}
          {zoomRange && (
            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-all duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('ui.chart.reset')}</span>
            </button>
          )}

          {/* Export Button - Text Only */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-all duration-200"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('ui.chart.export')}</span>
          </button>
        </div>
      )}

      {/* Chart Content - Minimal padding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div ref={chartContainerRef} className="lg:col-span-2">
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
                  <span>{t('marketOverview.chartHint')}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
