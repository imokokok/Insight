'use client';

import { useState, useMemo } from 'react';
import { BenchmarkData } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TooltipProps } from '@/types/ui/recharts';
import { useI18n } from '@/lib/i18n/provider';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  BarChart3,
  Info,
  ChevronDown,
} from 'lucide-react';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface BenchmarkComparisonProps {
  data: BenchmarkData[];
  loading?: boolean;
}

export default function BenchmarkComparison({ data, loading = false }: BenchmarkComparisonProps) {
  const { locale } = useI18n();
  const [selectedMetric, setSelectedMetric] = useState<string>(data[0]?.metric.name || '');
  const [showMetricSelector, setShowMetricSelector] = useState(false);

  const currentMetric = useMemo(() => {
    return data.find((d) => d.metric.name === selectedMetric) || data[0];
  }, [data, selectedMetric]);

  const chartData = useMemo(() => {
    if (!currentMetric) return [];
    return currentMetric.oracleValues.map((ov) => ({
      name: ov.oracle,
      value: ov.value,
      color: ov.color,
      diffPercent: ov.diffPercent,
      percentile: ov.percentile,
      diffFromAverage: ov.diffFromAverage,
    }));
  }, [currentMetric]);

  const getPerformanceIcon = (diffPercent: number) => {
    if (diffPercent > 5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (diffPercent < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getPerformanceClass = (diffPercent: number) => {
    if (diffPercent > 5) return 'text-green-600';
    if (diffPercent < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const CustomTooltip = ({ active, payload }: TooltipProps<(typeof chartData)[0]>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as (typeof chartData)[0];
      const metric = currentMetric?.metric;
      return (
        <div className="bg-white border border-gray-200 p-2 min-w-[180px]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2" style={{ backgroundColor: item.color }} />
            <span className="font-medium text-gray-900 text-sm">{item.name}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{metric?.name}:</span>
              <span className="font-medium">
                {item.value}
                {metric?.unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {locale === 'zh-CN' ? 'vs 行业平均' : 'vs Industry Avg'}:
              </span>
              <span className={`font-medium ${getPerformanceClass(item.diffPercent)}`}>
                {item.diffPercent > 0 ? '+' : ''}
                {item.diffPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {locale === 'zh-CN' ? '排名百分位' : 'Percentile'}:
              </span>
              <span className="font-medium text-blue-600">Top {item.percentile}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">
            {locale === 'zh-CN' ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (data.length === 0 || !currentMetric) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {locale === 'zh-CN' ? '暂无基准数据' : 'No benchmark data available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 指标选择器 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative">
          <button
            onClick={() => setShowMetricSelector(!showMetricSelector)}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{currentMetric.metric.name}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                showMetricSelector ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showMetricSelector && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 z-10">
              <div className="p-1.5">
                {data.map((item) => (
                  <button
                    key={item.metric.name}
                    onClick={() => {
                      setSelectedMetric(item.metric.name);
                      setShowMetricSelector(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left transition-colors ${
                      selectedMetric === item.metric.name
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-sm">{item.metric.name}</div>
                    <div className="text-xs text-gray-500 truncate">{item.metric.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 行业基准统计 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">
              {locale === 'zh-CN' ? '行业平均' : 'Industry Avg'}:
            </span>
            <span className="font-medium text-gray-900 text-sm">
              {currentMetric.metric.industryAverage}
              {currentMetric.metric.unit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">
              {locale === 'zh-CN' ? '行业中位数' : 'Median'}:
            </span>
            <span className="font-medium text-gray-900 text-sm">
              {currentMetric.metric.industryMedian}
              {currentMetric.metric.unit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">
              {locale === 'zh-CN' ? '行业最佳' : 'Best'}:
            </span>
            <span className="font-medium text-green-600 text-sm">
              {currentMetric.metric.industryBest}
              {currentMetric.metric.unit}
            </span>
          </div>
        </div>
      </div>

      {/* 图表 */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 90 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              horizontal={false}
            />
            <XAxis type="number" stroke={chartColors.recharts.axis} fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              stroke={chartColors.recharts.secondaryAxis}
              fontSize={11}
              width={85}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={currentMetric.metric.industryAverage}
              stroke={semanticColors.warning.main}
              strokeDasharray="5 5"
              label={{
                value: locale === 'zh-CN' ? '平均' : 'Avg',
                position: 'top',
                fill: semanticColors.warning.main,
                fontSize: 10,
              }}
            />
            <Bar dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 详细对比表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '预言机' : 'Oracle'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {currentMetric.metric.name}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? 'vs 行业平均' : 'vs Industry Avg'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '差异值' : 'Difference'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '排名百分位' : 'Percentile'}
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '表现' : 'Performance'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentMetric.oracleValues
              .sort((a, b) => b.value - a.value)
              .map((ov) => (
                <tr key={ov.oracle} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5" style={{ backgroundColor: ov.color }} />
                      <span className="font-medium text-gray-900 text-sm">{ov.oracle}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-medium text-gray-900 text-sm">
                      {ov.value}
                      {currentMetric.metric.unit}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-medium text-sm ${getPerformanceClass(ov.diffPercent)}`}>
                      {ov.diffPercent > 0 ? '+' : ''}
                      {ov.diffPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`font-medium text-sm ${
                        ov.diffFromAverage > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {ov.diffFromAverage > 0 ? '+' : ''}
                      {ov.diffFromAverage}
                      {currentMetric.metric.unit}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-14 h-1.5 bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${ov.percentile}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">Top {ov.percentile}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center">
                      {getPerformanceIcon(ov.diffPercent)}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* 说明 */}
      <div className="flex items-start gap-2 text-xs text-gray-500 py-3 border-b border-gray-100">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-gray-700 mb-0.5">
            {locale === 'zh-CN' ? '关于行业基准' : 'About Industry Benchmarks'}
          </p>
          <p>{currentMetric.metric.description}</p>
          <p className="mt-0.5">
            {locale === 'zh-CN'
              ? '黄色虚线表示行业平均值。绿色表示高于平均，红色表示低于平均。'
              : 'Yellow dashed line indicates industry average. Green = above average, Red = below average.'}
          </p>
        </div>
      </div>
    </div>
  );
}
