'use client';

import { TellorNetworkHealth } from '@/lib/oracles/tellor';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/oracle';
import { Blockchain } from '@/types/oracle';

interface TellorNetworkPanelProps {
  data: TellorNetworkHealth;
}

export function TellorNetworkPanel({ data }: TellorNetworkPanelProps) {
  const t = useTranslations();

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-success-600';
    if (score >= 70) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 90) return 'bg-success-500';
    if (score >= 70) return 'bg-warning-500';
    return 'bg-danger-500';
  };

  const getChainLabel = (chain: Blockchain) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = [0, 4, 8, 12, 16, 20];

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <DashboardCard title={t('tellor.network.overallHealth')}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mt-1">{t('tellor.network.basedOnMetrics')}</p>
          </div>
          <div className="text-right">
            <span className={`text-4xl font-bold ${getHealthColor(data.overallHealth)}`}>
              {data.overallHealth}%
            </span>
            <p className="text-sm mt-1">{t('tellor.network.healthScore')}</p>
          </div>
        </div>
        <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getHealthBgColor(data.overallHealth)}`}
            style={{ width: `${data.overallHealth}%` }}
          />
        </div>
      </DashboardCard>

      {/* Reporter Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('tellor.network.reporterDistribution')}>
          <div className="py-4">
            <div className="space-y-3">
              {data.reporterDistribution.map((region, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32">{region.region}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${region.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-20 text-right">
                    {region.count} ({region.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.network.chainActivity')}>
          <div className="py-4 space-y-3">
            {data.chainActivity.map((chain) => (
              <div
                key={chain.chain}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{getChainLabel(chain.chain)}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-gray-500">{t('tellor.network.updates24h')}</p>
                    <p className="font-semibold text-gray-900">
                      {chain.updates24h.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">{t('tellor.network.avgLatency')}</p>
                    <p className="font-semibold text-gray-900">{chain.avgLatency}ms</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">{t('tellor.network.health')}</p>
                    <p className={`font-semibold ${getHealthColor(chain.healthScore)}`}>
                      {chain.healthScore}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Update Frequency Heatmap */}
      <DashboardCard title={t('tellor.network.updateFrequencyHeatmap')}>
        <div className="py-4">
          <div className="flex gap-1">
            {/* Y-axis labels */}
            <div className="flex flex-col gap-1 mr-2">
              {days.map((day) => (
                <div key={day} className="h-8 flex items-center text-xs text-gray-500 w-10">
                  {day}
                </div>
              ))}
            </div>
            {/* Heatmap grid */}
            <div className="flex-1">
              <div className="grid grid-cols-24 gap-1">
                {data.updateFrequencyHeatmap.map((point, index) => {
                  const intensity = Math.floor(point.intensity * 4);
                  const colors = [
                    'bg-gray-100',
                    'bg-cyan-200',
                    'bg-cyan-400',
                    'bg-cyan-600',
                    'bg-cyan-800',
                  ];
                  return (
                    <div
                      key={index}
                      className={`h-8 rounded ${colors[intensity]} transition-all duration-200 hover:scale-110`}
                      title={`${days[point.day]} ${point.hour}:00 - Activity: ${Math.floor(point.intensity * 100)}%`}
                    />
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="grid grid-cols-6 gap-1 mt-2">
                {hours.map((hour) => (
                  <div key={hour} className="text-xs text-gray-500 text-center">
                    {hour}:00
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-gray-500">{t('tellor.network.low')}</span>
            <div className="flex gap-1">
              {['bg-gray-100', 'bg-cyan-200', 'bg-cyan-400', 'bg-cyan-600', 'bg-cyan-800'].map(
                (color, i) => (
                  <div key={i} className={`w-4 h-4 rounded ${color}`} />
                )
              )}
            </div>
            <span className="text-xs text-gray-500">{t('tellor.network.high')}</span>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
