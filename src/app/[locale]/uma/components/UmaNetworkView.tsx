'use client';

import { useTranslations } from 'next-intl';
import { UmaNetworkViewProps } from '../types';
import { NetworkHealthPanel } from '@/components/oracle';

export function UmaNetworkView({ config, networkStats, isLoading }: UmaNetworkViewProps) {
  const t = useTranslations();

  const networkMetrics = [
    {
      label: t('uma.network.activeValidators'),
      value: networkStats?.activeValidators ?? 850,
      unit: '',
      trend: '+3%',
    },
    {
      label: t('uma.network.validatorUptime'),
      value: networkStats?.validatorUptime ?? 99.5,
      unit: '%',
      trend: '+0.1%',
    },
    {
      label: t('uma.network.avgResponseTime'),
      value: networkStats?.avgResponseTime ?? 180,
      unit: 'ms',
      trend: '-5%',
    },
    {
      label: t('uma.network.totalStaked'),
      value: ((networkStats?.totalStaked ?? 25000000) / 1e6).toFixed(2),
      unit: 'M',
      trend: '+8%',
    },
    {
      label: t('uma.network.dataSources'),
      value: networkStats?.dataSources ?? 320,
      unit: '',
      trend: '+12',
    },
    {
      label: t('uma.network.activeDisputes'),
      value: networkStats?.activeDisputes ?? 23,
      unit: '',
      trend: '+2',
    },
  ];

  const dataSources = [
    {
      name: 'UMA Mainnet',
      status: 'active' as const,
      latency: '150ms',
      reliability: 99.9,
    },
    {
      name: 'Ethereum Node 1',
      status: 'active' as const,
      latency: '245ms',
      reliability: 99.8,
    },
    {
      name: 'Ethereum Node 2',
      status: 'active' as const,
      latency: '280ms',
      reliability: 99.7,
    },
    {
      name: 'Arbitrum Node',
      status: 'active' as const,
      latency: '120ms',
      reliability: 99.9,
    },
    {
      name: 'Optimism Node',
      status: 'syncing' as const,
      latency: '350ms',
      reliability: 98.5,
    },
    {
      name: 'Backup Node',
      status: 'active' as const,
      latency: '420ms',
      reliability: 99.5,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Network Health Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <NetworkHealthPanel config={config.networkData} />
      </div>

      {/* Network Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.network.metrics')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {networkMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {metric.label}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold text-gray-900">
                  {metric.value}{metric.unit}
                </p>
                <span className={`text-xs ${
                  metric.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {metric.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.network.dataSources')}
        </h3>
        <div className="space-y-3">
          {dataSources.map((source, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    source.status === 'active'
                      ? 'bg-emerald-500'
                      : source.status === 'syncing'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{source.name}</p>
                  <p className="text-xs text-gray-500">
                    {t('uma.network.reliability')}: {source.reliability}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{source.latency}</p>
                <p className={`text-xs ${
                  source.status === 'active'
                    ? 'text-emerald-600'
                    : source.status === 'syncing'
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}>
                  {source.status === 'active'
                    ? t('uma.network.online')
                    : source.status === 'syncing'
                    ? t('uma.network.syncing')
                    : t('uma.network.offline')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Performance */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.network.performance')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('uma.network.updateFrequency')}
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: '60%' }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {networkStats?.updateFrequency ?? 60}s
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('uma.network.disputeResolutionTime')}
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: '75%' }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {networkStats?.avgResolutionTime ?? 4.2}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
