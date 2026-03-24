'use client';

import { useTranslations } from 'next-intl';
import { NetworkHealthPanel } from '@/components/oracle';
import { API3NetworkViewProps } from '../types';

export function API3NetworkView({
  config,
  networkStats,
  isLoading,
}: API3NetworkViewProps) {
  const t = useTranslations();

  const networkData = networkStats || config.networkData;

  const metrics = [
    {
      label: t('api3.network.activeAirnodes'),
      value: networkData.activeNodes?.toLocaleString() || '50',
      change: '+3%',
      status: 'healthy',
    },
    {
      label: t('api3.network.dapiFeeds'),
      value: networkData.dataFeeds?.toLocaleString() || '150',
      change: '+8%',
      status: 'healthy',
    },
    {
      label: t('api3.network.responseTime'),
      value: `${networkData.avgResponseTime || 200}ms`,
      change: '-5%',
      status: 'healthy',
    },
    {
      label: t('api3.network.uptime'),
      value: `${networkData.nodeUptime || 99.8}%`,
      change: null,
      status: 'healthy',
    },
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
                {metric.status === 'healthy' ? t('api3.normal') : t('api3.warning')}
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
            {t('api3.network.hourlyActivity')}
          </h3>
          <div className="h-48 flex items-end gap-1">
            {config.networkData.hourlyActivity?.map((value, index) => {
              const max = Math.max(...(config.networkData.hourlyActivity || []));
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-emerald-100 hover:bg-emerald-200 transition-colors rounded-t"
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
            {t('api3.network.performance')}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('api3.network.successRate')}</span>
                <span className="font-medium">99.8%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '99.8%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('api3.network.availability')}</span>
                <span className="font-medium">99.95%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '99.95%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('api3.network.latency')}</span>
                <span className="font-medium">200ms avg</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
