'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Dot,
} from 'recharts';
import { DashboardCard } from './DashboardCard';
import { TooltipProps, CustomDotProps } from '@/lib/types/recharts';

interface LatencyDataPoint {
  timestamp: string;
  latency: number;
  isAnomaly: boolean;
  fullTimestamp: Date;
}

interface LatencyTrendChartProps {
  symbol?: string;
  className?: string;
  anomalyThreshold?: number;
}

function generateMockLatencyData(threshold: number): LatencyDataPoint[] {
  const now = new Date();
  const data: LatencyDataPoint[] = [];
  const baseLatency = 80;
  const normalVariance = 30;

  for (let i = 59; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setMinutes(timestamp.getMinutes() - i);

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
      latency = baseLatency + (Math.random() - 0.5) * normalVariance * timeFactor;
    }

    latency = Math.max(20, latency);
    const isAnomaly = latency > threshold;

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

function downsampleLatencyData(
  data: LatencyDataPoint[],
  targetPoints: number = 50
): LatencyDataPoint[] {
  if (data.length <= targetPoints) {
    return data;
  }

  const step = Math.ceil(data.length / targetPoints);
  const result: LatencyDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    const chunk = data.slice(i, Math.min(i + step, data.length));

    let maxLatencyPoint = chunk[0];
    let minLatencyPoint = chunk[0];

    for (const point of chunk) {
      if (point.latency > maxLatencyPoint.latency) {
        maxLatencyPoint = point;
      }
      if (point.latency < minLatencyPoint.latency) {
        minLatencyPoint = point;
      }
    }

    if (!result.includes(maxLatencyPoint)) {
      result.push(maxLatencyPoint);
    }

    if (
      chunk.length > 2 &&
      minLatencyPoint !== maxLatencyPoint &&
      !result.includes(minLatencyPoint)
    ) {
      result.push(minLatencyPoint);
    }

    const middleIndex = Math.floor(chunk.length / 2);
    const middlePoint = chunk[middleIndex];
    if (middlePoint && !result.includes(middlePoint) && result.length < targetPoints) {
      result.push(middlePoint);
    }
  }

  const lastPoint = data[data.length - 1];
  if (!result.includes(lastPoint)) {
    result.push(lastPoint);
  }

  return result.sort((a, b) => a.fullTimestamp.getTime() - b.fullTimestamp.getTime());
}

function CustomDot({ cx, cy, payload }: CustomDotProps<LatencyDataPoint>) {
  if (payload?.isAnomaly) {
    return <Dot cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#FFF" strokeWidth={2} />;
  }
  return <Dot cx={cx} cy={cy} r={3} fill="#3B82F6" stroke="#FFF" strokeWidth={2} />;
}

export function LatencyTrendChart({
  symbol,
  className,
  anomalyThreshold = 200,
}: LatencyTrendChartProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const data = useMemo(() => {
    const rawData = generateMockLatencyData(anomalyThreshold);
    return downsampleLatencyData(rawData, 50);
  }, [anomalyThreshold]);

  const maxLatency = useMemo(() => {
    return Math.max(...data.map((d) => d.latency));
  }, [data]);

  const stats = useMemo(() => {
    const latencies = data.map((d) => d.latency);
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    const anomalyCount = data.filter((d) => d.isAnomaly).length;
    const anomalyDataPoints = data.filter((d) => d.isAnomaly);

    let longestAnomalyDuration = 0;
    let currentDuration = 0;
    const anomalyPeriods: { start: number; end: number }[] = [];
    let currentStart = -1;

    data.forEach((d, i) => {
      if (d.isAnomaly) {
        if (currentStart === -1) {
          currentStart = i;
        }
        currentDuration++;
      } else {
        if (currentStart !== -1) {
          anomalyPeriods.push({ start: currentStart, end: i - 1 });
          if (currentDuration > longestAnomalyDuration) {
            longestAnomalyDuration = currentDuration;
          }
        }
        currentStart = -1;
        currentDuration = 0;
      }
    });

    if (currentStart !== -1) {
      anomalyPeriods.push({ start: currentStart, end: data.length - 1 });
      if (currentDuration > longestAnomalyDuration) {
        longestAnomalyDuration = currentDuration;
      }
    }

    return {
      avg: Number(avg.toFixed(1)),
      max: Number(max.toFixed(1)),
      min: Number(min.toFixed(1)),
      anomalyCount,
      anomalyPercent: Number(((anomalyCount / data.length) * 100).toFixed(1)),
      longestAnomalyDuration,
      anomalyPeriods,
      anomalyDataPoints,
    };
  }, [data]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<LatencyDataPoint>) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[180px]">
        <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">延迟</span>
            <span
              className={`text-sm font-bold ${
                dataPoint.isAnomaly ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {dataPoint.latency} ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">异常阈值</span>
            <span className="text-xs text-gray-700">{anomalyThreshold} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">状态</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                dataPoint.isAnomaly ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {dataPoint.isAnomaly ? '异常' : '正常'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderAnomalyAreas = () => {
    return stats.anomalyPeriods.map((period, index) => (
      <ReferenceArea
        key={index}
        x1={data[period.start]?.timestamp}
        x2={data[period.end]?.timestamp}
        y1={anomalyThreshold}
        y2={maxLatency}
        fill="#FEE2E2"
        fillOpacity={0.5}
      />
    ));
  };

  return (
    <DashboardCard
      title="价格更新延迟趋势"
      headerAction={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-500">延迟异常</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <svg
              className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">平均延迟</p>
            <p className="text-xl font-bold text-blue-700">
              {stats.avg}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">最小延迟</p>
            <p className="text-xl font-bold text-green-700">
              {stats.min}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 mb-1">最大延迟</p>
            <p className="text-xl font-bold text-orange-700">
              {stats.max}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 mb-1">异常次数</p>
            <p className="text-xl font-bold text-red-700">
              {stats.anomalyCount}
              <span className="text-sm font-normal text-red-500 ml-1">
                ({stats.anomalyPercent}%)
              </span>
            </p>
          </div>
        </div>

        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                minTickGap={15}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => `${value}`}
                domain={[0, 'auto']}
                width={50}
                label={{
                  value: 'ms',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9ca3af',
                  fontSize: 11,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {renderAnomalyAreas()}
              <ReferenceLine
                y={anomalyThreshold}
                stroke="#EF4444"
                strokeDasharray="5 5"
                label={{
                  value: `异常阈值 (${anomalyThreshold}ms)`,
                  position: 'right',
                  fill: '#EF4444',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={stats.avg}
                stroke="#3B82F6"
                strokeDasharray="3 3"
                label={{
                  value: `平均 (${stats.avg}ms)`,
                  position: 'left',
                  fill: '#3B82F6',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 5, fill: '#3B82F6', stroke: '#FFF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {stats.anomalyCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
                <h4 className="text-sm font-semibold text-red-800 mb-1">检测到延迟异常</h4>
                <p className="text-xs text-red-700">
                  在过去1小时内，有 {stats.anomalyCount} 个数据点（{stats.anomalyPercent}
                  %）的延迟超过了 {anomalyThreshold}ms 阈值。 最长异常持续时间为{' '}
                  {stats.longestAnomalyDuration} 分钟。
                  高延迟可能导致价格更新不及时，影响交易决策的准确性。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-1">关于价格更新延迟</h4>
          <p className="text-xs text-blue-800">
            价格更新延迟反映了 Pyth Network 预言机从数据源获取价格更新到链上可用的时间。
            正常情况下延迟应保持在 200ms 以下。当延迟异常升高时，可能表示网络拥堵、
            数据源响应缓慢或系统负载过高，建议关注异常时段并评估对应用的影响。
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
