'use client';

import { useTranslations } from 'next-intl';
import { NetworkHealthPanel } from '@/components/oracle';
import { BandProtocolNetworkViewProps } from '../types';
import type { BandNetworkStats } from '@/lib/oracles/bandProtocol';

export function BandProtocolNetworkView({
  config,
  networkStats,
  isLoading,
}: BandProtocolNetworkViewProps) {
  const t = useTranslations();

  const data = (networkStats || config.networkData.bandProtocolMetrics) as BandNetworkStats | undefined;

  const metrics = [
    {
      label: t('bandProtocol.network.activeValidators'),
      value: data?.activeValidators?.toLocaleString() || '70',
      change: '+2%',
      status: 'healthy',
    },
    {
      label: t('bandProtocol.network.stakingRatio'),
      value: `${data?.stakingRatio?.toFixed(1) || '51.5'}%`,
      change: '+1.2%',
      status: 'healthy',
    },
    {
      label: t('bandProtocol.network.blockTime'),
      value: `${data?.blockTime?.toFixed(1) || '2.8'}s`,
      change: '-5%',
      status: 'healthy',
    },
    {
      label: t('bandProtocol.network.inflationRate'),
      value: `${data?.inflationRate?.toFixed(1) || '8.5'}%`,
      change: null,
      status: 'healthy',
    },
  ];

  const hourlyActivity = config.networkData.hourlyActivity || [
    5800, 5200, 4800, 4400, 4100, 4300, 5600, 7800, 10200, 12500, 14200, 15100,
    14800, 14400, 13900, 14100, 14500, 15000, 14700, 13200, 11800, 9800, 7800, 6500,
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{metric.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              {metric.change && (
                <span className={`text-sm font-medium ${
                  metric.change.startsWith('+') ? 'text-emerald-600' : 'text-blue-600'
                }`}>
                  {metric.change}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                metric.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span className="text-xs text-gray-500">
                {metric.status === 'healthy' ? t('chainlink.normal') : t('chainlink.warning')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <NetworkHealthPanel config={config.networkData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('chainlink.network.hourlyActivity')}
          </h3>
          <div className="h-48 flex items-end gap-1">
            {hourlyActivity.map((value, index) => {
              const max = Math.max(...hourlyActivity);
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-purple-100 hover:bg-purple-200 transition-colors rounded-t"
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

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('chainlink.network.performance')}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('chainlink.network.successRate')}</span>
                <span className="font-medium">99.85%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '99.85%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('chainlink.network.availability')}</span>
                <span className="font-medium">99.99%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '99.99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('chainlink.network.latency')}</span>
                <span className="font-medium">150ms avg</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('bandProtocol.network.stakingParticipation')}</span>
                <span className="font-medium">51.5%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '51.5%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('bandProtocol.network.cosmosMetrics')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">{t('bandProtocol.network.blockHeight')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {data?.latestBlockHeight?.toLocaleString() || '15,500,000'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">{t('bandProtocol.network.totalValidators')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {data?.totalValidators || '80'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">{t('bandProtocol.network.bondedTokens')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {((data?.bondedTokens || 85000000) / 1e6).toFixed(1)}M BAND
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">{t('bandProtocol.network.communityPool')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {((data?.communityPool || 550000) / 1e3).toFixed(1)}K BAND
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
