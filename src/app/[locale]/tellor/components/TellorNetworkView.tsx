'use client';

import { useTranslations } from '@/i18n';
import { TellorNetworkViewProps } from '../types';
import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function TellorNetworkView({
  config,
  networkStats,
  isLoading,
}: TellorNetworkViewProps) {
  const t = useTranslations();

  const metrics = [
    {
      label: t('tellor.network.activeReporters'),
      value: '72+',
      change: '+3%',
      trend: 'up',
      icon: Server,
    },
    {
      label: t('tellor.network.dataFeeds'),
      value: '350+',
      change: '+12%',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('tellor.network.avgResponseTime'),
      value: '95ms',
      change: '-8%',
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('tellor.network.uptime'),
      value: '99.9%',
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('tellor.network.totalRequests') || 'Total Requests (24h)', value: '2.8M' },
    { label: t('tellor.network.avgGas') || 'Avg Gas Used', value: '65,420' },
    { label: t('tellor.network.activeChains') || 'Active Chains', value: '6' },
    { label: t('tellor.network.reporterOperators') || 'Reporter Operators', value: '68' },
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

      {/* 链状态 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellor.network.chainStatus')}
        </h3>
        <div className="space-y-3">
          {[
            { name: 'Ethereum', status: 'active', reporters: 32, latency: '95ms' },
            { name: 'Arbitrum', status: 'active', reporters: 18, latency: '85ms' },
            { name: 'Optimism', status: 'active', reporters: 12, latency: '90ms' },
            { name: 'Polygon', status: 'active', reporters: 8, latency: '100ms' },
            { name: 'Base', status: 'active', reporters: 2, latency: '88ms' },
          ].map((chain, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    chain.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="text-sm font-medium text-gray-900">{chain.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t('tellor.network.reporters')}</p>
                  <p className="text-sm font-semibold text-gray-900">{chain.reporters}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t('tellor.network.latency')}</p>
                  <p className="text-sm font-semibold text-gray-900">{chain.latency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 网络性能概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 每小时活动 - 简化容器 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('tellor.network.hourlyActivity')}
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
                  className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors rounded-t"
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
            {t('tellor.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('tellor.network.successRate')}</span>
                <span className="font-medium text-gray-900">99.9%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('tellor.network.availability')}</span>
                <span className="font-medium text-gray-900">99.99%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: '99.99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('tellor.network.latency')}</span>
                <span className="font-medium text-gray-900">95ms avg</span>
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
          {t('tellor.network.overview') || 'Network Overview'}
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
