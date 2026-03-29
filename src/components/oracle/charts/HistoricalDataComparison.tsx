'use client';

import { useState, useMemo, useCallback } from 'react';

import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  TrendingUp,
  Layers,
  MoreHorizontal,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { motion } from 'framer-motion';

import { chartColors, semanticColors } from '@/lib/config/colors';

function formatValue(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface DataSeries {
  id: string;
  name: string;
  color: string;
  data: DataPoint[];
  type: 'price' | 'volume' | 'latency' | 'accuracy';
}

export interface HistoricalDataComparisonProps {
  dataSeries: DataSeries[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const presetRanges = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
  { label: '90d', hours: 24 * 90 },
  { label: '1y', hours: 24 * 365 },
];

const seriesColors = [
  chartColors.recharts.primary,
  chartColors.recharts.purple,
  chartColors.recharts.cyan,
  chartColors.recharts.pink,
  chartColors.recharts.success,
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[200px]"
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.name}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatValue(item.value, 4)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function HistoricalDataComparison({
  dataSeries,
  timeRange,
  onTimeRangeChange,
}: HistoricalDataComparisonProps) {
  const [zoomDomain, setZoomDomain] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set(dataSeries.map((s) => s.id)));
  const [showBrush, setShowBrush] = useState(false);

  const mergedData = useMemo(() => {
    const allTimestamps = new Set<number>();
    dataSeries.forEach((series) => {
      series.data.forEach((point) => allTimestamps.add(point.timestamp));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    return sortedTimestamps.map((timestamp) => {
      const point: Record<string, number | string> = {
        timestamp,
        time: new Date(timestamp * 1000).toLocaleString(),
      };

      dataSeries.forEach((series) => {
        const dataPoint = series.data.find((d) => d.timestamp === timestamp);
        point[series.id] = dataPoint?.value ?? null;
      });

      return point;
    });
  }, [dataSeries]);

  const stats = useMemo(() => {
    return dataSeries.map((series) => {
      const values = series.data.map((d) => d.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const latest = values[values.length - 1];
      const first = values[0];
      const change = first !== 0 ? ((latest - first) / first) * 100 : 0;

      return {
        id: series.id,
        name: series.name,
        min,
        max,
        avg,
        latest,
        change,
      };
    });
  }, [dataSeries]);

  const handlePresetRange = useCallback(
    (hours: number) => {
      const end = new Date();
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
      onTimeRangeChange({ start, end, label: `${hours}h` });
    },
    [onTimeRangeChange]
  );

  const handleExport = useCallback(() => {
    const csvContent = [
      ['Timestamp', ...dataSeries.map((s) => s.name)].join(','),
      ...mergedData.map((row) =>
        [
          row.time,
          ...dataSeries.map((s) => (row[s.id] as number)?.toString() ?? ''),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${timeRange.label}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mergedData, dataSeries, timeRange.label]);

  const toggleSeries = (id: string) => {
    const newSelected = new Set(selectedSeries);
    if (newSelected.has(id)) {
      if (newSelected.size > 1) {
        newSelected.delete(id);
      }
    } else {
      newSelected.add(id);
    }
    setSelectedSeries(newSelected);
  };

  const visibleSeries = dataSeries.filter((s) => selectedSeries.has(s.id));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                历史数据对比
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dataSeries.length} 个数据系列 | {mergedData.length} 个数据点
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {presetRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => handlePresetRange(range.hours)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    timeRange.label === range.label
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowBrush(!showBrush)}
              className={`p-2 rounded-lg transition-colors ${
                showBrush
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="缩放选择"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setZoomDomain(null)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="重置缩放"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleExport}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="导出数据"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mergedData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.recharts.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.recharts.axis }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.recharts.axis }}
                    tickFormatter={(value) => formatValue(value, 2)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 20 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {showBrush && (
                    <Brush
                      dataKey="time"
                      height={30}
                      stroke={chartColors.recharts.primary}
                      fill={chartColors.recharts.primary}
                      fillOpacity={0.1}
                    />
                  )}
                  {visibleSeries.map((series, index) => (
                    <Line
                      key={series.id}
                      type="monotone"
                      dataKey={series.id}
                      name={series.name}
                      stroke={series.color || seriesColors[index % seriesColors.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              数据系列
            </h4>
            <div className="space-y-2">
              {dataSeries.map((series, index) => {
                const stat = stats.find((s) => s.id === series.id);
                const isSelected = selectedSeries.has(series.id);
                const color = series.color || seriesColors[index % seriesColors.length];

                return (
                  <button
                    key={series.id}
                    onClick={() => toggleSeries(series.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {series.name}
                        </span>
                      </div>
                      {stat && (
                        <span
                          className={`text-xs font-medium ${
                            stat.change >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {stat.change >= 0 ? '+' : ''}
                          {stat.change.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    {stat && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div>
                          <span className="block">最新</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatValue(stat.latest, 4)}
                          </span>
                        </div>
                        <div>
                          <span className="block">平均</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatValue(stat.avg, 4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {timeRange.start.toLocaleDateString()} - {timeRange.end.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoricalDataComparison;
