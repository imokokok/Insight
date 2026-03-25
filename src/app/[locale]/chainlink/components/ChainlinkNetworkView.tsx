'use client';

import { useTranslations } from 'next-intl';
import { ChainlinkNetworkViewProps } from '../types';
import { Activity, Server, Clock, CheckCircle } from 'lucide-react';

export function ChainlinkNetworkView({
  config,
  networkStats,
}: ChainlinkNetworkViewProps) {
  const t = useTranslations();

  const networkData = networkStats || config.networkData;

  const metrics = [
    {
      label: t('chainlink.network.activeNodes'),
      value: networkData.activeNodes?.toLocaleString() || '1,847',
      change: '+5%',
      icon: Server,
      color: 'blue',
    },
    {
      label: t('chainlink.network.dataFeeds'),
      value: networkData.dataFeeds?.toLocaleString() || '1,243',
      change: '+12%',
      icon: Activity,
      color: 'emerald',
    },
    {
      label: t('chainlink.network.responseTime'),
      value: `${networkData.avgResponseTime || 245}ms`,
      change: '-8%',
      icon: Clock,
      color: 'amber',
    },
    {
      label: t('chainlink.network.uptime'),
      value: `${networkData.nodeUptime || 99.9}%`,
      change: null,
      icon: CheckCircle,
      color: 'purple',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; light: string }> = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' },
  };

  return (
    <div className="space-y-6">
      {/* 核心网络指标 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const colors = colorClasses[metric.color];
          return (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${colors.light} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className="text-xs text-gray-500">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                {metric.change && (
                  <span className={`text-sm font-medium ${
                    metric.change.startsWith('+') ? 'text-emerald-600' : 'text-blue-600'
                  }`}>
                    {metric.change}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 网络性能概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 每小时活动 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('chainlink.network.hourlyActivity')}
          </h3>
          <div className="h-48 flex items-end gap-1">
            {config.networkData.hourlyActivity?.map((value, index) => {
              const max = Math.max(...(config.networkData.hourlyActivity || []));
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-100 hover:bg-blue-200 transition-colors rounded-t"
                  style={{ height: `${height}%` }}
                  title={`${value.toLocaleString()} requests`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* 网络性能指标 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('chainlink.network.performance')}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('chainlink.network.successRate')}</span>
                <span className="font-medium">99.9%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('chainlink.network.availability')}</span>
                <span className="font-medium">99.99%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '99.99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('chainlink.network.latency')}</span>
                <span className="font-medium">245ms avg</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 网络统计摘要 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {t('chainlink.network.overview') || 'Network Overview'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">{t('chainlink.network.totalRequests') || 'Total Requests (24h)'}</p>
            <p className="text-lg font-bold text-gray-900">4.2M</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">{t('chainlink.network.avgGas') || 'Avg Gas Used'}</p>
            <p className="text-lg font-bold text-gray-900">85,420</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">{t('chainlink.network.activeChains') || 'Active Chains'}</p>
            <p className="text-lg font-bold text-gray-900">15</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">{t('chainlink.network.nodeOperators') || 'Node Operators'}</p>
            <p className="text-lg font-bold text-gray-900">1,240</p>
          </div>
        </div>
      </div>
    </div>
  );
}
