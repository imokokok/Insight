'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/utils/logger';
import { UMAClient } from '@/lib/oracles/uma';
import { UMANetworkStats, VerificationActivity } from '@/lib/oracles/uma/types';
import { DashboardCard, StatCard } from '../../common/DashboardCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

interface UMANetworkPanelProps {
  networkStats: UMANetworkStats | null;
  client: UMAClient;
}

export function UMANetworkPanel({ networkStats, client }: UMANetworkPanelProps) {
  const t = useTranslations();
  const [verificationActivity, setVerificationActivity] = useState<VerificationActivity | null>(
    null
  );
  const [disputeTrends, setDisputeTrends] = useState<
    { date: string; filed: number; resolved: number }[]
  >([]);
  const [earningsTrends, setEarningsTrends] = useState<
    { day: string; daily: number; cumulative: number }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activity, disputes, earnings] = await Promise.all([
          client.getVerificationActivity(),
          client.getDisputeTrends(),
          client.getEarningsTrends(),
        ]);
        setVerificationActivity(activity);
        setDisputeTrends(disputes);
        setEarningsTrends(earnings);
      } catch (error) {
        logger.error(
          'Failed to fetch UMA network data:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };

    fetchData();
  }, [client]);

  const stats = [
    {
      title: t('uma.network.activeValidators'),
      value: networkStats?.activeValidators?.toLocaleString() ?? '850+',
      change: '+3%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: t('uma.network.validatorUptime'),
      value: `${networkStats?.validatorUptime ?? 99.5}%`,
      change: '+0.1%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: t('uma.network.avgResponseTime'),
      value: `${networkStats?.avgResponseTime ?? 180}ms`,
      change: '-5%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      title: t('uma.network.totalStaked'),
      value: `$${((networkStats?.totalStaked ?? 25000000) / 1e6).toFixed(1)}M`,
      change: '+8%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const disputeStats = [
    {
      title: t('uma.network.totalDisputes'),
      value: networkStats?.totalDisputes?.toLocaleString() ?? '1,250+',
      change: '+15%',
      changeType: 'positive' as const,
    },
    {
      title: t('uma.network.disputeSuccessRate'),
      value: `${networkStats?.disputeSuccessRate ?? 78}%`,
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: t('uma.network.activeDisputes'),
      value: networkStats?.activeDisputes?.toString() ?? '23',
      change: '-2',
      changeType: 'positive' as const,
    },
    {
      title: t('uma.network.avgResolutionTime'),
      value: `${networkStats?.avgResolutionTime ?? 4.2}h`,
      change: '-0.5h',
      changeType: 'positive' as const,
    },
  ];

  const hourlyData =
    verificationActivity?.hourly.map((count, hour) => ({
      hour: `${hour}:00`,
      count,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* 主要网络指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* 争议统计 */}
      <DashboardCard title={t('uma.network.disputeStatistics')}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-gray-200">
          {disputeStats.map((stat, index) => (
            <div
              key={index}
              className={`text-center p-4 bg-gray-50 ${
                index < disputeStats.length - 1 ? 'border-r border-gray-200' : ''
              }`}
            >
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p
                className={`text-xs mt-2 font-medium ${
                  stat.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {stat.changeType === 'positive' ? '↑' : '↓'} {stat.change}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* 验证活动图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('uma.network.verificationActivity')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#6b7280' }} interval={3} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontSize: 12 }}
                  itemStyle={{ color: '#111827', fontSize: 12 }}
                  formatter={(value) => [
                    String(value).toLocaleString(),
                    t('uma.network.verifications'),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-0 border border-gray-200">
            <div className="text-center py-3 px-2 bg-gray-50 border-r border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{t('uma.network.total24h')}</p>
              <p className="text-lg font-bold text-gray-900">
                {verificationActivity?.total.toLocaleString() ?? '145,200'}
              </p>
            </div>
            <div className="text-center py-3 px-2 bg-gray-50 border-r border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{t('uma.network.peakHour')}</p>
              <p className="text-lg font-bold text-gray-900">
                {verificationActivity?.peakHour ?? 11}:00
              </p>
            </div>
            <div className="text-center py-3 px-2 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">{t('uma.network.avgPerHour')}</p>
              <p className="text-lg font-bold text-gray-900">
                {verificationActivity?.avgPerHour.toLocaleString() ?? '6,050'}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('uma.network.disputeTrends')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={disputeTrends}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontSize: 12 }}
                  itemStyle={{ color: '#111827', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="filed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                  name={t('uma.network.disputesFiled')}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  name={t('uma.network.disputesResolved')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      {/* 收益趋势 */}
      <DashboardCard title={t('uma.network.earningsTrends')}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earningsTrends}>
              <defs>
                <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} interval={4} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: '#374151', fontSize: 12 }}
                itemStyle={{ color: '#111827', fontSize: 12 }}
                formatter={(value, name) => [`$${String(value).toLocaleString()}`, name]}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="daily"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorDaily)"
                strokeWidth={2}
                name={t('uma.network.dailyEarnings')}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorCumulative)"
                strokeWidth={2}
                name={t('uma.network.cumulativeEarnings')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      {/* 数据源信息 */}
      <DashboardCard title={t('uma.network.dataSources')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-200">
          <div className="flex items-center justify-between p-4 bg-gray-50 border-r border-gray-200">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              <span className="text-sm font-medium text-gray-700">
                {t('uma.network.primaryDataSource')}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              {networkStats?.dataSources ?? 320}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 border-r border-gray-200">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
              <span className="text-sm font-medium text-gray-700">
                {t('uma.network.updateFrequency')}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              {networkStats?.updateFrequency ?? 60}s
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
              <span className="text-sm font-medium text-gray-700">
                {t('uma.network.supportedChains')}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">5</span>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
