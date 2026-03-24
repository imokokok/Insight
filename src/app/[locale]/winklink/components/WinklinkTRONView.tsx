'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { WinklinkTRONViewProps } from '../types';

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

  const stats = [
    {
      label: t('winklink.tron.tps'),
      value: networkStats?.tps?.toString() || '65',
      unit: 'TPS',
    },
    {
      label: t('winklink.tron.blockHeight'),
      value: networkStats?.blockHeight?.toLocaleString() || '65M+',
    },
    {
      label: t('winklink.tron.totalAccounts'),
      value: `${((networkStats?.totalAccounts || 180000000) / 1e6).toFixed(0)}M+`,
    },
    {
      label: t('winklink.tron.dailyActiveUsers'),
      value: `${((networkStats?.dailyActiveUsers || 2500000) / 1e6).toFixed(1)}M+`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.unit && <span className="text-sm text-gray-500">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('winklink.tron.integratedDApps')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('winklink.tron.dappName')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('winklink.tron.category')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('winklink.tron.users')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('winklink.tron.volume24h')}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    {t('winklink.tron.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDApps.map((dapp) => (
                  <tr key={dapp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {dapp.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {dapp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {dapp.users.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ${(dapp.volume24h / 1e6).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        dapp.status === 'active' ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          dapp.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        {dapp.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('winklink.tron.tvl')}
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              ${((tronIntegration?.totalValueLocked || 450000000) / 1e9).toFixed(2)}B
            </p>
            <p className="text-sm text-emerald-600 mt-1">+5.2%</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('winklink.tron.integrationCoverage')}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-pink-500 h-3 rounded-full"
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

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('winklink.tron.dailyTransactions')}
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {((tronIntegration?.dailyTransactions || 2500000) / 1e6).toFixed(2)}M
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('winklink.tron.totalTransactions')}: {(networkStats?.totalTransactions || 8500000000).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
