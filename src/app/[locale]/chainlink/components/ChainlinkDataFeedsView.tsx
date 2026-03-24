'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChainlinkDataTable } from './ChainlinkDataTable';
import { DataFeed } from '../types';

const mockDataFeeds: DataFeed[] = [
  { id: '1', name: 'ETH/USD', category: 'crypto', updateFrequency: '60s', deviationThreshold: '0.5%', status: 'active', totalRequests: 12500000, reliability: 99.99 },
  { id: '2', name: 'BTC/USD', category: 'crypto', updateFrequency: '60s', deviationThreshold: '0.5%', status: 'active', totalRequests: 15200000, reliability: 99.99 },
  { id: '3', name: 'LINK/USD', category: 'crypto', updateFrequency: '60s', deviationThreshold: '1%', status: 'active', totalRequests: 8900000, reliability: 99.98 },
  { id: '4', name: 'EUR/USD', category: 'forex', updateFrequency: '300s', deviationThreshold: '0.1%', status: 'active', totalRequests: 5600000, reliability: 99.97 },
  { id: '5', name: 'GBP/USD', category: 'forex', updateFrequency: '300s', deviationThreshold: '0.1%', status: 'active', totalRequests: 3200000, reliability: 99.96 },
  { id: '6', name: 'XAU/USD', category: 'commodities', updateFrequency: '600s', deviationThreshold: '0.2%', status: 'active', totalRequests: 2100000, reliability: 99.95 },
  { id: '7', name: 'Aave V2', category: 'defi', updateFrequency: '120s', deviationThreshold: '0.5%', status: 'active', totalRequests: 7800000, reliability: 99.98 },
  { id: '8', name: 'Uniswap V3', category: 'defi', updateFrequency: '120s', deviationThreshold: '0.5%', status: 'active', totalRequests: 9200000, reliability: 99.98 },
];

const categories = [
  { id: 'all', label: 'All', count: mockDataFeeds.length },
  { id: 'crypto', label: 'Crypto', count: mockDataFeeds.filter(f => f.category === 'crypto').length },
  { id: 'forex', label: 'Forex', count: mockDataFeeds.filter(f => f.category === 'forex').length },
  { id: 'commodities', label: 'Commodities', count: mockDataFeeds.filter(f => f.category === 'commodities').length },
  { id: 'defi', label: 'DeFi', count: mockDataFeeds.filter(f => f.category === 'defi').length },
];

export function ChainlinkDataFeedsView() {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredFeeds = selectedCategory === 'all'
    ? mockDataFeeds
    : mockDataFeeds.filter(feed => feed.category === selectedCategory);

  const columns = [
    { key: 'name', header: t('chainlink.dataFeeds.name'), sortable: true },
    {
      key: 'category',
      header: t('chainlink.dataFeeds.category'),
      sortable: true,
      render: (item: DataFeed) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {item.category}
        </span>
      ),
    },
    { key: 'updateFrequency', header: t('chainlink.dataFeeds.frequency'), sortable: true },
    { key: 'deviationThreshold', header: t('chainlink.dataFeeds.threshold'), sortable: true },
    {
      key: 'status',
      header: t('chainlink.dataFeeds.status'),
      sortable: true,
      render: (item: DataFeed) => (
        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
          item.status === 'active' ? 'text-emerald-600' :
          item.status === 'paused' ? 'text-amber-600' : 'text-red-600'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            item.status === 'active' ? 'bg-emerald-500' :
            item.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'
          }`} />
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'totalRequests',
      header: t('chainlink.dataFeeds.requests'),
      sortable: true,
      render: (item: DataFeed) => `${(item.totalRequests / 1e6).toFixed(1)}M`,
    },
    {
      key: 'reliability',
      header: t('chainlink.dataFeeds.reliability'),
      sortable: true,
      render: (item: DataFeed) => `${item.reliability}%`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {category.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selectedCategory === category.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {category.count}
            </span>
          </button>
        ))}
      </div>

      <ChainlinkDataTable data={filteredFeeds as unknown as Record<string, unknown>[]} columns={columns as unknown as Array<{key: string; header: string; width?: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode}>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('chainlink.dataFeeds.total')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{mockDataFeeds.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('chainlink.dataFeeds.active')}</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {mockDataFeeds.filter(f => f.status === 'active').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('chainlink.dataFeeds.totalRequests')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(mockDataFeeds.reduce((acc, f) => acc + f.totalRequests, 0) / 1e6).toFixed(1)}M
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('chainlink.dataFeeds.avgReliability')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(mockDataFeeds.reduce((acc, f) => acc + f.reliability, 0) / mockDataFeeds.length).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
