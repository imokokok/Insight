'use client';

import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type ChainlinkNetworkViewProps } from '../types';

import { NetworkTopologyOverview } from './NetworkTopologyOverview';
import { NodeGeographicDistribution } from './NodeGeographicDistribution';
import { RealtimeThroughputMonitor } from './RealtimeThroughputMonitor';

export function ChainlinkNetworkView({ config, networkStats }: ChainlinkNetworkViewProps) {
  const t = useTranslations();

  const metrics = [
    {
      label: t('chainlink.network.activeNodes'),
      value: networkStats?.activeNodes?.toLocaleString() ?? '-',
      change: null,
      trend: 'up',
      icon: Server,
    },
    {
      label: t('chainlink.network.dataFeeds'),
      value: networkStats?.dataFeeds?.toLocaleString() ?? '-',
      change: null,
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('chainlink.network.responseTime'),
      value: networkStats?.avgResponseTime ? `${networkStats.avgResponseTime}ms` : '-',
      change: null,
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('chainlink.network.uptime'),
      value: networkStats?.nodeUptime ? `${networkStats.nodeUptime}%` : '-',
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('chainlink.network.totalRequests'), value: '-' },
    { label: t('chainlink.network.avgGas'), value: '-' },
    { label: t('chainlink.network.activeChains'), value: networkStats?.activeChains?.toString() ?? '-' },
    { label: t('chainlink.network.nodeOperators'), value: '-' },
  ];

  return (
    <div className="space-y-8">
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

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('chainlink.network.hourlyActivity')}
            </h3>
            <span className="text-sm text-gray-500">24h</span>
          </div>
          {config.networkData.hourlyActivity && config.networkData.hourlyActivity.length > 0 ? (
            <div className="h-40 flex items-end gap-0.5">
              {config.networkData.hourlyActivity.map((value, index) => {
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
          ) : (
            <div className="h-40 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-sm text-gray-500">{t('chainlink.network.noActivityData')}</p>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{t('time.00:00')}</span>
            <span>{t('time.06:00')}</span>
            <span>{t('time.12:00')}</span>
            <span>{t('time.18:00')}</span>
            <span>{t('time.23:59')}</span>
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('chainlink.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.successRate')}</span>
                <span className="font-medium text-gray-900">
                  {networkStats?.successRate ? `${networkStats.successRate}%` : '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.activeNodes')}</span>
                <span className="font-medium">
                  {networkStats?.activeNodes?.toLocaleString() ?? '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.dataSources')}</span>
                <span className="font-medium">{networkStats?.dataSources ?? '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.dataFeeds')}</span>
                <span className="font-medium">{networkStats?.dataFeeds?.toLocaleString() ?? '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.network.consumerContracts')}</span>
                <span className="font-medium">{networkStats?.consumerContracts ?? '-'}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${networkStats?.successRate ?? 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.avgResponse')}</span>
                <span className="font-medium text-gray-900">
                  {networkStats?.avgResponseTime ? `${networkStats.avgResponseTime}ms` : '-'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{
                    width: `${networkStats?.avgResponseTime ? Math.min(((networkStats.avgResponseTime) / 350) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.dataFreshness')}</span>
                <span className="font-medium text-gray-900">
                  {networkStats?.dataFreshness ? `< ${networkStats.dataFreshness}min` : '-'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: `${networkStats?.dataFreshness ? Math.max(100 - (networkStats.dataFreshness) * 5, 0) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

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

      <div className="border-t border-gray-200" />

      <RealtimeThroughputMonitor />

      <div className="border-t border-gray-200" />

      <NetworkTopologyOverview />

      <div className="border-t border-gray-200" />

      <NodeGeographicDistribution />
    </div>
  );
}
