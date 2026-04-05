'use client';

import { useState } from 'react';

import { Activity, Zap, Users, BarChart3, TrendingUp, Server } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { type TRONDApp } from '@/lib/oracles/winklink';

import { type WinklinkTRONViewProps } from '../types';

import { WinklinkDataTable } from './WinklinkDataTable';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'defi', label: 'DeFi' },
  { id: 'nft', label: 'NFT' },
  { id: 'other', label: 'Other' },
];

export function WinklinkTRONView({ tronIntegration, isLoading }: WinklinkTRONViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 使用真实数据
  const networkStats = tronIntegration?.networkStats;
  const dApps = tronIntegration?.integratedDApps || [];

  // 空状态显示
  if (!tronIntegration && !isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Server className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('winklink.tron.noData')}</h3>
          <p className="text-sm text-gray-500 max-w-md">{t('winklink.tron.noDataDescription')}</p>
        </div>
      </div>
    );
  }

  const filteredDApps =
    selectedCategory === 'all' ? dApps : dApps.filter((dapp) => dapp.category === selectedCategory);

  const columns = [
    { key: 'name', header: t('winklink.tron.dappName'), sortable: true },
    {
      key: 'category',
      header: t('winklink.tron.category'),
      sortable: true,
      render: (item: TRONDApp) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {item.category}
        </span>
      ),
    },
    {
      key: 'users',
      header: t('winklink.tron.users'),
      sortable: true,
      render: (item: TRONDApp) => item.users.toLocaleString(),
    },
    {
      key: 'volume24h',
      header: t('winklink.tron.volume24h'),
      sortable: true,
      render: (item: TRONDApp) => `$${(item.volume24h / 1e6).toFixed(2)}M`,
    },
    {
      key: 'status',
      header: t('winklink.tron.status'),
      sortable: true,
      render: (item: TRONDApp) => (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            item.status === 'active' ? 'text-emerald-600' : 'text-gray-500'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
            }`}
          />
          {item.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      {networkStats && (
        <div className="flex flex-wrap items-center gap-6 md:gap-8">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.tps')}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {networkStats.tps ? `${networkStats.tps} TPS` : '-'}
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.blockHeight')}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {networkStats.blockHeight ? networkStats.blockHeight.toLocaleString() : '-'}
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.totalAccounts')}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {networkStats.totalAccounts
                  ? `${(networkStats.totalAccounts / 1e6).toFixed(0)}M+`
                  : '-'}
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.dailyActiveUsers')}
              </p>
              <p className="text-xl font-semibold text-emerald-600">
                {networkStats.dailyActiveUsers
                  ? `${(networkStats.dailyActiveUsers / 1e6).toFixed(1)}M+`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filters */}
      {dApps.length > 0 && (
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
            </button>
          ))}
        </div>
      )}

      {/* Data Table */}
      {dApps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            {t('winklink.tron.integratedDApps')}
          </h3>
          <WinklinkDataTable
            data={filteredDApps as unknown as Record<string, unknown>[]}
            columns={
              columns as unknown as Array<{
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

      {dApps.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg">
          <Activity className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">{t('winklink.tron.noDapps')}</p>
        </div>
      )}

      {/* Integration Stats */}
      {tronIntegration && (
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            {t('winklink.tron.integrationStats')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('winklink.tron.tvl')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {tronIntegration.totalValueLocked
                  ? `$${(tronIntegration.totalValueLocked / 1e9).toFixed(2)}B`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('winklink.tron.integrationCoverage')}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-pink-500 h-1.5 rounded-full"
                      style={{ width: `${(tronIntegration.integrationCoverage || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {tronIntegration.integrationCoverage
                    ? `${(tronIntegration.integrationCoverage * 100).toFixed(0)}%`
                    : '-'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{dApps.length} dApps integrated</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('winklink.tron.dailyTransactions')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {tronIntegration.dailyTransactions
                  ? `${(tronIntegration.dailyTransactions / 1e6).toFixed(2)}M`
                  : '-'}
              </p>
              {networkStats?.totalTransactions && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('winklink.tron.totalTransactions')}:{' '}
                  {networkStats.totalTransactions.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.tron.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('winklink.tron.networkPerformance')}:
              </span>{' '}
              {t('winklink.tron.performanceDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('winklink.tron.ecosystem')}:</span>{' '}
              {t('winklink.tron.ecosystemDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('winklink.tron.integrationCoverage')}:
              </span>{' '}
              {t('winklink.tron.coverageDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('winklink.tron.dataReliability')}:
              </span>{' '}
              {t('winklink.tron.reliabilityDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
