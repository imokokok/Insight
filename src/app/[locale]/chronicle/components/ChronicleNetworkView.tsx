'use client';

import { useTranslations } from 'next-intl';
import { ChronicleNetworkViewProps } from '../types';

export function ChronicleNetworkView({
  config,
  networkStats,
  validatorMetrics,
  isLoading,
}: ChronicleNetworkViewProps) {
  const t = useTranslations();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'offline':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getNetworkHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const hourlyActivity = networkStats?.hourlyActivity || [
    1200, 1100, 1000, 950, 900, 950, 1100, 1500, 2100, 2800, 3400, 3800, 3600, 3400, 3200, 3300,
    3500, 3700, 3400, 2800, 2200, 1700, 1400, 1300,
  ];
  const maxActivity = Math.max(...hourlyActivity);

  return (
    <div className="space-y-4">
      {/* Network Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border capitalize ${getStatusColor(
                  networkStats?.status || 'online'
                )}`}
              >
                {t(`chronicle.network.${networkStats?.status || 'online'}`)}
              </span>
              <p className="text-xs text-gray-500 mt-2">
                {t('chronicle.network.uptime')}: {networkStats?.nodeUptime ?? 99.95}%
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {validatorMetrics?.activeValidators ?? 45}/{validatorMetrics?.totalValidators ?? 45}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('chronicle.network.activeValidators')}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{networkStats?.avgResponseTime ?? 140}ms</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.avgLatency')}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{networkStats?.dataFeeds ?? 85}</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.activeFeeds')}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Network Health & Validator Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('chronicle.network.healthOverview')}
          </h3>
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border ${getNetworkHealthColor(validatorMetrics?.networkHealth || 'excellent')}`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="font-semibold capitalize">
                    {t(`chronicle.network.${validatorMetrics?.networkHealth || 'excellent'}`)}
                  </p>
                  <p className="text-sm opacity-80">{t('chronicle.network.networkHealthStatus')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('chronicle.network.totalStaked')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {((networkStats?.totalStaked || 25000000) / 1e6).toFixed(2)}M MKR
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">
                  {t('chronicle.network.updateFrequency')}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {networkStats?.updateFrequency || 60}s
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('chronicle.network.avgReputation')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {validatorMetrics?.averageReputation ?? 94}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('chronicle.network.latency')}</p>
                <p className="text-lg font-semibold text-gray-900">{networkStats?.latency || 140}ms</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('chronicle.network.validatorDistribution')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t('chronicle.network.active')}
                </span>
              </div>
              <span className="text-lg font-semibold text-emerald-700">
                {validatorMetrics?.activeValidators ?? 45}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {t('chronicle.network.inactive')}
                </span>
              </div>
              <span className="text-lg font-semibold text-gray-700">
                {(validatorMetrics?.totalValidators ?? 45) - (validatorMetrics?.activeValidators ?? 45)}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {t('chronicle.network.stakingDistribution')}
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.network.totalStaked')}</span>
                  <span className="font-medium text-gray-900">
                    {((validatorMetrics?.totalStaked || 21500000) / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(((validatorMetrics?.totalStaked || 21500000) / 5e7) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Activity Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('chronicle.network.hourlyActivity')}
        </h3>
        <div className="h-48 flex items-end gap-1">
          {hourlyActivity.map((activity, index) => (
            <div
              key={index}
              className="flex-1 bg-amber-500 hover:bg-amber-600 transition-colors rounded-t"
              style={{
                height: `${(activity / maxActivity) * 100}%`,
                minHeight: '4px',
              }}
              title={`${index}:00 - ${activity} updates`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>
    </div>
  );
}
