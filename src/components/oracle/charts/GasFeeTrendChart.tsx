'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { chartColors } from '@/lib/config/colors';


type TimeRange = '24H' | '7D' | '30D' | '90D';

interface GasFeeDataPoint {
  time: string;
  timestamp: number;
  gasFee: number;
  avgGasFee: number;
}

interface GasFeeTrendChartProps {
  height?: number;
}

function generateGasFeeData(timeRange: TimeRange): GasFeeDataPoint[] {
  const now = Date.now();
  const dataPoints: GasFeeDataPoint[] = [];

  let points: number;
  let interval: number;

  switch (timeRange) {
    case '24H':
      points = 24;
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case '7D':
      points = 7 * 4;
      interval = 6 * 60 * 60 * 1000; // 6 hours
      break;
    case '30D':
      points = 30;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
    case '90D':
      points = 90;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
  }

  // 基础Gas费用 (20-100 Gwei之间波动)
  const baseGasFee = 30 + Math.random() * 40;

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - i * interval;

    // 模拟Gas费用波动
    const hourOfDay = new Date(timestamp).getHours();
    const isPeakHour = hourOfDay >= 9 && hourOfDay <= 18;
    const peakMultiplier = isPeakHour ? 1.3 : 0.8;

    // 添加随机波动和趋势
    const randomFactor = 0.8 + Math.random() * 0.4;
    const trendFactor = 1 + Math.sin((i / points) * Math.PI) * 0.2;

    const adjustedGasFee = baseGasFee * peakMultiplier * randomFactor * trendFactor;

    let timeLabel: string;
    if (timeRange === '24H') {
      timeLabel = new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (timeRange === '7D') {
      timeLabel = new Date(timestamp).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = new Date(timestamp).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      gasFee: Math.round(adjustedGasFee * 100) / 100,
      avgGasFee: 0,
    });
  }

  const avgGasFee = dataPoints.reduce((sum, d) => sum + d.gasFee, 0) / dataPoints.length;
  return dataPoints.map((point) => ({
    ...point,
    avgGasFee: Math.round(avgGasFee * 100) / 100,
  }));
}

function analyzeTrend(data: GasFeeDataPoint[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.gasFee, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.gasFee, 0) / secondHalf.length;

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (changePercent > 5) return 'up';
  if (changePercent < -5) return 'down';
  return 'stable';
}

export function GasFeeTrendChart({ height = 250 }: GasFeeTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');

  const data = useMemo(() => generateGasFeeData(timeRange), [timeRange]);

  const stats = useMemo(() => {
    const gasFees = data.map((d) => d.gasFee);
    const avg = gasFees.reduce((sum, g) => sum + g, 0) / gasFees.length;
    const max = Math.max(...gasFees);
    const min = Math.min(...gasFees);

    const squaredDiffs = gasFees.map((g) => Math.pow(g - avg, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / gasFees.length;
    const stdDev = Math.sqrt(variance);

    return {
      avg: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
    };
  }, [data]);

  const trend = useMemo(() => analyzeTrend(data), [data]);
  const currentGasFee = data.length > 0 ? data[data.length - 1].gasFee : 0;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-danger-500' : trend === 'down' ? 'text-success-500' : 'text-gray-500';
  const trendText = trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定';

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div>
        <span className="text-sm font-medium text-gray-700">Gas 费用历史趋势</span>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
          <span>
            平均: <span className="font-medium text-gray-700">{stats.avg} Gwei</span>
          </span>
          <span>
            最高: <span className="font-medium text-danger-600">{stats.max} Gwei</span>
          </span>
          <span>
            最低: <span className="font-medium text-success-600">{stats.min} Gwei</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {(['24H', '7D', '30D', '90D'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === range
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>趋势: {trendText}</span>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardCard title="" headerAction={headerContent}>
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="gasFeeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.recharts.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.recharts.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              tickFormatter={(value) => `${value} Gwei`}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const gasFee = payload[0].value as number;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-sm font-bold text-primary-600">Gas费用: {gasFee} Gwei</p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={stats.avg}
              stroke={chartColors.recharts.axis}
              strokeDasharray="3 3"
              label={{
                value: `平均: ${stats.avg}`,
                position: 'right',
                fontSize: 10,
                fill: chartColors.recharts.tick,
              }}
            />
            <Area
              type="monotone"
              dataKey="gasFee"
              stroke={chartColors.recharts.primary}
              strokeWidth={2}
              fill="url(#gasFeeGradient)"
              name="Gas费用"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        <div className="bg-primary-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">当前</p>
          <p className="text-sm font-bold text-primary-600">{currentGasFee} Gwei</p>
        </div>
        <div className="bg-gray-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">平均</p>
          <p className="text-sm font-bold text-gray-700">{stats.avg} Gwei</p>
        </div>
        <div className="bg-danger-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">最高</p>
          <p className="text-sm font-bold text-danger-600">{stats.max} Gwei</p>
        </div>
        <div className="bg-success-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">最低</p>
          <p className="text-sm font-bold text-success-600">{stats.min} Gwei</p>
        </div>
      </div>
    </DashboardCard>
  );
}

export type { GasFeeDataPoint, TimeRange };
