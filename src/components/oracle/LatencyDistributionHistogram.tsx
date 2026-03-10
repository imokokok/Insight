'use client';

import { useMemo } from 'react';
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
import { useI18n } from '@/lib/i18n/context';

interface LatencyDistributionHistogramProps {
  data: number[];
  oracleName?: string;
  className?: string;
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
  if (minLatency < 100) return '#10b981';
  if (minLatency < 200) return '#3b82f6';
  if (minLatency < 300) return '#f59e0b';
  return '#f43f5e';
}

export function LatencyDistributionHistogram({
  data,
  oracleName,
  className = '',
}: LatencyDistributionHistogramProps) {
  const { t } = useI18n();

  const stats = useMemo(() => calculateStats(data), [data]);
  const histogramData = useMemo(() => createHistogramBins(data, 50), [data]);

  const formatTooltip = (bin: HistogramBin) => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gray-600 font-medium mb-2">
          {t('latencyDistribution.range')}: {bin.range}ms
        </p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('latencyDistribution.count')}:</span>
            <span className="text-gray-900 font-mono">{bin.count}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('latencyDistribution.percentage')}:</span>
            <span className="text-gray-900 font-mono">{bin.percentage.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const percentileItems = [
    { label: 'P50', value: stats.p50, color: '#10b981', desc: t('latencyDistribution.p50Desc') },
    { label: 'P95', value: stats.p95, color: '#f59e0b', desc: t('latencyDistribution.p95Desc') },
    { label: 'P99', value: stats.p99, color: '#f43f5e', desc: t('latencyDistribution.p99Desc') },
  ];

  const statItems = [
    { label: t('latencyDistribution.avg'), value: `${stats.avg}ms`, icon: '📊' },
    { label: t('latencyDistribution.median'), value: `${stats.median}ms`, icon: '📍' },
    { label: t('latencyDistribution.min'), value: `${stats.min}ms`, icon: '⬇️' },
    { label: t('latencyDistribution.max'), value: `${stats.max}ms`, icon: '⬆️' },
    { label: t('latencyDistribution.stdDev'), value: `${stats.stdDev}ms`, icon: '📐' },
    {
      label: t('latencyDistribution.samples'),
      value: stats.totalSamples.toLocaleString(),
      icon: '🔢',
    },
  ];

  if (data.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
        <div className="text-center py-10">
          <p className="text-gray-500">{t('latencyDistribution.noData')}</p>
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
              {t('latencyDistribution.title')} - {oracleName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('latencyDistribution.subtitle')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {percentileItems.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-200 rounded-xl p-4"
            style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                {item.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{item.value}</span>
              <span className="text-sm text-gray-500">ms</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-3">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-200 rounded-xl p-3 text-center"
          >
            <span className="text-xl mb-1 block">{item.icon}</span>
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900">
            {t('latencyDistribution.histogramTitle')}
          </h4>
          <p className="text-xs text-gray-500 mt-1">{t('latencyDistribution.histogramDesc')}</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="range"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const bin = payload[0].payload as HistogramBin;
                return formatTooltip(bin);
              }}
            />
            <ReferenceLine
              x={stats.p50.toString()}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'P50',
                position: 'top',
                fill: '#10b981',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              x={stats.p95.toString()}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'P95',
                position: 'top',
                fill: '#f59e0b',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              x={stats.p99.toString()}
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'P99',
                position: 'top',
                fill: '#f43f5e',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColorByLatency(entry.min)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-xs text-gray-500">0-100ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-xs text-gray-500">100-200ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded" />
            <span className="text-xs text-gray-500">200-300ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-xs text-gray-500">300ms+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { LatencyDistributionHistogramProps, HistogramBin, LatencyStats };
