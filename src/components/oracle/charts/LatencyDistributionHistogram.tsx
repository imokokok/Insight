'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { chartColors, baseColors, semanticColors, shadowColors } from '@/lib/config/colors';
import { CDFChart } from './CDFChart';
import { LatencyTrendMiniChart } from './LatencyTrendMiniChart';
import type { LatencyDataPoint } from './LatencyTrendMiniChart';


type ViewMode = 'histogram' | 'cdf' | 'trend';
type TimeRange = '1h' | '6h' | '24h' | '7d';

interface LatencyDistributionHistogramProps {
  data: number[];
  oracleName?: string;
  className?: string;
  trendData?: LatencyDataPoint[];
  anomalyThreshold?: number;
}

interface HistogramBin {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

interface LatencyStats {
  avg: number;
  min: number;
  max: number;
  median: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
  totalSamples: number;
}

function calculatePercentile(sortedData: number[], percentile: number): number {
  if (sortedData.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedData.length) - 1;
  return sortedData[Math.max(0, Math.min(index, sortedData.length - 1))];
}

function calculateStats(data: number[]): LatencyStats {
  if (data.length === 0) {
    return {
      avg: 0,
      min: 0,
      max: 0,
      median: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      totalSamples: 0,
    };
  }

  const sortedData = [...data].sort((a, b) => a - b);
  const sum = sortedData.reduce((acc, val) => acc + val, 0);
  const avg = sum / sortedData.length;
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const median = calculatePercentile(sortedData, 50);
  const p50 = calculatePercentile(sortedData, 50);
  const p95 = calculatePercentile(sortedData, 95);
  const p99 = calculatePercentile(sortedData, 99);
  const variance =
    sortedData.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / sortedData.length;
  const stdDev = Math.sqrt(variance);

  return {
    avg: Math.round(avg),
    min: Math.round(min),
    max: Math.round(max),
    median: Math.round(median),
    p50: Math.round(p50),
    p95: Math.round(p95),
    p99: Math.round(p99),
    stdDev: Math.round(stdDev),
    totalSamples: sortedData.length,
  };
}

function createHistogramBins(data: number[], bucketSize: number = 50): HistogramBin[] {
  if (data.length === 0) return [];

  const minVal = Math.floor(Math.min(...data) / bucketSize) * bucketSize;
  const maxVal = Math.ceil(Math.max(...data) / bucketSize) * bucketSize;
  const bins: HistogramBin[] = [];

  for (let i = minVal; i < maxVal; i += bucketSize) {
    bins.push({
      range: `${i}-${i + bucketSize}`,
      min: i,
      max: i + bucketSize,
      count: 0,
      percentage: 0,
    });
  }

  data.forEach((value) => {
    const binIndex = Math.floor((value - minVal) / bucketSize);
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].count++;
    }
  });

  const totalCount = data.length;
  bins.forEach((bin) => {
    bin.percentage = (bin.count / totalCount) * 100;
  });

  return bins;
}

function getBarColorByLatency(minLatency: number): string {
  if (minLatency < 100) return semanticColors.success.DEFAULT;
  if (minLatency < 200) return chartColors.recharts.primary;
  if (minLatency < 300) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
}

// Generate mock trend data if not provided
function generateMockTrendData(
  baseData: number[],
  timeRange: TimeRange,
  anomalyThreshold: number
): LatencyDataPoint[] {
  const now = new Date();
  const data: LatencyDataPoint[] = [];

  const pointsCount = {
    '1h': 60,
    '6h': 72,
    '24h': 96,
    '7d': 84,
  }[timeRange];

  const intervalMinutes = {
    '1h': 1,
    '6h': 5,
    '24h': 15,
    '7d': 120,
  }[timeRange];

  const baseLatency =
    baseData.length > 0 ? baseData.reduce((a, b) => a + b, 0) / baseData.length : 100;

  for (let i = pointsCount - 1; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setMinutes(timestamp.getMinutes() - i * intervalMinutes);

    const minute = timestamp.getMinutes();
    const hour = timestamp.getHours();

    let latency: number;
    const random = Math.random();

    if (random > 0.92) {
      latency = baseLatency + 150 + Math.random() * 100;
    } else if (random > 0.85) {
      latency = baseLatency + 80 + Math.random() * 50;
    } else {
      const timeFactor = hour >= 9 && hour <= 17 ? 1.2 : 0.9;
      latency = baseLatency + (Math.random() - 0.5) * 60 * timeFactor;
    }

    latency = Math.max(20, latency);
    const isAnomaly = latency > anomalyThreshold;

    const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    data.push({
      timestamp: label,
      latency: Number(latency.toFixed(1)),
      isAnomaly,
      fullTimestamp: timestamp,
    });
  }

  return data;
}

export function LatencyDistributionHistogram({
  data,
  oracleName,
  className = '',
  trendData: externalTrendData,
  anomalyThreshold = 200,
}: LatencyDistributionHistogramProps) {
  const t = useTranslations();
  const [currentView, setCurrentView] = useState<ViewMode>('histogram');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  const stats = useMemo(() => calculateStats(data), [data]);
  const histogramData = useMemo(() => createHistogramBins(data, 50), [data]);

  // Generate or use provided trend data
  const trendData = useMemo(() => {
    if (externalTrendData) return externalTrendData;
    return generateMockTrendData(data, timeRange, anomalyThreshold);
  }, [externalTrendData, data, timeRange, anomalyThreshold]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  const viewOptions: { value: ViewMode; label: string; icon: string }[] = [
    { value: 'histogram', label: t('charts.latencyDistribution.histogram'), icon: '📊' },
    { value: 'cdf', label: 'CDF', icon: '📈' },
    { value: 'trend', label: t('charts.latencyDistribution.trend'), icon: '📉' },
  ];

  const formatTooltip = (bin: HistogramBin) => {
    return (
      <div
        className="bg-white border border-gray-200 p-3"
        style={{ boxShadow: shadowColors.tooltip }}
      >
        <p className="text-xs text-gray-600 font-medium mb-2">范围: {bin.range}ms</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">数量:</span>
            <span className="text-gray-900 font-mono">{bin.count}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">百分比:</span>
            <span className="text-gray-900 font-mono">{bin.percentage.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const percentileItems = [
    {
      label: 'P50',
      value: stats.p50,
      color: semanticColors.success.DEFAULT,
      desc: t('crossOracle.latencyDistribution.tooltip.p50Desc'),
    },
    {
      label: 'P95',
      value: stats.p95,
      color: semanticColors.warning.DEFAULT,
      desc: t('crossOracle.latencyDistribution.tooltip.p95Desc'),
    },
    {
      label: 'P99',
      value: stats.p99,
      color: semanticColors.danger.DEFAULT,
      desc: t('crossOracle.latencyDistribution.tooltip.p99Desc'),
    },
  ];

  const statItems = [
    { label: t('crossOracle.latencyDistribution.avgLatency'), value: `${stats.avg}ms`, icon: '📊' },
    { label: t('crossOracle.latencyDistribution.p50'), value: `${stats.median}ms`, icon: '📍' },
    { label: t('crossOracle.latencyDistribution.minLatency'), value: `${stats.min}ms`, icon: '⬇️' },
    { label: t('crossOracle.latencyDistribution.maxLatency'), value: `${stats.max}ms`, icon: '⬆️' },
    { label: t('crossOracle.latencyDistribution.stdDev'), value: `${stats.stdDev}ms`, icon: '📐' },
    {
      label: t('crossOracle.latencyDistribution.samples'),
      value: stats.totalSamples.toLocaleString(),
      icon: '🔢',
    },
  ];

  if (data.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 p-5 ${className}`}>
        <div className="text-center py-10">
          <p className="text-gray-500">暂无数据</p>
        </div>
      </div>
    );
  }

  const renderHistogramView = () => (
    <>
      <div className="bg-white border border-gray-200 p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.latencyDistribution.title')}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {t('crossOracle.latencyDistribution.subtitle')}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              vertical={false}
            />
            <XAxis
              dataKey="range"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              tickFormatter={(value) => `${value}%`}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const bin = payload[0].payload as HistogramBin;
                return formatTooltip(bin);
              }}
            />
            <ReferenceLine
              x={stats.p50.toString()}
              stroke={semanticColors.success.DEFAULT}
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'P50',
                position: 'top',
                fill: semanticColors.success.DEFAULT,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              x={stats.p95.toString()}
              stroke={semanticColors.warning.DEFAULT}
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'P95',
                position: 'top',
                fill: semanticColors.warning.DEFAULT,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              x={stats.p99.toString()}
              stroke={semanticColors.danger.DEFAULT}
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'P99',
                position: 'top',
                fill: semanticColors.danger.DEFAULT,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Bar dataKey="percentage">
              {histogramData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColorByLatency(entry.min)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: semanticColors.success.DEFAULT }}
            />
            <span className="text-xs text-gray-500">0-100ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.primary }}
            />
            <span className="text-xs text-gray-500">100-200ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: semanticColors.warning.DEFAULT }}
            />
            <span className="text-xs text-gray-500">200-300ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: semanticColors.danger.DEFAULT }}
            />
            <span className="text-xs text-gray-500">300ms+</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {oracleName && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('crossOracle.latencyDistribution.title')} - {oracleName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('crossOracle.latencyDistribution.subtitle')}
            </p>
          </div>
        )}

        {/* View Switcher */}
        <div className="flex bg-gray-100 p-1">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setCurrentView(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
                currentView === option.value
                  ? 'bg-white text-gray-900 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Percentile Cards - Always visible */}
      <div className="grid grid-cols-3 gap-4">
        {percentileItems.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-200 p-4 overflow-hidden group relative"
            style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
            title={`${item.label}: ${item.value}ms - ${item.desc}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                {item.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1 overflow-hidden">
              <span className="text-2xl font-bold text-gray-900 truncate">{item.value}</span>
              <span className="text-sm text-gray-500 flex-shrink-0">ms</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 truncate">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Statistics Grid - Always visible */}
      <div className="grid grid-cols-6 gap-3">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-200 p-3 text-center overflow-hidden"
            title={`${item.label}: ${item.value}`}
          >
            <span className="text-xl mb-1 block">{item.icon}</span>
            <p className="text-xs text-gray-500 mb-1 truncate">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* View Content */}
      {currentView === 'histogram' && renderHistogramView()}

      {currentView === 'cdf' && (
        <CDFChart data={data} oracleName={oracleName} height={350} showPercentileLabels />
      )}

      {currentView === 'trend' && (
        <LatencyTrendMiniChart
          data={trendData}
          oracleName={oracleName}
          height={300}
          anomalyThreshold={anomalyThreshold}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
        />
      )}
    </div>
  );
}

export type { LatencyDistributionHistogramProps, HistogramBin, LatencyStats, LatencyDataPoint };
