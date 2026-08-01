'use client';

import { useMemo } from 'react';

import { Activity, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import type { ReputationTrendPoint } from '@/lib/oracles/services/reputationService';

export function TrendCharts({
  trend,
  providerColor,
}: {
  trend: ReputationTrendPoint[];
  providerColor: string;
}) {
  const chartData = useMemo(
    () =>
      trend.map((p) => ({
        date: p.snapshot_time,
        successRate: Number(p.success_rate.toFixed(1)),
        deviation: Number(p.avg_deviation_pct.toFixed(4)),
        latency: p.avg_latency_ms,
        queries: p.query_count,
      })),
    [trend]
  );

  if (trend.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-black text-gray-900">Performance Trend</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <Activity className="w-10 h-10 mb-3 text-gray-300" />
          <p className="text-sm font-bold">
            Trend charts appear after accumulating multiple data points
          </p>
          <p className="text-xs text-gray-300 mt-1">Data is collected every hour</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-sm font-black text-gray-900">Performance Trend</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
          {trend.length} data points
        </span>
      </div>

      <div className="space-y-6">
        <TrendArea
          title="Success Rate"
          data={chartData}
          dataKey="successRate"
          color="#10b981"
          gradientId="sG"
          yDomain={[0, 100]}
          unit="%"
        />
        <TrendArea
          title="Avg Deviation (%)"
          data={chartData}
          dataKey="deviation"
          color="#f59e0b"
          gradientId="dG"
          unit="%"
        />
        <TrendLine
          title="Avg Latency (ms)"
          data={chartData}
          dataKey="latency"
          color={providerColor}
          unit="ms"
        />
      </div>
    </div>
  );
}

function TrendArea({
  title,
  data,
  dataKey,
  color,
  gradientId,
  yDomain,
  unit,
}: {
  title: string;
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color: string;
  gradientId: string;
  yDomain?: [number, number];
  unit: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.12} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <RechartsTooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            formatter={(value) => [`${value}${unit}`, '']}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            name={title}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendLine({
  title,
  data,
  dataKey,
  color,
  unit,
}: {
  title: string;
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color: string;
  unit: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <RechartsTooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            formatter={(value) => [`${value}${unit}`, '']}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2.5, fill: color, strokeWidth: 1.5, stroke: '#fff' }}
            name={title}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
