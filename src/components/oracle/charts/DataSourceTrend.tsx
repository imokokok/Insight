'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { TooltipProps } from '@/lib/types/recharts';

interface TrendDataPoint {
  month: string;
  monthShort: string;
  newSources: number;
  cumulative: number;
}

const mockTrendData: TrendDataPoint[] = [
  { month: '2025-03', monthShort: '3月', newSources: 18, cumulative: 380 },
  { month: '2025-04', monthShort: '4月', newSources: 22, cumulative: 402 },
  { month: '2025-05', monthShort: '5月', newSources: 15, cumulative: 417 },
  { month: '2025-06', monthShort: '6月', newSources: 28, cumulative: 445 },
  { month: '2025-07', monthShort: '7月', newSources: 32, cumulative: 477 },
  { month: '2025-08', monthShort: '8月', newSources: 25, cumulative: 502 },
  { month: '2025-09', monthShort: '9月', newSources: 20, cumulative: 522 },
  { month: '2025-10', monthShort: '10月', newSources: 18, cumulative: 540 },
  { month: '2025-11', monthShort: '11月', newSources: 24, cumulative: 564 },
  { month: '2025-12', monthShort: '12月', newSources: 30, cumulative: 594 },
  { month: '2026-01', monthShort: '1月', newSources: 35, cumulative: 629 },
  { month: '2026-02', monthShort: '2月', newSources: 28, cumulative: 657 },
];

const CustomTooltip = ({ active, payload, label }: TooltipProps<TrendDataPoint>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-600">新增数据源:</span>
            <span className="text-xs font-semibold text-gray-900">{payload[0].value}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">累计数据源:</span>
            <span className="text-xs font-semibold text-gray-900">{payload[1].value}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function DataSourceTrend() {
  const stats = useMemo(() => {
    const totalNew = mockTrendData.reduce((sum, item) => sum + item.newSources, 0);
    const avgMonthly = Math.round(totalNew / mockTrendData.length);
    const lastMonth = mockTrendData[mockTrendData.length - 1];
    const prevMonth = mockTrendData[mockTrendData.length - 2];
    const growth = prevMonth
      ? (((lastMonth.newSources - prevMonth.newSources) / prevMonth.newSources) * 100).toFixed(1)
      : '0';

    return {
      totalNew,
      avgMonthly,
      lastMonthNew: lastMonth.newSources,
      growth: parseFloat(growth),
      currentTotal: lastMonth.cumulative,
    };
  }, []);

  return (
    <DashboardCard title="数据源增长趋势">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">本年新增</p>
            <p className="text-xl font-bold text-purple-700">{stats.totalNew}</p>
            <p className="text-xs text-purple-600 mt-0.5">数据源</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">月均新增</p>
            <p className="text-xl font-bold text-blue-700">{stats.avgMonthly}</p>
            <p className="text-xs text-blue-600 mt-0.5">数据源</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">环比增长</p>
            <p className="text-xl font-bold text-green-700">
              {stats.growth >= 0 ? '+' : ''}
              {stats.growth}%
            </p>
            <p className="text-xs text-green-600 mt-0.5">较上月</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="monthShort"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="newSources"
                name="新增数据源"
                stroke="#8B5CF6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNew)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="累计数据源"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCumulative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-gray-600">新增数据源</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600">累计数据源</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">当前总计</p>
            <p className="text-sm font-bold text-gray-900">{stats.currentTotal} 数据源</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
