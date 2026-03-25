'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { WinklinkDataTable } from './WinklinkDataTable';
import { WinklinkTRONViewProps } from '../types';
import { TRONDApp } from '@/lib/oracles/winklink';
import { Activity, Zap, Users, BarChart3 } from 'lucide-react';

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

  const networkStats = tronIntegration?.networkStats;
  const dApps = tronIntegration?.integratedDApps || [];

  const filteredDApps = selectedCategory === 'all'
    ? dApps
    : dApps.filter(dapp => dapp.category === selectedCategory);

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
        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
          item.status === 'active' ? 'text-emerald-600' : 'text-gray-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            item.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
          }`} />
          {item.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.tron.tps')}</p>
            <p className="text-xl font-semibold text-gray-900">{networkStats?.tps?.toString() || '65'} TPS</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.tron.blockHeight')}</p>
            <p className="text-xl font-semibold text-gray-900">{networkStats?.blockHeight?.toLocaleString() || '65M+'}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.tron.totalAccounts')}</p>
            <p className="text-xl font-semibold text-gray-900">{((networkStats?.totalAccounts || 180000000) / 1e6).toFixed(0)}M+</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.tron.dailyActiveUsers')}</p>
            <p className="text-xl font-semibold text-emerald-600">{((networkStats?.dailyActiveUsers || 2500000) / 1e6).toFixed(1)}M+</p>
          </div>
        </div>
      </div>

      {/* Category Filters */}
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

      {/* Data Table */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.tron.integratedDApps')}
        </h3>
        <WinklinkDataTable 
          data={filteredDApps as unknown as Record<string, unknown>[]} 
          columns={columns as unknown as Array<{key: string; header: string; width?: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode}>} 
          isLoading={isLoading}
        />
      </div>

      {/* Integration Stats */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.tron.integrationStats') || 'Integration Stats'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('winklink.tron.tvl')}</p>
            <p className="text-2xl font-bold text-gray-900">
              ${((tronIntegration?.totalValueLocked || 450000000) / 1e9).toFixed(2)}B
            </p>
            <p className="text-sm text-emerald-600 mt-1">+5.2%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('winklink.tron.integrationCoverage')}</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-pink-500 h-1.5 rounded-full"
                    style={{ width: `${(tronIntegration?.integrationCoverage || 0.85) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {((tronIntegration?.integrationCoverage || 0.85) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {dApps.length} dApps integrated
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('winklink.tron.dailyTransactions')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {((tronIntegration?.dailyTransactions || 2500000) / 1e6).toFixed(2)}M
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('winklink.tron.totalTransactions')}: {(networkStats?.totalTransactions || 8500000000).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.tron.about') || 'About TRON Integration'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('winklink.tron.networkPerformance') || 'Network Performance'}:</span>
              {' '}{t('winklink.tron.performanceDesc') || 'TRON network provides high throughput with 65+ TPS and low transaction costs, making it ideal for oracle data feeds.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('winklink.tron.ecosystem') || 'Ecosystem'}:</span>
              {' '}{t('winklink.tron.ecosystemDesc') || 'Winklink is the official oracle solution on TRON, powering DeFi, gaming, and NFT applications with reliable price data.'}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('winklink.tron.integrationCoverage') || 'Integration Coverage'}:</span>
              {' '}{t('winklink.tron.coverageDesc') || 'Percentage of major dApps on TRON that have integrated Winklink oracle services for price feeds.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('winklink.tron.dataReliability') || 'Data Reliability'}:</span>
              {' '}{t('winklink.tron.reliabilityDesc') || 'Winklink aggregates data from multiple sources to ensure accurate and tamper-proof price feeds.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
