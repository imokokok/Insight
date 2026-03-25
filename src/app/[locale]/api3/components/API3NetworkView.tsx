'use client';

import { useTranslations } from '@/i18n';
import { API3NetworkViewProps } from '../types';
import { Activity } from 'lucide-react';
import { Server } from 'lucide-react';
import { Clock } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { TrendingDown } from 'lucide-react';

export function API3NetworkView({
  config,
  networkStats,
}: API3NetworkViewProps) {
  const t = useTranslations();

  const networkData = networkStats || config.networkData;

  const metrics = [
    {
      label: t('api3.network.activeAirnodes'),
      value: networkData.activeNodes?.toLocaleString() || '50',
      change: '+3%',
      trend: 'up',
      icon: Server,
    },
    {
      label: t('api3.network.dapiFeeds'),
      value: networkData.dataFeeds?.toLocaleString() || '150',
      change: '+8%',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('api3.network.responseTime'),
      value: `${networkData.avgResponseTime || 200}ms`,
      change: '-5%',
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('api3.network.uptime'),
      value: `${networkData.nodeUptime || 99.8}%`,
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('api3.network.totalRequests') || 'Total Requests (24h)', value: '1.2M' },
    { label: t('api3.network.avgGas') || 'Avg Gas Used', value: '62,340' },
    { label: t('api3.network.activeChains') || 'Active Chains', value: '8' },
    { label: t('api3.network.nodeOperators') || 'Node Operators', value: '85' },
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
              {t('api3.network.hourlyActivity')}
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
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors rounded-t"
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
            {t('api3.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('api3.network.successRate')}</span>
                <span className="font-medium text-gray-900">99.8%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.8%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('api3.network.availability')}</span>
                <span className="font-medium text-gray-900">99.9%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('api3.network.latency')}</span>
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
          {t('api3.network.overview') || 'Network Overview'}
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
