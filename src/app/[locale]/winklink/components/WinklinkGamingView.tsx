'use client';

import { useState } from 'react';

import { Activity, CheckCircle2, TrendingUp, Gamepad2, Zap } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type WinklinkGamingViewProps } from '../types';

import { WinklinkDataTable } from './WinklinkDataTable';

export function WinklinkGamingView({ gaming, isLoading }: WinklinkGamingViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 使用真实数据，如果没有则显示空状态
  const gamingData = gaming;

  const categories = gamingData
    ? [
        { id: 'all', label: 'All', count: gamingData.dataSources.length },
        {
          id: 'casino',
          label: 'Casino',
          count: gamingData.dataSources.filter((f) => f.category === 'casino').length,
        },
        {
          id: 'sports',
          label: 'Sports',
          count: gamingData.dataSources.filter((f) => f.category === 'sports').length,
        },
        {
          id: 'esports',
          label: 'Esports',
          count: gamingData.dataSources.filter((f) => f.category === 'esports').length,
        },
        {
          id: 'other',
          label: 'Other',
          count: gamingData.dataSources.filter((f) => f.category === 'other').length,
        },
      ].filter((cat) => cat.count > 0)
    : [{ id: 'all', label: 'All', count: 0 }];

  const filteredDataSources = gamingData
    ? selectedCategory === 'all'
      ? gamingData.dataSources
      : gamingData.dataSources.filter((source) => source.category === selectedCategory)
    : [];

  const dataSourceColumns = gamingData
    ? [
        { key: 'name', header: t('winklink.gaming.gameName'), sortable: true },
        {
          key: 'category',
          header: t('winklink.gaming.category'),
          sortable: true,
          render: (item: (typeof gamingData.dataSources)[0]) => (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
              {item.category}
            </span>
          ),
        },
        {
          key: 'users',
          header: t('winklink.gaming.users'),
          sortable: true,
          render: (item: (typeof gamingData.dataSources)[0]) => item.users.toLocaleString(),
        },
        {
          key: 'volume24h',
          header: t('winklink.gaming.volume24h'),
          sortable: true,
          render: (item: (typeof gamingData.dataSources)[0]) =>
            `$${(item.volume24h / 1e6).toFixed(2)}M`,
        },
        {
          key: 'reliability',
          header: t('winklink.gaming.reliability'),
          sortable: true,
          render: (item: (typeof gamingData.dataSources)[0]) => (
            <span className="text-emerald-600">{item.reliability}%</span>
          ),
        },
      ]
    : [];

  const vrfColumns = gamingData
    ? [
        { key: 'name', header: t('winklink.gaming.serviceName'), sortable: true },
        {
          key: 'securityLevel',
          header: t('winklink.gaming.securityLevel'),
          sortable: true,
          render: (item: (typeof gamingData.randomNumberServices)[0]) => (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                item.securityLevel === 'high'
                  ? 'bg-emerald-100 text-emerald-700'
                  : item.securityLevel === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {item.securityLevel}
            </span>
          ),
        },
        {
          key: 'requestCount',
          header: t('winklink.gaming.requests'),
          sortable: true,
          render: (item: (typeof gamingData.randomNumberServices)[0]) =>
            `${(item.requestCount / 1e6).toFixed(1)}M`,
        },
        {
          key: 'averageResponseTime',
          header: t('winklink.gaming.avgResponse'),
          sortable: true,
          render: (item: (typeof gamingData.randomNumberServices)[0]) =>
            `${item.averageResponseTime}ms`,
        },
        {
          key: 'supportedChains',
          header: t('winklink.gaming.chains'),
          render: (item: (typeof gamingData.randomNumberServices)[0]) => (
            <div className="flex flex-wrap gap-1">
              {item.supportedChains.map((chain) => (
                <span
                  key={chain}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-700"
                >
                  {chain}
                </span>
              ))}
            </div>
          ),
        },
      ]
    : [];

  // 空状态显示
  if (!gamingData && !isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gamepad2 className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('winklink.gaming.noData')}</h3>
          <p className="text-sm text-gray-500 max-w-md">{t('winklink.gaming.noDataDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.gaming.totalVolume')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {gamingData ? `$${(gamingData.totalGamingVolume / 1e9).toFixed(2)}B` : '-'}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.gaming.activeGames')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">
              {gamingData ? gamingData.activeGames : '-'}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.gaming.dailyRandomRequests')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {gamingData ? `${(gamingData.dailyRandomRequests / 1e3).toFixed(0)}K` : '-'}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.gaming.avgReliability')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {gamingData && gamingData.dataSources.length > 0
                ? `${(
                    gamingData.dataSources.reduce((acc, s) => acc + s.reliability, 0) /
                    gamingData.dataSources.length
                  ).toFixed(2)}%`
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      {gamingData && gamingData.dataSources.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedCategory === category.id
                  ? 'text-gray-900 bg-gray-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {category.label}
              <span
                className={`text-xs ${
                  selectedCategory === category.id ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {category.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Data Sources Table */}
      {gamingData && gamingData.dataSources.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            {t('winklink.gaming.dataSources')}
          </h3>
          <WinklinkDataTable
            data={filteredDataSources as unknown as Record<string, unknown>[]}
            columns={
              dataSourceColumns as unknown as Array<{
                key: string;
                header: string;
                width?: string;
                sortable?: boolean;
                render?: (item: Record<string, unknown>) => React.ReactNode;
              }>
            }
            isLoading={isLoading}
          />
        </div>
      )}

      {/* VRF Services Table */}
      {gamingData && gamingData.randomNumberServices.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            {t('winklink.gaming.randomNumberServices')}
          </h3>
          <WinklinkDataTable
            data={gamingData.randomNumberServices as unknown as Record<string, unknown>[]}
            columns={
              vrfColumns as unknown as Array<{
                key: string;
                header: string;
                width?: string;
                sortable?: boolean;
                render?: (item: Record<string, unknown>) => React.ReactNode;
              }>
            }
            isLoading={isLoading}
          />
        </div>
      )}

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.gaming.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('winklink.gaming.vrfTitle')}:</span>{' '}
              {t('winklink.gaming.vrfDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('winklink.gaming.securityTitle')}:
              </span>{' '}
              {t('winklink.gaming.securityDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('winklink.gaming.responseTitle')}:
              </span>{' '}
              {t('winklink.gaming.responseDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('winklink.gaming.multiChainTitle')}:
              </span>{' '}
              {t('winklink.gaming.multiChainDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
