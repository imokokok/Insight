'use client';

import { useState, useMemo } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';

interface LatencyDataPoint {
  timestamp: string;
  latency: number;
  isAnomaly: boolean;
  fullTimestamp: Date;
}

interface LatencyTrendMiniChartProps {
  data: LatencyDataPoint[];
  oracleName?: string;
  className?: string;
  height?: number;
  anomalyThreshold?: number;
  timeRange?: '1h' | '6h' | '24h' | '7d';
  onTimeRangeChange?: (range: '1h' | '6h' | '24h' | '7d') => void;
}

interface TrendStats {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  anomalyCount: number;
  anomalyPercent: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

function calculatePercentile(sortedData: number[], percentile: number): number {
  if (sortedData.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedData.length) - 1;
  return sortedData[Math.max(0, Math.min(index, sortedData.length - 1))];
}

function calculateTrendStats(data: LatencyDataPoint[]): TrendStats {
  if (data.length === 0) {
    return {
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      anomalyCount: 0,
      anomalyPercent: 0,
      trend: 'stable',
      trendPercent: 0,
    };
  }

  const latencies = data.map((d) => d.latency);
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const p50 = calculatePercentile(sortedLatencies, 50);
  const p95 = calculatePercentile(sortedLatencies, 95);
  const p99 = calculatePercentile(sortedLatencies, 99);
  const anomalyCount = data.filter((d) => d.isAnomaly).length;
  const anomalyPercent = (anomalyCount / data.length) * 100;

  // 计算趋势（比较前半段和后半段的平均值）
  const halfIndex = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, halfIndex);
  const secondHalf = data.slice(halfIndex);
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.latency, 0) / (firstHalf.length || 1);
  const secondHalfAvg =
    secondHalf.reduce((sum, d) => sum + d.latency, 0) / (secondHalf.length || 1);
  const trendPercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(trendPercent) > 5) {
    trend = trendPercent > 0 ? 'up' : 'down';
  }

  return {
    avg: Number(avg.toFixed(1)),
    min: Number(min.toFixed(1)),
    max: Number(max.toFixed(1)),
    p50: Number(p50.toFixed(1)),
    p95: Number(p95.toFixed(1)),
    p99: Number(p99.toFixed(1)),
    anomalyCount,
    anomalyPercent: Number(anomalyPercent.toFixed(1)),
    trend,
    trendPercent: Number(trendPercent.toFixed(1)),
  };
}

function findAnomalyPeriods(data: LatencyDataPoint[]): { start: number; end: number }[] {
  const periods: { start: number; end: number }[] = [];
  let currentStart = -1;

  data.forEach((d, i) => {
    if (d.isAnomaly) {
      if (currentStart === -1) {
        currentStart = i;
      }
    } else {
      if (currentStart !== -1) {
        periods.push({ start: currentStart, end: i - 1 });
        currentStart = -1;
      }
    }
  });

  if (currentStart !== -1) {
    periods.push({ start: currentStart, end: data.length - 1 });
  }

  return periods;
}

export function LatencyTrendMiniChart({
  data,
  oracleName,
  className = '',
  height = 300,
  anomalyThreshold = 200,
  timeRange = '1h',
  onTimeRangeChange,
}: LatencyTrendMiniChartProps) {
  const t = useTranslations();
  const [selectedRange, setSelectedRange] = useState(timeRange);

  const stats = useMemo(() => calculateTrendStats(data), [data]);
  const anomalyPeriods = useMemo(() => findAnomalyPeriods(data), [data]);

  const timeRangeOptions: { value: '1h' | '6h' | '24h' | '7d'; label: string }[] = [
    { value: '1h', label: t('charts.trend.timeRange1h') },
    { value: '6h', label: t('charts.trend.timeRange6h') },
    { value: '24h', label: t('charts.trend.timeRange24h') },
    { value: '7d', label: t('charts.trend.timeRange7d') },
  ];

  const handleRangeChange = (range: '1h' | '6h' | '24h' | '7d') => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: LatencyDataPoint }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload;

    return (
      <div
        className="bg-white border border-gray-200 rounded-lg p-3 min-w-[160px]"
        style={{ boxShadow: `0 4px 6px -1px ${baseColors.gray[900]}1A` }}
      >
        <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('charts.trend.latency')}:</span>
            <span
              className={`text-sm font-semibold ${
                point.isAnomaly
                  ? `text-[${semanticColors.danger.DEFAULT}]`
                  : `text-[${baseColors.primary[600]}]`
              }`}
            >
              {point.latency}ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('charts.trend.status')}:</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                point.isAnomaly
                  ? `bg-[${semanticColors.danger.light}] text-[${semanticColors.danger.text}]`
                  : `bg-[${semanticColors.success.light}] text-[${semanticColors.success.text}]`
              }`}
            >
              {point.isAnomaly ? t('charts.trend.abnormal') : t('charts.trend.normal')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderAnomalyAreas = () => {
    return anomalyPeriods.map((period, index) => (
      <ReferenceArea
        key={index}
        x1={data[period.start]?.timestamp}
        x2={data[period.end]?.timestamp}
        y1={anomalyThreshold}
        y2={stats.max * 1.1}
        fill={semanticColors.danger.light}
        fillOpacity={0.5}
      />
    ));
  };

  if (data.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 p-5 ${className}`}>
        <div className="text-center py-10">
          <p className="text-gray-500">{t('charts.trend.noData')}</p>
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
              {t('charts.trend.title')} - {oracleName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('charts.trend.subtitle')}</p>
          </div>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">{t('charts.trend.timeRange')}:</span>
        <div className="flex bg-gray-100 p-1">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleRangeChange(option.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedRange === option.value
                  ? 'bg-white text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-primary-50 p-4">
          <p className="text-xs text-primary-600 mb-1">{t('charts.trend.avgLatency')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary-700">{stats.avg}</span>
            <span className="text-sm text-primary-500">ms</span>
          </div>
        </div>
        <div className="bg-success-50 p-4">
          <p className="text-xs text-success-600 mb-1">P95</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-success-700">{stats.p95}</span>
            <span className="text-sm text-success-500">ms</span>
          </div>
        </div>
        <div
          className={`p-4 ${
            stats.trend === 'up'
              ? 'bg-danger-50'
              : stats.trend === 'down'
                ? 'bg-success-50'
                : 'bg-gray-50'
          }`}
        >
          <p
            className={`text-xs mb-1 ${
              stats.trend === 'up'
                ? 'text-danger-600'
                : stats.trend === 'down'
                  ? 'text-success-600'
                  : 'text-gray-600'
            }`}
          >
            {t('charts.trend.trend')}
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold ${
                stats.trend === 'up'
                  ? 'text-danger-700'
                  : stats.trend === 'down'
                    ? 'text-success-700'
                    : 'text-gray-700'
              }`}
            >
              {stats.trendPercent > 0 ? '+' : ''}
              {stats.trendPercent}%
            </span>
          </div>
        </div>
        <div className="bg-danger-50 p-4">
          <p className="text-xs text-danger-600 mb-1">{t('charts.trend.anomalies')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-danger-700">{stats.anomalyCount}</span>
            <span className="text-sm text-danger-500">({stats.anomalyPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900">{t('charts.trend.chartTitle')}</h4>
          <p className="text-xs text-gray-500 mt-1">{t('charts.trend.chartDesc')}</p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              dataKey="timestamp"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              minTickGap={30}
            />
            <YAxis
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              tickFormatter={(value) => `${value}ms`}
              domain={[0, 'auto']}
            />
            <RechartsTooltip content={<CustomTooltip />} />

            {/* Anomaly areas */}
            {renderAnomalyAreas()}

            {/* Threshold line */}
            <ReferenceLine
              y={anomalyThreshold}
              stroke={semanticColors.danger.DEFAULT}
              strokeDasharray="5 5"
              label={{
                value: `${t('charts.trend.threshold')} (${anomalyThreshold}ms)`,
                position: 'right',
                fill: semanticColors.danger.DEFAULT,
                fontSize: 10,
              }}
            />

            {/* Average line */}
            <ReferenceLine
              y={stats.avg}
              stroke={chartColors.recharts.primary}
              strokeDasharray="3 3"
              label={{
                value: `${t('charts.trend.avg')} (${stats.avg}ms)`,
                position: 'left',
                fill: chartColors.recharts.primary,
                fontSize: 10,
              }}
            />

            {/* Latency line */}
            <Line
              type="monotone"
              dataKey="latency"
              stroke={chartColors.recharts.primary}
              strokeWidth={2}
              dot={(props: { payload?: LatencyDataPoint; cx?: number; cy?: number }) => {
                const { payload, cx, cy } = props;
                if (!payload || cx === undefined || cy === undefined) return null;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.isAnomaly ? 4 : 2}
                    fill={
                      payload.isAnomaly
                        ? semanticColors.danger.DEFAULT
                        : chartColors.recharts.primary
                    }
                    stroke={chartColors.recharts.white}
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={{
                r: 6,
                fill: chartColors.recharts.primary,
                stroke: chartColors.recharts.white,
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: chartColors.recharts.primary }}
            />
            <span className="text-xs text-gray-500">{t('charts.trend.latencyLine')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3" style={{ backgroundColor: semanticColors.danger.DEFAULT }} />
            <span className="text-xs text-gray-500">{t('charts.trend.anomalyPoint')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-3 rounded"
              style={{ backgroundColor: semanticColors.danger.light }}
            />
            <span className="text-xs text-gray-500">{t('charts.trend.anomalyArea')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-0.5 rounded"
              style={{ borderTop: `2px dashed ${semanticColors.danger.DEFAULT}` }}
            />
            <span className="text-xs text-gray-500">{t('charts.trend.threshold')}</span>
          </div>
        </div>
      </div>

      {/* Anomaly Summary */}
      {stats.anomalyCount > 0 && (
        <div className="bg-danger-50 border border-danger-200 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-danger-800 mb-1">
                {t('charts.trend.anomalyAlert')}
              </h4>
              <p className="text-xs text-danger-700">
                {t('charts.trend.anomalyDesc', {
                  count: stats.anomalyCount,
                  percent: stats.anomalyPercent,
                  threshold: anomalyThreshold,
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { LatencyTrendMiniChartProps, LatencyDataPoint };
