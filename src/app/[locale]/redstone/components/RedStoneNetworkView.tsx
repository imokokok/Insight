'use client';

import { useTranslations } from 'next-intl';
import { RedStoneNetworkViewProps } from '../types';
import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function RedStoneNetworkView({ networkStats, isLoading }: RedStoneNetworkViewProps) {
  const t = useTranslations();

  const metrics = [
    {
      label: t('redstone.stats.activeNodes'),
      value: networkStats?.activeNodes?.toLocaleString() ?? '25',
      change: '+2',
      trend: 'up',
      icon: Server,
    },
    {
      label: t('redstone.stats.dataFeeds'),
      value: `${networkStats?.dataFeeds ?? 1000}+`,
      change: '+50',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('redstone.stats.avgResponse'),
      value: `${networkStats?.avgResponseTime ?? 200}ms`,
      change: '-15ms',
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('redstone.stats.networkUptime'),
      value: `${networkStats?.nodeUptime ?? 99.9}%`,
      change: '+0.05%',
      trend: 'up',
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('redstone.network.totalRequests') || 'Total Requests (24h)', value: '2.8M' },
    { label: t('redstone.network.avgGas') || 'Avg Gas Used', value: '62,150' },
    { label: t('redstone.network.activeChains') || 'Active Chains', value: '12' },
    { label: t('redstone.network.nodeOperators') || 'Node Operators', value: '25' },
  ];

  const hourlyActivity = [
    65, 72, 68, 75, 82, 78, 85, 92, 88, 95, 102, 98,
    105, 112, 108, 115, 122, 118, 125, 132, 128, 135, 142, 138
  ];

  return (
    <div className="space-y-8">
      {/* 核心网络指标 - 简洁统计布局 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                  {isLoading ? '-' : metric.value}
                </p>
                {metric.change && (
                  <div className={`flex items-center gap-0.5 text-sm font-medium ${
                    metric.trend === 'up' ? 'text-emerald-600' : 'text-blue-600'
                  }`}>
                    <TrendIcon className="w-3.5 h-3.5" />
                    <span>{metric.change}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 网络性能概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 每小时活动 - 简化容器 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('redstone.network.hourlyActivity') || 'Hourly Activity'}
            </h3>
            <span className="text-sm text-gray-500">24h</span>
          </div>
          <div className="h-40 flex items-end gap-0.5">
            {hourlyActivity.map((value, index) => {
              const max = Math.max(...hourlyActivity);
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 transition-colors rounded-t"
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${value.toLocaleString()} requests`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* 网络性能指标 - 简洁进度条 */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('redstone.network.performance') || 'Network Performance'}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('redstone.network.successRate') || 'Success Rate'}</span>
                <span className="font-medium text-gray-900">99.9%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('redstone.network.availability') || 'Availability'}</span>
                <span className="font-medium text-gray-900">99.99%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '99.99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('redstone.network.latency') || 'Latency'}</span>
                <span className="font-medium text-gray-900">200ms avg</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 网络统计摘要 - 简洁行内布局 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('redstone.network.overview') || 'Network Overview'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {overviewStats.map((stat, index) => (
            <div key={index}>
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
