'use client';

import { useTranslations } from 'next-intl';
import { UmaNetworkViewProps } from '../types';
import { NetworkHealthPanel } from '@/components/oracle';
import { UMANetworkStats } from '@/lib/oracles/uma/types';
import {
  Users,
  Clock,
  Database,
  Shield,
  Server,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// 类型守卫函数
function isUMANetworkStats(data: unknown): data is UMANetworkStats {
  return (
    typeof data === 'object' &&
    data !== null &&
    'activeValidators' in data &&
    'validatorUptime' in data &&
    'avgResolutionTime' in data
  );
}

export function UmaNetworkView({ config, networkStats, isLoading }: UmaNetworkViewProps) {
  const t = useTranslations();

  // 优先使用 networkStats (UMANetworkStats)，否则使用 config.networkData
  const umaStats = networkStats;
  const networkData = config.networkData;

  // 核心网络指标 - 简洁 4 列布局
  const metrics = [
    {
      label: t('uma.network.activeValidators'),
      value: umaStats?.activeValidators?.toLocaleString() || '850',
      change: '+3%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      label: t('uma.network.totalStaked'),
      value: `${((umaStats?.totalStaked || networkData?.totalStaked || 25000000) / 1e6).toFixed(1)}M`,
      change: '+8%',
      trend: 'up' as const,
      icon: Database,
    },
    {
      label: t('uma.network.avgResponseTime'),
      value: `${umaStats?.avgResponseTime || networkData?.avgResponseTime || 180}ms`,
      change: '-5%',
      trend: 'down' as const,
      icon: Clock,
    },
    {
      label: t('uma.network.validatorUptime'),
      value: `${umaStats?.validatorUptime || 99.5}%`,
      change: '+0.1%',
      trend: 'up' as const,
      icon: Shield,
    },
  ];

  // 每小时活动数据（模拟）
  const hourlyActivity = [
    45, 52, 48, 61, 55, 72, 68, 85, 92, 88, 76, 82,
    95, 89, 78, 85, 91, 87, 73, 69, 58, 52, 48, 44,
  ];

  // 数据来源
  const dataSources = [
    { name: 'UMA Mainnet', status: 'active' as const, latency: '150ms', reliability: 99.9 },
    { name: 'Ethereum Node 1', status: 'active' as const, latency: '245ms', reliability: 99.8 },
    { name: 'Ethereum Node 2', status: 'active' as const, latency: '280ms', reliability: 99.7 },
    { name: 'Arbitrum Node', status: 'active' as const, latency: '120ms', reliability: 99.9 },
    { name: 'Optimism Node', status: 'syncing' as const, latency: '350ms', reliability: 98.5 },
    { name: 'Backup Node', status: 'active' as const, latency: '420ms', reliability: 99.5 },
  ];

  // 概览统计
  const overviewStats = [
    { label: t('uma.network.dataSources') || 'Data Sources', value: (umaStats?.dataSources || 320).toString() },
    { label: t('uma.network.activeDisputes') || 'Active Disputes', value: (umaStats?.activeDisputes || 23).toString() },
    { label: t('uma.network.requests24h') || 'Requests (24h)', value: '1.2M' },
    { label: t('uma.network.avgGas') || 'Avg Gas Used', value: '125K' },
  ];

  return (
    <div className="space-y-8">
      {/* Network Health Panel - 直接渲染，无卡片包装 */}
      <NetworkHealthPanel config={networkData} />

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 核心网络指标 - 简洁 4 列网格布局，无卡片背景 */}
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

      {/* 每小时活动和网络性能 - 双栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 每小时活动 - 简化柱状图 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('uma.network.hourlyActivity') || 'Hourly Activity'}
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
                  className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 transition-colors rounded-t"
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${value} validations`}
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

        {/* 网络性能指标 - 进度条形式 */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('uma.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('uma.network.updateFrequency')}</span>
                <span className="font-medium text-gray-900">
                  {umaStats?.updateFrequency || networkData?.updateFrequency || 60}s
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {t('uma.network.disputeResolutionTime')}
                </span>
                <span className="font-medium text-gray-900">
                  {umaStats?.avgResolutionTime || 4.2}h
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: '75%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('uma.network.validatorEfficiency')}</span>
                <span className="font-medium text-gray-900">98.5%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: '98.5%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 数据来源 - 内联列表展示 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('uma.network.dataSources')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataSources.map((source, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{source.name}</p>
                  <p className="text-xs text-gray-500">
                    {t('uma.network.reliability')}: {source.reliability}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{source.latency}</span>
                {source.status === 'active' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : source.status === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 网络概览统计 - 简洁行内布局 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('uma.network.overview') || 'Network Overview'}
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
