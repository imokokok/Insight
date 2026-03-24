'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RedStoneProvidersViewProps, SortOption, FilterOption } from '../types';
import { SegmentedControl } from '@/components/ui/selectors';

export function RedStoneProvidersView({ providers, metrics, isLoading }: RedStoneProvidersViewProps) {
  const t = useTranslations();
  const [sortBy, setSortBy] = useState<SortOption>('reputation');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const stats = [
    {
      title: t('redstone.providers.dataSources'),
      value: String(providers?.length || 4),
      change: '+1',
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
      title: t('redstone.providers.updateFrequency'),
      value: '~60s',
      change: '-5s',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.providers.dataQuality'),
      value: '99.8%',
      change: '+0.1%',
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
      title: t('redstone.dataStreams.avgReputation'),
      value: `${metrics?.avgProviderReputation ? (metrics.avgProviderReputation * 100).toFixed(1) : '93.5'}%`,
      change: '+0.5%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ),
    },
  ];

  const sortedProviders = useMemo(() => {
    if (!providers) return [];
    let filtered = [...providers];

    if (filterBy === 'highReputation') {
      filtered = filtered.filter((p) => p.reputation >= 0.9);
    } else if (filterBy === 'mostData') {
      filtered = filtered.filter((p) => p.dataPoints >= 500000);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation - a.reputation;
        case 'dataPoints':
          return b.dataPoints - a.dataPoints;
        case 'lastUpdate':
          return b.lastUpdate - a.lastUpdate;
        default:
          return 0;
      }
    });
  }, [providers, sortBy, filterBy]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-500">{stat.icon}</span>
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
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('redstone.providers.sortBy')}:</span>
            <SegmentedControl
              options={[
                { value: 'reputation', label: t('redstone.providers.reputation') },
                { value: 'dataPoints', label: t('redstone.providers.dataPoints') },
                { value: 'lastUpdate', label: t('redstone.providers.lastUpdate') },
              ]}
              value={sortBy}
              onChange={(value) => setSortBy(value as SortOption)}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('redstone.providers.filter')}:</span>
            <SegmentedControl
              options={[
                { value: 'all', label: t('redstone.providers.all') },
                { value: 'highReputation', label: t('redstone.providers.highReputation') },
                { value: 'mostData', label: t('redstone.providers.mostData') },
              ]}
              value={filterBy}
              onChange={(value) => setFilterBy(value as FilterOption)}
              size="sm"
            />
          </div>
        </div>

        <div className="border border-gray-200 divide-y divide-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              {t('redstone.providers.loading')}
            </div>
          ) : (
            sortedProviders.map((provider, index) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                    <p className="text-xs text-gray-500">
                      {t('redstone.providers.dataPoints')}: {provider.dataPoints.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900">
                        {(provider.reputation * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {t('redstone.providers.reputation')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(provider.lastUpdate).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
