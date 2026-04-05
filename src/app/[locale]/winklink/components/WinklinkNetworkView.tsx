'use client';

import {
  Activity,
  Server,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Database,
  Shield,
  Globe,
  Zap,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type WinklinkNetworkViewProps } from '../types';

export function WinklinkNetworkView({ config, networkStats, isLoading }: WinklinkNetworkViewProps) {
  const t = useTranslations();

  // 使用真实数据，如果没有则显示空状态
  const networkData = networkStats;

  // 空状态显示
  if (!networkData && !isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Server className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('winklink.network.noData')}</h3>
          <p className="text-sm text-gray-500 max-w-md">
            {t('winklink.network.noDataDescription')}
          </p>
        </div>
      </div>
    );
  }

  const metrics = networkData
    ? [
        {
          label: t('winklink.network.activeNodes'),
          value: networkData.activeNodes?.toLocaleString() || '-',
          change: null,
          trend: null,
          icon: Server,
        },
        {
          label: t('winklink.network.dataFeeds'),
          value: networkData.dataFeeds?.toLocaleString() || '-',
          change: null,
          trend: null,
          icon: Activity,
        },
        {
          label: t('winklink.network.responseTime'),
          value: networkData.avgResponseTime ? `${networkData.avgResponseTime}ms` : '-',
          change: null,
          trend: null,
          icon: Clock,
        },
        {
          label: t('winklink.network.uptime'),
          value: networkData.nodeUptime ? `${networkData.nodeUptime}%` : '-',
          change: null,
          trend: null,
          icon: CheckCircle,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* 核心网络指标 - 简洁统计布局 */}
      {networkData && (
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
      )}

      {/* 分隔线 */}
      {networkData && <div className="border-t border-gray-200" />}

      {/* 网络性能概览 */}
      {networkData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 每小时活动 - 简化容器 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900">
                {t('winklink.network.hourlyActivity')}
              </h3>
              <span className="text-sm text-gray-500">24h</span>
            </div>
            {networkData.hourlyActivity && networkData.hourlyActivity.length > 0 ? (
              <div className="h-40 flex items-end gap-0.5">
                {networkData.hourlyActivity.map((value, index) => {
                  const max = Math.max(...networkData.hourlyActivity);
                  const height = max > 0 ? (value / max) * 100 : 0;
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
            ) : (
              <div className="h-40 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              </div>
            )}
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
                  <span className="font-medium text-gray-900">
                    {networkData.nodeUptime ? `${networkData.nodeUptime}%` : '-'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${networkData.nodeUptime || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('winklink.network.availability')}</span>
                  <span className="font-medium text-gray-900">
                    {networkData.status === 'online'
                      ? '99.99%'
                      : networkData.status === 'warning'
                        ? '95%'
                        : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{
                      width:
                        networkData.status === 'online'
                          ? '99.99%'
                          : networkData.status === 'warning'
                            ? '95%'
                            : '0%',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('winklink.network.latency')}</span>
                  <span className="font-medium text-gray-900">
                    {networkData.avgResponseTime ? `${networkData.avgResponseTime}ms avg` : '-'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (networkData.avgResponseTime || 0) / 2)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分隔线 */}
      {networkData && <div className="border-t border-gray-200" />}

      {/* 网络统计摘要 - 简洁行内布局 */}
      {networkData && (
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('winklink.network.overview')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('winklink.network.updateFrequency')}</p>
              <p className="text-xl font-semibold text-gray-900">
                {networkData.updateFrequency ? `${networkData.updateFrequency}s` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('winklink.network.totalStaked')}</p>
              <p className="text-xl font-semibold text-gray-900">
                {networkData.totalStaked
                  ? `${(networkData.totalStaked / 1e6).toFixed(1)}M ${networkData.stakingTokenSymbol || ''}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('winklink.network.status')}</p>
              <p
                className={`text-xl font-semibold capitalize ${
                  networkData.status === 'online'
                    ? 'text-emerald-600'
                    : networkData.status === 'warning'
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {networkData.status || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('winklink.network.latency')}</p>
              <p className="text-xl font-semibold text-gray-900">
                {networkData.latency ? `${networkData.latency}ms` : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
