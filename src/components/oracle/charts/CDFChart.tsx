'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Area,
} from 'recharts';
import { useI18n } from '@/lib/i18n/provider';
import { calculateCDF, CDFResult } from '@/lib/utils/statistics';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';

interface CDFChartProps {
  data: number[];
  oracleName?: string;
  className?: string;
  height?: number;
  showPercentileLabels?: boolean;
  showGrid?: boolean;
  color?: string;
}

interface CDFTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      value: number;
      probability: number;
      count: number;
    };
  }>;
}

export function CDFChart({
  data,
  oracleName,
  className = '',
  height = 350,
  showPercentileLabels = true,
  showGrid = true,
  color = chartColors.recharts.primaryLight,
}: CDFChartProps) {
  const { t } = useI18n();

  const cdfResult: CDFResult = useMemo(() => calculateCDF(data, 100), [data]);

  const percentileConfig = useMemo(
    () => [
      {
        key: 'p50',
        value: cdfResult.p50,
        label: 'P50',
        color: semanticColors.success.DEFAULT,
        description: t('cdfChart.p50Desc') || '50% 的数据低于此值',
      },
      {
        key: 'p95',
        value: cdfResult.p95,
        label: 'P95',
        color: semanticColors.warning.DEFAULT,
        description: t('cdfChart.p95Desc') || '95% 的数据低于此值',
      },
      {
        key: 'p99',
        value: cdfResult.p99,
        label: 'P99',
        color: semanticColors.danger.DEFAULT,
        description: t('cdfChart.p99Desc') || '99% 的数据低于此值',
      },
    ],
    [cdfResult, t]
  );

  const stats = useMemo(
    () => [
      {
        label: t('cdfChart.samples') || '样本数',
        value: cdfResult.totalCount.toLocaleString(),
        icon: '🔢',
      },
      {
        label: t('cdfChart.mean') || '平均值',
        value: `${cdfResult.mean}ms`,
        icon: '📊',
      },
      {
        label: t('cdfChart.min') || '最小值',
        value: `${cdfResult.min}ms`,
        icon: '⬇️',
      },
      {
        label: t('cdfChart.max') || '最大值',
        value: `${cdfResult.max}ms`,
        icon: '⬆️',
      },
      {
        label: t('cdfChart.stdDev') || '标准差',
        value: `${cdfResult.stdDev}ms`,
        icon: '📐',
      },
    ],
    [cdfResult, t]
  );

  const CustomTooltip = ({ active, payload }: CDFTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload;
    const percentile = percentileConfig.find(
      (p) => Math.abs(p.value - point.value) < (cdfResult.max - cdfResult.min) / 100
    );

    return (
      <div className="bg-white border border-gray-200 rounded p-3 min-w-[180px]">
        <p className="text-xs text-gray-500 font-medium mb-2">{t('cdfChart.latency') || '延迟'}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('cdfChart.value') || '数值'}:</span>
            <span className="text-sm font-semibold text-gray-900">{point.value.toFixed(1)}ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {t('cdfChart.probability') || '累积概率'}:
            </span>
            <span className="text-sm font-semibold text-blue-600">
              {point.probability.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('cdfChart.count') || '数据点'}:</span>
            <span className="text-sm font-mono text-gray-700">{point.count}</span>
          </div>
          {percentile && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ backgroundColor: `${percentile.color}20`, color: percentile.color }}
              >
                {percentile.label}: {percentile.description}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded p-5 ${className}`}>
        <div className="text-center py-10">
          <p className="text-gray-500">{t('cdfChart.noData') || '暂无数据'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {oracleName && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('cdfChart.title') || '累积分布函数 (CDF)'} - {oracleName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('cdfChart.subtitle') || '显示延迟值的累积概率分布'}
            </p>
          </div>
        </div>
      )}

      {/* Percentile Cards */}
      <div className="grid grid-cols-3 gap-4">
        {percentileConfig.map((item) => (
          <div
            key={item.key}
            className="bg-white border border-gray-200 rounded p-4"
            style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs uppercase tracking-wider font-medium"
                style={{ color: item.color }}
              >
                {item.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{Math.round(item.value)}</span>
              <span className="text-sm text-gray-500">ms</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-5 gap-3">
        {stats.map((item) => (
          <div key={item.label} className="bg-white border border-gray-200 rounded p-3 text-center">
            <span className="text-xl mb-1 block">{item.icon}</span>
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* CDF Chart */}
      <div className="bg-white border border-gray-200 rounded p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900">
            {t('cdfChart.chartTitle') || 'CDF 曲线'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {t('cdfChart.chartDesc') || '累积分布函数显示小于等于特定延迟值的概率'}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={cdfResult.points} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />}
            <XAxis
              dataKey="value"
              type="number"
              domain={[cdfResult.min, cdfResult.max]}
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              label={{
                value: t('cdfChart.xAxisLabel') || '延迟 (ms)',
                position: 'insideBottom',
                offset: -10,
                fill: chartColors.recharts.tick,
                fontSize: 11,
              }}
            />
            <YAxis
              dataKey="probability"
              domain={[0, 100]}
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              tickFormatter={(value) => `${value}%`}
              label={{
                value: t('cdfChart.yAxisLabel') || '累积概率 (%)',
                angle: -90,
                position: 'insideLeft',
                fill: chartColors.recharts.tick,
                fontSize: 11,
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Area under curve */}
            <Area
              type="monotone"
              dataKey="probability"
              stroke="none"
              fill={color}
              fillOpacity={0.1}
            />

            {/* CDF Line */}
            <Line
              type="monotone"
              dataKey="probability"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: color, stroke: baseColors.gray[50], strokeWidth: 2 }}
            />

            {/* Percentile Reference Lines */}
            {showPercentileLabels && (
              <>
                <ReferenceLine
                  x={cdfResult.p50}
                  stroke={semanticColors.success.DEFAULT}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'P50',
                    position: 'top',
                    fill: semanticColors.success.DEFAULT,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
                <ReferenceLine
                  x={cdfResult.p95}
                  stroke={semanticColors.warning.DEFAULT}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'P95',
                    position: 'top',
                    fill: semanticColors.warning.DEFAULT,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
                <ReferenceLine
                  x={cdfResult.p99}
                  stroke={semanticColors.danger.DEFAULT}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'P99',
                    position: 'top',
                    fill: semanticColors.danger.DEFAULT,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                {/* Reference dots at percentile intersections */}
                <ReferenceDot
                  x={cdfResult.p50}
                  y={50}
                  r={5}
                  fill={semanticColors.success.DEFAULT}
                  stroke={baseColors.gray[50]}
                  strokeWidth={2}
                />
                <ReferenceDot
                  x={cdfResult.p95}
                  y={95}
                  r={5}
                  fill={semanticColors.warning.DEFAULT}
                  stroke={baseColors.gray[50]}
                  strokeWidth={2}
                />
                <ReferenceDot
                  x={cdfResult.p99}
                  y={99}
                  r={5}
                  fill={semanticColors.danger.DEFAULT}
                  stroke={baseColors.gray[50]}
                  strokeWidth={2}
                />
              </>
            )}

            {/* 50% reference line */}
            <ReferenceLine
              y={50}
              stroke={chartColors.recharts.secondaryAxis}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={95}
              stroke={chartColors.recharts.secondaryAxis}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-blue-500 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500">{t('cdfChart.cdfCurve') || 'CDF 曲线'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: semanticColors.success.DEFAULT }}
            />
            <span className="text-xs text-gray-500">P50 (中位数)</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: semanticColors.warning.DEFAULT }}
            />
            <span className="text-xs text-gray-500">P95</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: semanticColors.danger.DEFAULT }}
            />
            <span className="text-xs text-gray-500">P99</span>
          </div>
        </div>
      </div>

      {/* CDF Explanation */}
      <div className="bg-blue-50 rounded p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          {t('cdfChart.aboutTitle') || '关于累积分布函数 (CDF)'}
        </h4>
        <p className="text-xs text-blue-800 leading-relaxed">
          {t('cdfChart.aboutDesc') ||
            'CDF(x) 表示延迟值小于等于 x 的概率。例如，CDF(100ms) = 80% 表示 80% 的请求延迟不超过 100ms。P50（中位数）表示 50% 的数据点低于该值，P95 表示 95% 的数据点低于该值。CDF 曲线越陡峭，表示延迟分布越集中；曲线越平缓，表示延迟波动越大。'}
        </p>
      </div>
    </div>
  );
}

export type { CDFChartProps };
