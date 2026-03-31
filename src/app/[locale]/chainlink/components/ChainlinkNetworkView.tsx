'use client';

import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type ChainlinkNetworkViewProps } from '../types';

import { NetworkTopologyOverview } from './NetworkTopologyOverview';
import { NodeGeographicDistribution } from './NodeGeographicDistribution';
import { RealtimeThroughputMonitor } from './RealtimeThroughputMonitor';

export function ChainlinkNetworkView({ config, networkStats }: ChainlinkNetworkViewProps) {
  const t = useTranslations();

  const networkData = networkStats || config.networkData;

  const metrics = [
    {
      label: t('chainlink.network.activeNodes'),
      value: networkData.activeNodes?.toLocaleString() || '1,847',
      change: '+5%',
      trend: 'up',
      icon: Server,
    },
    {
      label: t('chainlink.network.dataFeeds'),
      value: networkData.dataFeeds?.toLocaleString() || '1,243',
      change: '+12%',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('chainlink.network.responseTime'),
      value: `${networkData.avgResponseTime || 245}ms`,
      change: '-8%',
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('chainlink.network.uptime'),
      value: `${networkData.nodeUptime || 99.9}%`,
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('chainlink.network.totalRequests'), value: '4.2M' },
    { label: t('chainlink.network.avgGas'), value: '85,420' },
    { label: t('chainlink.network.activeChains'), value: '15' },
    { label: t('chainlink.network.nodeOperators'), value: '1,240' },
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
              {t('chainlink.network.hourlyActivity')}
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
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 transition-colors rounded-t"
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${value.toLocaleString()} requests`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{t('time.00:00')}</span>
            <span>{t('time.06:00')}</span>
            <span>{t('time.12:00')}</span>
            <span>{t('time.18:00')}</span>
            <span>{t('time.23:59')}</span>
          </div>
        </div>

        {/* 网络性能指标 - 简洁进度条 */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('chainlink.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.successRate')}</span>
                <span className="font-medium text-gray-900">
                  {networkData.successRate || '99.97'}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.activeNodes')}</span>
                <span className="font-medium">
                  {networkData.activeNodes?.toLocaleString() || '1,240'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.dataSources')}</span>
                <span className="font-medium">{networkData.dataSources || '156'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.dataFeeds')}</span>
                <span className="font-medium">{networkData.dataFeeds || '2,847'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.consumerContracts')}</span>
                <span className="font-medium">{networkData.consumerContracts || '4,521'}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${networkData.successRate || 99.97}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.avgResponse')}</span>
                <span className="font-medium text-gray-900">
                  {networkData.avgResponseTime || 245}ms
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(((networkData.avgResponseTime || 245) / 350) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.dataFreshness')}</span>
                <span className="font-medium text-gray-900">
                  &lt; {networkData.dataFreshness || 1}min
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: `${Math.max(100 - (networkData.dataFreshness || 1) * 5, 0)}%` }}
                />
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
          {t('chainlink.network.overview')}
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

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 实时吞吐量监控 */}
      <RealtimeThroughputMonitor />

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 网络拓扑概览 */}
      <NetworkTopologyOverview />

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 节点地理分布 */}
      <NodeGeographicDistribution />
    </div>
  );
}
