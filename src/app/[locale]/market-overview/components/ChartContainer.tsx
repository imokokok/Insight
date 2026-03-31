'use client';

import { useState, useCallback } from 'react';

import {
  PieChart as PieChartIcon,
  Table as TableIcon,
  Link2,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { ResponsiveContainer } from 'recharts';

import { useTranslations, useLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/stores/uiStore';

import { prepareComparisonData, ORACLE_KEYS } from '../comparisonUtils';
import {
  type ChartType,
  type ViewType,
  type TVSTrendData,
  type OracleMarketData,
  type ProtocolDetail,
  type AssetCategory,
  type ComparisonData,
  type BenchmarkData,
  type CorrelationData,
} from '../types';

import ChartRenderer from './ChartRenderer';
import ChartTimeRangeSelector from './ChartTimeRangeSelector';
import ChartToolbar, { CHARTS_WITH_TYPE_SUPPORT } from './ChartToolbar';
import ChartTypeSelector from './ChartTypeSelector';
import { ChartSkeleton } from './skeletons';

const CHARTS_WITH_RESPONSIVE_CONTAINER: ChartType[] = [
  'pie',
  'trend',
  'bar',
  'comparison',
  'benchmark',
  'correlation',
];

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
  protocolDetails: ProtocolDetail[];
  assetCategories: AssetCategory[];
  comparisonData: ComparisonData[];
  benchmarkData: BenchmarkData[];
  correlationData: CorrelationData;
  children?: React.ReactNode;
}

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
  protocolDetails,
  assetCategories,
  comparisonData,
  benchmarkData,
  correlationData,
  children,
}: ChartContainerProps) {
  const t = useTranslations('marketOverview');
  const locale = useLocale();
  const isMobile = useIsMobile();

  const [chartType, setChartType] = useState<'line' | 'area' | 'candle'>('line');

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

  const handleChartTypeChange = useCallback((type: 'line' | 'area' | 'candle') => {
    setChartType(type);
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomRange(null);
  }, [setZoomRange]);

  const handleExport = useCallback(() => {}, []);

  const showChartToolbar = CHARTS_WITH_TYPE_SUPPORT.includes(activeChart);
  const useResponsiveContainer = CHARTS_WITH_RESPONSIVE_CONTAINER.includes(activeChart);

  const renderLoadingState = () => (
    <div className="h-[360px]">
      <ChartSkeleton type={activeChart} height={360} />
    </div>
  );

  const renderChart = () => {
    const chartProps = {
      activeChart,
      viewType,
      sortedOracleData,
      trendData,
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
      chartType,
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

  const renderChartHeader = () => (
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
        {activeChart === 'trend' && comparisonMode !== 'none' && trendComparisonData.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary-50 border border-primary-200 rounded-md">
            <span className="text-xs text-primary-700">
              {comparisonMode === 'yoy' ? t('ui.chart.yoyComparison') : t('ui.chart.momComparison')}
            </span>
            {(() => {
              const latestData = prepareComparisonData(trendData, trendComparisonData)[
                trendData.length - 1
              ];
              const avgDiff =
                ORACLE_KEYS.reduce((sum, key) => {
                  const diffPercent = latestData[`${key}DiffPercent`];
                  return sum + (typeof diffPercent === 'number' ? diffPercent : 0);
                }, 0) / ORACLE_KEYS.length;
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
  );

  const renderTrendControls = () => {
    if (activeChart !== 'trend') return null;

    const getThresholdColor = (threshold: number) => {
      switch (threshold) {
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
      <>
        <div className="h-3.5 w-px bg-gray-300 hidden sm:block" />

        <div className="flex items-center gap-1 flex-shrink-0">
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

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AlertTriangle className="w-3 h-3 text-danger-500" />
          <div className="flex items-center gap-1 overflow-x-auto">
            {[5, 10, 15, 20, 30, 50].map((threshold) => {
              const isActive = Math.round(anomalyThreshold * 100) === threshold;
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

        {comparisonMode === 'none' && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50/80 rounded-lg border border-purple-100 flex-shrink-0">
            <button
              onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1',
                showConfidenceInterval ? 'bg-purple-500 shadow-sm' : 'bg-gray-300 hover:bg-gray-350'
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
    );
  };

  const renderViewTypeToggle = () => {
    if (['pie', 'trend', 'bar'].includes(activeChart)) return null;

    return (
      <>
        <div className="h-3.5 w-px bg-gray-300 hidden lg:block" />
        <div className="flex items-center gap-1 flex-shrink-0">
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
      </>
    );
  };

  const renderControls = () => (
    <div className="pb-3 mb-4 border-b border-gray-100">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <ChartTypeSelector activeChart={activeChart} onChartChange={setActiveChart} />

        <div className="flex items-center gap-3 flex-wrap overflow-x-auto">
          <ChartTimeRangeSelector
            selectedTimeRange={selectedTimeRange}
            onTimeRangeChange={setSelectedTimeRange}
          />

          {renderTrendControls()}
          {renderViewTypeToggle()}
        </div>
      </div>
    </div>
  );

  const renderChartContent = () => {
    if (children) {
      return children;
    }

    if (loading && !['chain', 'protocol', 'asset'].includes(activeChart)) {
      return renderLoadingState();
    }

    return (
      <>
        <div
          key={activeChart}
          className={cn(
            'will-change-transform gpu-accelerated',
            'transition-all duration-250 ease-in-out',
            'animate-fade-in',
            viewType === 'table' && !['chain', 'protocol', 'asset'].includes(activeChart)
              ? 'h-[320px]'
              : isMobile
                ? 'h-[340px]'
                : activeChart === 'pie'
                  ? 'h-[460px]'
                  : activeChart === 'bar'
                    ? 'h-[460px]'
                    : 'h-[380px]'
          )}
        >
          {renderChart()}
        </div>
        {viewType === 'chart' && !['chain', 'protocol', 'asset'].includes(activeChart) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <span>{t('chartHint')}</span>
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      {renderChartHeader()}
      {renderControls()}

      {showChartToolbar && (
        <ChartToolbar
          activeChart={activeChart}
          chartType={chartType}
          onChartTypeChange={handleChartTypeChange}
          zoomRange={zoomRange}
          onResetZoom={handleResetZoom}
          onExport={handleExport}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div ref={chartContainerRef} className="lg:col-span-2">
          {renderChartContent()}
        </div>
      </div>
    </div>
  );
}
