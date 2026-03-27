'use client';

import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

import { useTranslations } from '@/i18n';
import type { BandNetworkStats } from '@/lib/oracles/bandProtocol';

import { type BandProtocolNetworkViewProps } from '../types';

export function BandProtocolNetworkView({ config, networkStats }: BandProtocolNetworkViewProps) {
  const t = useTranslations();

  const data = (networkStats || config.networkData.bandProtocolMetrics) as
    | BandNetworkStats
    | undefined;

  const metrics = [
    {
      label: t('band.bandProtocol.network.activeValidators'),
      value: data?.activeValidators?.toLocaleString() || '70',
      change: '+2%',
      trend: 'up' as const,
      icon: Server,
    },
    {
      label: t('band.bandProtocol.network.stakingRatio'),
      value: `${data?.stakingRatio?.toFixed(1) || '51.5'}%`,
      change: '+1.2%',
      trend: 'up' as const,
      icon: Activity,
    },
    {
      label: t('band.bandProtocol.network.blockTime'),
      value: `${data?.blockTime?.toFixed(1) || '2.8'}s`,
      change: '-5%',
      trend: 'down' as const,
      icon: Clock,
    },
    {
      label: t('band.bandProtocol.network.inflationRate'),
      value: `${data?.inflationRate?.toFixed(1) || '8.5'}%`,
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const hourlyActivity = config.networkData.hourlyActivity || [
    5800, 5200, 4800, 4400, 4100, 4300, 5600, 7800, 10200, 12500, 14200, 15100, 14800, 14400, 13900,
    14100, 14500, 15000, 14700, 13200, 11800, 9800, 7800, 6500,
  ];

  const overviewStats = [
    {
      label: t('band.bandProtocol.network.blockHeight') || 'Block Height',
      value: data?.latestBlockHeight?.toLocaleString() || '15,500,000',
    },
    {
      label: t('band.bandProtocol.network.totalValidators') || 'Total Validators',
      value: data?.totalValidators?.toLocaleString() || '80',
    },
    {
      label: t('band.bandProtocol.network.bondedTokens') || 'Bonded Tokens',
      value: `${((data?.bondedTokens || 85000000) / 1e6).toFixed(1)}M BAND`,
    },
    {
      label: t('band.bandProtocol.network.communityPool') || 'Community Pool',
      value: `${((data?.communityPool || 550000) / 1e3).toFixed(1)}K BAND`,
    },
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
            {hourlyActivity.map((value, index) => {
              const max = Math.max(...hourlyActivity);
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 transition-colors rounded-t"
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
            {t('chainlink.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.successRate')}</span>
                <span className="font-medium text-gray-900">99.85%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.85%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.availability')}</span>
                <span className="font-medium text-gray-900">99.99%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '99.99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('chainlink.network.latency')}</span>
                <span className="font-medium text-gray-900">150ms avg</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {t('band.bandProtocol.network.stakingParticipation')}
                </span>
                <span className="font-medium text-gray-900">51.5%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '51.5%' }} />
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
          {t('band.bandProtocol.network.cosmosMetrics') || 'Network Overview'}
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
