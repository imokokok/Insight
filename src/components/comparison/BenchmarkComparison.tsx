'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line,
  Cell,
} from 'recharts';
import {
  BenchmarkType,
  BenchmarkData,
  BenchmarkComparisonResult,
  BenchmarkChartData,
} from './types';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { DifferenceBadge } from './DifferenceBadge';

interface BenchmarkComparisonProps {
  actualValue: number;
  benchmarkType: BenchmarkType;
  customBenchmark?: number;
  customLabel?: string;
  metrics?: Array<{
    name: string;
    value: number;
    benchmark: number;
    unit?: string;
  }>;
  title?: string;
  showChart?: boolean;
  showTable?: boolean;
  invertColors?: boolean;
  className?: string;
}

// 行业基准数据
const industryBenchmarks: Record<string, BenchmarkData> = {
  priceDeviation: {
    label: 'industry.priceDeviation',
    value: 0.5,
    description: 'industry.priceDeviationDesc',
    source: 'industry.consensus',
  },
  responseTime: {
    label: 'industry.responseTime',
    value: 500,
    description: 'industry.responseTimeDesc',
    source: 'industry.consensus',
  },
  uptime: {
    label: 'industry.uptime',
    value: 99.9,
    description: 'industry.uptimeDesc',
    source: 'industry.consensus',
  },
  accuracy: {
    label: 'industry.accuracy',
    value: 99.5,
    description: 'industry.accuracyDesc',
    source: 'industry.consensus',
  },
  updateFrequency: {
    label: 'industry.updateFrequency',
    value: 60,
    description: 'industry.updateFrequencyDesc',
    source: 'industry.consensus',
  },
};

export function BenchmarkComparison({
  actualValue,
  benchmarkType,
  customBenchmark,
  customLabel,
  metrics = [],
  title,
  showChart = true,
  showTable = true,
  invertColors = false,
  className = '',
}: BenchmarkComparisonProps) {
  const t = useTranslations('comparison.benchmark');

  const [selectedBenchmark, setSelectedBenchmark] =
    useState<keyof typeof industryBenchmarks>('priceDeviation');

  const benchmarkValue = useMemo(() => {
    switch (benchmarkType) {
      case 'industry_average':
        return industryBenchmarks[selectedBenchmark]?.value || 0;
      case 'market_leader':
        // 市场领导者通常比行业平均好20%
        return (industryBenchmarks[selectedBenchmark]?.value || 0) * 0.8;
      case 'custom':
        return customBenchmark || 0;
      default:
        return 0;
    }
  }, [benchmarkType, selectedBenchmark, customBenchmark]);

  const benchmarkLabel = useMemo(() => {
    switch (benchmarkType) {
      case 'industry_average':
        return t('industryAverage');
      case 'market_leader':
        return t('marketLeader');
      case 'custom':
        return customLabel || t('customBenchmark');
      default:
        return t('benchmark');
    }
  }, [benchmarkType, customLabel, t]);

  const comparison = useMemo(() => {
    const difference = actualValue - benchmarkValue;
    const percentDiff = benchmarkValue !== 0 ? (difference / benchmarkValue) * 100 : 0;

    let performance: 'above' | 'below' | 'at';
    if (Math.abs(percentDiff) < 1) {
      performance = 'at';
    } else if (invertColors) {
      performance = percentDiff < 0 ? 'above' : 'below';
    } else {
      performance = percentDiff > 0 ? 'above' : 'below';
    }

    return {
      difference,
      percentDiff,
      performance,
    };
  }, [actualValue, benchmarkValue, invertColors]);

  const chartData: BenchmarkChartData[] = useMemo(() => {
    return metrics.map((m) => ({
      category: m.name,
      actual: m.value,
      benchmark: m.benchmark,
      gap: ((m.value - m.benchmark) / m.benchmark) * 100,
    }));
  }, [metrics]);

  const getPerformanceColor = (performance: 'above' | 'below' | 'at'): string => {
    switch (performance) {
      case 'above':
        return invertColors ? 'text-red-600' : 'text-green-600';
      case 'below':
        return invertColors ? 'text-green-600' : 'text-red-600';
      case 'at':
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceBg = (performance: 'above' | 'below' | 'at'): string => {
    switch (performance) {
      case 'above':
        return invertColors ? 'bg-red-50' : 'bg-green-50';
      case 'below':
        return invertColors ? 'bg-green-50' : 'bg-red-50';
      case 'at':
      default:
        return 'bg-gray-50';
    }
  };

  const getPerformanceIcon = (performance: 'above' | 'below' | 'at'): string => {
    switch (performance) {
      case 'above':
        return '↑';
      case 'below':
        return '↓';
      case 'at':
      default:
        return '→';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with comparison summary */}
      <div className={`p-6 border ${getPerformanceBg(comparison.performance)} border-gray-200`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {actualValue?.toFixed(2) ?? '-'}
              </span>
              <span className="text-sm text-gray-500">{t('actualValue')}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{benchmarkLabel}</p>
              <p className="text-xl font-semibold text-gray-700">
                {benchmarkValue?.toFixed(2) ?? '-'}
              </p>
            </div>

            <div className="w-px h-12 bg-gray-300" />

            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('difference')}</p>
              <div
                className={`flex items-center gap-1 text-xl font-semibold ${getPerformanceColor(comparison.performance)}`}
              >
                <span>{getPerformanceIcon(comparison.performance)}</span>
                <span>{Math.abs(comparison.percentDiff)?.toFixed(2) ?? '-'}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div
            className={`px-3 py-1 text-sm font-medium rounded ${
              comparison.performance === 'above'
                ? invertColors
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
                : comparison.performance === 'below'
                  ? invertColors
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {comparison.performance === 'above'
              ? invertColors
                ? t('belowBenchmark')
                : t('aboveBenchmark')
              : comparison.performance === 'below'
                ? invertColors
                  ? t('aboveBenchmark')
                  : t('belowBenchmark')
                : t('atBenchmark')}
          </div>
          <span className="text-sm text-gray-500">
            {comparison.difference >= 0 ? '+' : ''}
            {comparison.difference?.toFixed(2) ?? '-'} {t('unitsFromBenchmark')}
          </span>
        </div>
      </div>

      {/* Benchmark selector */}
      {benchmarkType === 'industry_average' && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(industryBenchmarks).map(([key, data]) => (
            <button
              key={key}
              onClick={() => setSelectedBenchmark(key)}
              className={`px-3 py-2 text-sm font-medium border transition-colors ${
                selectedBenchmark === key
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t(data.label)}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {showChart && metrics.length > 0 && (
        <div className="bg-white border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('benchmarkComparison')}</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value, name) => {
                    if (name === 'gap') return [`${Number(value).toFixed(2)}%`, t('gap')];
                    return [
                      Number(value).toFixed(2),
                      name === 'actual' ? t('actual') : t('benchmark'),
                    ];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="left"
                  dataKey="actual"
                  name={t('actual')}
                  fill={chartColors.recharts.primary}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="benchmark"
                  name={t('benchmark')}
                  fill={chartColors.recharts.purple}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gap"
                  name={t('gap')}
                  stroke={chartColors.recharts.warning}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gap Chart */}
      {showChart && metrics.length > 0 && (
        <div className="bg-white border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('performanceGap')}</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={baseColors.gray[200]}
                  horizontal={false}
                />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`,
                    t('gap'),
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <ReferenceLine x={0} stroke={baseColors.gray[400]} />
                <Bar dataKey="gap" name={t('performanceGap')} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        invertColors
                          ? entry.gap < 0
                            ? semanticColors.success.DEFAULT
                            : semanticColors.danger.DEFAULT
                          : entry.gap > 0
                            ? semanticColors.success.DEFAULT
                            : semanticColors.danger.DEFAULT
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      {showTable && metrics.length > 0 && (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">{t('detailedComparison')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('metric')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actual')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('benchmark')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('gap')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, index) => {
                  const gap = ((metric.value - metric.benchmark) / metric.benchmark) * 100;
                  const isPositive = invertColors ? gap < 0 : gap > 0;
                  const isNeutral = Math.abs(gap) < 1;

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{metric.name}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {metric.value?.toFixed(2) ?? '-'}
                        {metric.unit && <span className="text-gray-400 ml-1">{metric.unit}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">
                        {metric.benchmark?.toFixed(2) ?? '-'}
                        {metric.unit && <span className="text-gray-400 ml-1">{metric.unit}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DifferenceBadge value={gap} type="percentage" size="sm" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isNeutral ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {t('atBenchmark')}
                          </span>
                        ) : isPositive ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            {t('aboveBenchmark')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                            {t('belowBenchmark')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BenchmarkComparison;
