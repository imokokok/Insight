'use client';

import { useState } from 'react';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';

interface DataFeed {
  id: string;
  name: string;
  category: string;
  updateFrequency: string;
  deviationThreshold: string;
  status: 'active' | 'paused' | 'deprecated';
  totalRequests: number;
  reliability: number;
}

interface CategoryData {
  name: string;
  count: number;
  color: string;
}

const mockDataFeeds: DataFeed[] = [
  {
    id: '1',
    name: 'ETH/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 12500000,
    reliability: 99.99,
  },
  {
    id: '2',
    name: 'BTC/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 15200000,
    reliability: 99.99,
  },
  {
    id: '3',
    name: 'LINK/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '1%',
    status: 'active',
    totalRequests: 8900000,
    reliability: 99.98,
  },
  {
    id: '4',
    name: 'EUR/USD',
    category: 'forex',
    updateFrequency: '300s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 5600000,
    reliability: 99.97,
  },
  {
    id: '5',
    name: 'GBP/USD',
    category: 'forex',
    updateFrequency: '300s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 3200000,
    reliability: 99.96,
  },
  {
    id: '6',
    name: 'XAU/USD',
    category: 'commodities',
    updateFrequency: '600s',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 2100000,
    reliability: 99.95,
  },
  {
    id: '7',
    name: 'Aave V2',
    category: 'defi',
    updateFrequency: '120s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 7800000,
    reliability: 99.98,
  },
  {
    id: '8',
    name: 'Uniswap V3',
    category: 'defi',
    updateFrequency: '120s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 9200000,
    reliability: 99.98,
  },
  {
    id: '9',
    name: 'S&P 500',
    category: 'indices',
    updateFrequency: '3600s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 1500000,
    reliability: 99.94,
  },
  {
    id: '10',
    name: 'NFT Floor Price',
    category: 'nft',
    updateFrequency: '1800s',
    deviationThreshold: '2%',
    status: 'active',
    totalRequests: 890000,
    reliability: 99.92,
  },
];

const categoryData: CategoryData[] = [
  { name: 'crypto', count: 485, color: 'bg-primary-500' },
  { name: 'defi', count: 312, color: 'bg-success-500' },
  { name: 'forex', count: 156, color: 'bg-purple-500' },
  { name: 'commodities', count: 89, color: 'bg-warning-500' },
  { name: 'indices', count: 67, color: 'bg-danger-500' },
  { name: 'nft', count: 45, color: 'bg-pink-500' },
  { name: 'gaming', count: 34, color: 'bg-indigo-500' },
  { name: 'derivatives', count: 28, color: 'bg-cyan-500' },
  { name: 'synthetics', count: 27, color: 'bg-warning-500' },
];

export function ChainlinkDataFeedsPanel() {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFeeds = selectedCategory
    ? mockDataFeeds.filter((feed) => feed.category === selectedCategory)
    : mockDataFeeds;

  const totalFeeds = 1243;
  const activeFeeds = 1208;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title={t('chainlink.dataFeeds.totalDataFeeds')}>
          <div className="text-3xl font-bold text-gray-900">{totalFeeds.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.dataFeeds.activeFeeds')}: {activeFeeds}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.dataFeeds.categories')}>
          <div className="text-3xl font-bold text-gray-900">{categoryData.length}</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.dataFeeds.defi')}, {t('chainlink.dataFeeds.crypto')},{' '}
            {t('chainlink.dataFeeds.forex')}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.dataFeeds.usageStats')}>
          <div className="text-3xl font-bold text-gray-900">2.8B</div>
          <div className="text-sm text-gray-500 mt-1">{t('chainlink.dataFeeds.totalRequests')}</div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.dataFeeds.feedPerformance')}>
          <div className="text-3xl font-bold text-success-600">99.97%</div>
          <div className="text-sm text-gray-500 mt-1">{t('chainlink.dataFeeds.reliability')}</div>
        </DashboardCard>
      </div>

      {/* Categories */}
      <DashboardCard title={t('chainlink.dataFeeds.feedsByCategory')}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categoryData.map((category) => (
            <button
              key={category.name}
              onClick={() =>
                setSelectedCategory(selectedCategory === category.name ? null : category.name)
              }
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedCategory === category.name
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {t(`chainlink.dataFeeds.${category.name}`)}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900">{category.count}</div>
            </button>
          ))}
        </div>
      </DashboardCard>

      {/* Data Feeds Table */}
      <DashboardCard title={t('chainlink.dataFeeds.mostPopular')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-gray-600 font-medium">
                  {t('chainlink.dataFeeds.feedName')}
                </th>
                <th className="text-left py-3 text-gray-600 font-medium">
                  {t('chainlink.dataFeeds.category')}
                </th>
                <th className="text-right py-3 text-gray-600 font-medium">
                  {t('chainlink.dataFeeds.updateFrequency')}
                </th>
                <th className="text-right py-3 text-gray-600 font-medium">
                  {t('chainlink.dataFeeds.deviationThreshold')}
                </th>
                <th className="text-center py-3 text-gray-600 font-medium">
                  {t('chainlink.dataFeeds.status')}
                </th>
                <th className="text-right py-3 text-gray-600 font-medium">
                  {t('chainlink.dataFeeds.totalRequests')}
                </th>
                <th className="text-right py-3 text-gray-600 font-medium">
                  {t('chainlink.dataFeeds.reliability')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFeeds.map((feed) => (
                <tr key={feed.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 text-gray-900 font-medium">{feed.name}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                      {t(`chainlink.dataFeeds.${feed.category}`)}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-600">{feed.updateFrequency}</td>
                  <td className="py-3 text-right text-gray-600">{feed.deviationThreshold}</td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        feed.status === 'active'
                          ? 'bg-success-100 text-success-700'
                          : feed.status === 'paused'
                            ? 'bg-warning-100 text-warning-700'
                            : 'bg-danger-100 text-danger-700'
                      }`}
                    >
                      {t(`chainlink.dataFeeds.${feed.status}`)}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {(feed.totalRequests / 1e6).toFixed(1)}M
                  </td>
                  <td className="py-3 text-right text-success-600">{feed.reliability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
