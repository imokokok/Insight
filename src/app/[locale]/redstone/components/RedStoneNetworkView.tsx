'use client';

import { useTranslations } from 'next-intl';
import { RedStoneNetworkViewProps } from '../types';

export function RedStoneNetworkView({ networkStats, isLoading }: RedStoneNetworkViewProps) {
  const t = useTranslations();

  const stats = [
    {
      title: t('redstone.stats.activeNodes'),
      value: networkStats?.activeNodes ?? 25,
      change: '+2',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.stats.dataFeeds'),
      value: `${networkStats?.dataFeeds ?? 1000}+`,
      change: '+50',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.stats.networkUptime'),
      value: `${networkStats?.nodeUptime ?? 99.9}%`,
      change: '+0.05%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.stats.avgResponse'),
      value: `${networkStats?.avgResponseTime ?? 200}ms`,
      change: '-15ms',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">{stat.icon}</span>
              <span
                className={`text-xs font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-emerald-600'
                    : stat.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {stat.changeType === 'positive' ? '↑' : stat.changeType === 'negative' ? '↓' : '→'}{' '}
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {isLoading ? '-' : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('redstone.networkHealth.title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('redstone.networkHealth.nodeDistribution')}</span>
                <span className="text-sm font-semibold text-gray-900">25 {t('redstone.nodes')}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('redstone.networkHealth.dataAvailability')}</span>
                <span className="text-sm font-semibold text-gray-900">99.9%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('redstone.networkHealth.consensusRate')}</span>
                <span className="text-sm font-semibold text-gray-900">98.5%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.5%' }} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {t('redstone.networkHealth.regionalDistribution')}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('redstone.regions.northAmerica')}</span>
                  <span className="font-medium">35%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('redstone.regions.europe')}</span>
                  <span className="font-medium">30%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('redstone.regions.asiaPacific')}</span>
                  <span className="font-medium">25%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('redstone.regions.others')}</span>
                  <span className="font-medium">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
