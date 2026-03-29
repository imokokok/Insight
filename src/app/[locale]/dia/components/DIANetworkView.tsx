'use client';

import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type DIANetworkViewProps } from '../types';

export function DIANetworkView({ config, networkStats, isLoading }: DIANetworkViewProps) {
  const t = useTranslations();

  const networkData = networkStats || config.networkData;

  const metrics = [
    {
      label: t('dia.network.activeDataSources'),
      value: (networkStats?.activeDataSources ?? 45).toLocaleString() + '+',
      change: '+3',
      trend: 'up',
      icon: Server,
    },
    {
      label: t('dia.network.dataFeeds'),
      value: networkData.dataFeeds?.toLocaleString() || '280+',
      change: '+12',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('dia.network.responseTime'),
      value: `${networkData.avgResponseTime || 150}ms`,
      change: '-10ms',
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('dia.network.nodeUptime'),
      value: `${networkData.nodeUptime || 99.8}%`,
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('dia.network.totalRequests'), value: '1.8M' },
    { label: t('dia.network.avgGas'), value: '42,150' },
    { label: t('dia.network.activeChains'), value: '25+' },
    { label: t('dia.network.dataProviders'), value: '45+' },
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
                  {metric.value}
                </p>
                {metric.change && (
                  <div
                    className={`flex items-center gap-0.5 text-sm font-medium ${
                      metric.trend === 'up' ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
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
              {t('dia.network.hourlyActivity')}
            </h3>
            <span className="text-sm text-gray-500">{t('dia.network.24h')}</span>
          </div>
          <div className="h-40 flex items-end gap-0.5">
            {config.networkData.hourlyActivity?.map((value, index) => {
              const max = Math.max(...(config.networkData.hourlyActivity || []));
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 transition-colors rounded-t"
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${value.toLocaleString()} requests`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{t('dia.time.00:00')}</span>
            <span>{t('dia.time.06:00')}</span>
            <span>{t('dia.time.12:00')}</span>
            <span>{t('dia.time.18:00')}</span>
            <span>{t('dia.time.23:59')}</span>
          </div>
        </div>

        {/* 网络性能指标 - 简洁进度条 */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('dia.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('dia.network.successRate')}</span>
                <span className="font-medium text-gray-900">99.9%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('dia.network.availability')}</span>
                <span className="font-medium text-gray-900">99.99%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '99.99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('dia.network.latency')}</span>
                <span className="font-medium text-gray-900">150ms avg</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '85%' }} />
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
          {t('dia.network.overview')}
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
