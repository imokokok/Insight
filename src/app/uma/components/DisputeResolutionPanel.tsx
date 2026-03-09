'use client';

import { useEffect, useState, useCallback } from 'react';
import StatCard from '@/components/StatCard';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DisputeStats {
  totalDisputes: number;
  successRate: number;
  avgResolutionTime: number;
  activeDisputes: number;
}

interface TrendData {
  time: string;
  disputes: number;
  resolved: number;
}

const INITIAL_STATS: DisputeStats = {
  totalDisputes: 1250,
  successRate: 78,
  avgResolutionTime: 4.2,
  activeDisputes: 23,
};

const INITIAL_TREND_DATA: TrendData[] = [
  { time: '00:00', disputes: 12, resolved: 8 },
  { time: '04:00', disputes: 15, resolved: 10 },
  { time: '08:00', disputes: 22, resolved: 16 },
  { time: '12:00', disputes: 28, resolved: 21 },
  { time: '16:00', disputes: 24, resolved: 19 },
  { time: '20:00', disputes: 18, resolved: 14 },
  { time: '23:59', disputes: 20, resolved: 17 },
];

const SUCCESS_RATE_DATA = [
  { name: '成功', value: 78, color: '#10b981' },
  { name: '失败', value: 22, color: '#ef4444' },
];

export default function DisputeResolutionPanel() {
  const [stats, setStats] = useState<DisputeStats>(INITIAL_STATS);
  const [trendData, setTrendData] = useState<TrendData[]>(INITIAL_TREND_DATA);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const simulateDataUpdate = useCallback(() => {
    setStats((prev) => {
      const variation = () => Math.floor(Math.random() * 5) - 2;
      return {
        totalDisputes: Math.max(1000, prev.totalDisputes + variation()),
        successRate: Math.max(60, Math.min(95, prev.successRate + (Math.random() * 2 - 1))),
        avgResolutionTime: Math.max(
          2,
          Math.min(8, prev.avgResolutionTime + (Math.random() * 0.4 - 0.2))
        ),
        activeDisputes: Math.max(10, prev.activeDisputes + variation()),
      };
    });

    setTrendData((prev) => {
      const newData = [...prev];
      const lastIndex = newData.length - 1;
      newData[lastIndex] = {
        ...newData[lastIndex],
        disputes: Math.max(5, newData[lastIndex].disputes + Math.floor(Math.random() * 6) - 3),
        resolved: Math.max(3, newData[lastIndex].resolved + Math.floor(Math.random() * 4) - 2),
      };
      return newData;
    });

    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const interval = setInterval(simulateDataUpdate, 30000);
    return () => clearInterval(interval);
  }, [simulateDataUpdate]);

  const disputeStats = [
    {
      title: '总争议数',
      value: stats.totalDisputes.toLocaleString(),
      trend: 5,
      trendDirection: 'up' as const,
      trendLabel: '本月',
      accentColor: 'blue' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      title: '争议成功率',
      value: `${stats.successRate.toFixed(1)}%`,
      trend: 2.3,
      trendDirection: 'up' as const,
      trendLabel: '较上月',
      accentColor: 'green' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: '平均解决时间',
      value: stats.avgResolutionTime.toFixed(1),
      suffix: '小时',
      trend: -8,
      trendDirection: 'down' as const,
      trendLabel: '优化中',
      accentColor: 'purple' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: '活跃争议',
      value: stats.activeDisputes.toString(),
      trend: -3,
      trendDirection: 'down' as const,
      trendLabel: '实时',
      accentColor: 'orange' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {disputeStats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            suffix={stat.suffix}
            icon={stat.icon}
            trend={stat.trend}
            trendDirection={stat.trendDirection}
            trendLabel={stat.trendLabel}
            accentColor={stat.accentColor}
            variant={index === 0 ? 'accent' : 'default'}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AdvancedCard className="lg:col-span-2" variant="glass" hoverable={false}>
          <AdvancedCardHeader>
            <div className="flex items-center justify-between">
              <AdvancedCardTitle className="text-gray-900">争议活动趋势</AdvancedCardTitle>
              <span className="text-sm text-gray-500">
                最后更新: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </AdvancedCardHeader>
          <AdvancedCardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorDisputes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area
                    type="monotone"
                    dataKey="disputes"
                    name="新增争议"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDisputes)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="已解决"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorResolved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdvancedCardContent>
        </AdvancedCard>

        <AdvancedCard variant="glass" hoverable={false}>
          <AdvancedCardHeader>
            <AdvancedCardTitle className="text-gray-900">争议成功率</AdvancedCardTitle>
          </AdvancedCardHeader>
          <AdvancedCardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SUCCESS_RATE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {SUCCESS_RATE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => [`${value}%`, '占比']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 mt-1">总体成功率</p>
            </div>
          </AdvancedCardContent>
        </AdvancedCard>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>数据每30秒自动更新</span>
      </div>
    </div>
  );
}
