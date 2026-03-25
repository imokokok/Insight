'use client';

import { useTranslations } from '@/i18n';
import { WinklinkNetworkViewProps } from '../types';
import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function WinklinkNetworkView({
  config,
  networkStats,
}: WinklinkNetworkViewProps) {
  const t = useTranslations();

  const networkData = networkStats || config.networkData;

  const metrics = [
    {
      label: t('winklink.network.activeNodes'),
      value: networkData.activeNodes?.toLocaleString() || '85',
      change: '+3%',
      trend: 'up',
      icon: Server,
    },
    {
      label: t('winklink.network.dataFeeds'),
      value: networkData.dataFeeds?.toLocaleString() || '180',
      change: '+8%',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('winklink.network.responseTime'),
      value: `${networkData.avgResponseTime || 110}ms`,
      change: '-5%',
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('winklink.network.uptime'),
      value: `${networkData.nodeUptime || 99.92}%`,
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('winklink.network.totalRequests') || 'Total Requests (24h)', value: '1.2M' },
    { label: t('winklink.network.avgGas') || 'Avg Gas Used', value: '42,180' },
    { label: t('winklink.network.activeChains') || 'Active Chains', value: '3' },
    { label: t('winklink.network.nodeOperators') || 'Node Operators', value: '85' },
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
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">{metric.value}</p>
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
              {t('winklink.network.hourlyActivity')}
            </h3>
            <span className="text-sm text-gray-500">24h</span>
          </div>
          <div className="h-40 flex items-end gap-0.5">
            {config.networkData.hourlyActivity?.map((value, index) => {
              const max = Math.max(...(config.networkData.hourlyActivity || []));
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 transition-colors rounded-t"
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
            {t('winklink.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('winklink.network.successRate')}</span>
                <span className="font-medium text-gray-900">99.92%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.92%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('winklink.network.availability')}</span>
                <span className="font-medium text-gray-900">99.99%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '99.99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('winklink.network.latency')}</span>
                <span className="font-medium text-gray-900">110ms avg</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '75%' }} />
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
          {t('winklink.network.overview') || 'Network Overview'}
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
