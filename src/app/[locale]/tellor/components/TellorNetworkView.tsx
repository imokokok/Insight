'use client';

import { useTranslations } from 'next-intl';
import { TellorNetworkViewProps } from '../types';

export function TellorNetworkView({
  config,
  networkStats,
  isLoading,
}: TellorNetworkViewProps) {
  const t = useTranslations();

  const networkMetrics = [
    {
      label: t('tellor.network.activeReporters'),
      value: '72+',
      change: '+3%',
      description: t('tellor.network.reportersDescription'),
    },
    {
      label: t('tellor.network.totalStaked'),
      value: '20M TRB',
      change: '+5%',
      description: t('tellor.network.stakedDescription'),
    },
    {
      label: t('tellor.network.avgResponseTime'),
      value: '95ms',
      change: '-8%',
      description: t('tellor.network.responseDescription'),
    },
    {
      label: t('tellor.network.uptime'),
      value: '99.9%',
      change: '+0.1%',
      description: t('tellor.network.uptimeDescription'),
    },
  ];

  const chainStatus = [
    { name: 'Ethereum', status: 'active', reporters: 32, latency: '95ms' },
    { name: 'Arbitrum', status: 'active', reporters: 18, latency: '85ms' },
    { name: 'Optimism', status: 'active', reporters: 12, latency: '90ms' },
    { name: 'Polygon', status: 'active', reporters: 8, latency: '100ms' },
    { name: 'Base', status: 'active', reporters: 2, latency: '88ms' },
  ];

  return (
    <div className="space-y-4">
      {/* Network Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {networkMetrics.map((metric, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{metric.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <span
                className={`text-xs ${
                  metric.change.startsWith('+') ? 'text-emerald-600' : 'text-blue-600'
                }`}
              >
                {metric.change}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* Chain Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.network.chainStatus')}
        </h3>
        <div className="space-y-3">
          {chainStatus.map((chain, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
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

      {/* Network Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.network.hourlyActivity')}
        </h3>
        <div className="h-48 flex items-end gap-1">
          {config.networkData.hourlyActivity?.map((value, index) => {
            const max = Math.max(...(config.networkData.hourlyActivity || []));
            const height = max > 0 ? (value / max) * 100 : 0;
            return (
              <div
                key={index}
                className="flex-1 bg-cyan-100 hover:bg-cyan-200 transition-colors rounded-t"
                style={{ height: `${height}%` }}
                title={`${value} requests`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:59</span>
        </div>
      </div>
    </div>
  );
}
