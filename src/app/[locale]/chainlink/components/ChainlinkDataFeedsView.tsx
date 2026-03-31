'use client';

import { useState } from 'react';

import { Activity, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type DataFeed, type ChainlinkDataTableProps } from '../types';

import { ChainlinkDataTable } from './ChainlinkDataTable';

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
];

const getCategories = (t: (key: string) => string) => [
  { id: 'all', label: t('dataFeedsFilter.all'), count: mockDataFeeds.length },
  {
    id: 'crypto',
    label: t('dataFeedsFilter.crypto'),
    count: mockDataFeeds.filter((f) => f.category === 'crypto').length,
  },
  {
    id: 'forex',
    label: t('dataFeedsFilter.forex'),
    count: mockDataFeeds.filter((f) => f.category === 'forex').length,
  },
  {
    id: 'commodities',
    label: t('dataFeedsFilter.commodities'),
    count: mockDataFeeds.filter((f) => f.category === 'commodities').length,
  },
  {
    id: 'defi',
    label: t('dataFeedsFilter.defi'),
    count: mockDataFeeds.filter((f) => f.category === 'defi').length,
  },
];

export function ChainlinkDataFeedsView() {
  const t = useTranslations('chainlink');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = getCategories(t);

  const filteredFeeds =
    selectedCategory === 'all'
      ? mockDataFeeds
      : mockDataFeeds.filter((feed) => feed.category === selectedCategory);

  const columns: ChainlinkDataTableProps<DataFeed>['columns'] = [
    { key: 'name', header: t('dataFeeds.name'), sortable: true },
    {
      key: 'category',
      header: t('dataFeeds.category'),
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {item.category}
        </span>
      ),
    },
    { key: 'updateFrequency', header: t('dataFeeds.frequency'), sortable: true },
    { key: 'deviationThreshold', header: t('dataFeeds.threshold'), sortable: true },
    {
      key: 'status',
      header: t('dataFeeds.status'),
      sortable: true,
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            item.status === 'active'
              ? 'text-emerald-600'
              : item.status === 'paused'
                ? 'text-amber-600'
                : 'text-red-600'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === 'active'
                ? 'bg-emerald-500'
                : item.status === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
          />
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'totalRequests',
      header: t('dataFeeds.requests'),
      sortable: true,
      render: (item) => `${(item.totalRequests / 1e6).toFixed(1)}M`,
    },
    {
      key: 'reliability',
      header: t('dataFeeds.reliability'),
      sortable: true,
      render: (item) => `${item.reliability}%`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dataFeeds.total')}</p>
            <p className="text-xl font-semibold text-gray-900">{mockDataFeeds.length}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('dataFeeds.active')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">
              {mockDataFeeds.filter((f) => f.status === 'active').length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('dataFeeds.totalRequests')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {(mockDataFeeds.reduce((acc, f) => acc + f.totalRequests, 0) / 1e6).toFixed(1)}M
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('dataFeeds.avgReliability')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {(
                mockDataFeeds.reduce((acc, f) => acc + f.reliability, 0) / mockDataFeeds.length
              ).toFixed(2)}
              %
            </p>
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

      {/* Data Table */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('dataFeeds.title')}
        </h3>
        <ChainlinkDataTable<DataFeed> data={filteredFeeds} columns={columns} />
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('dataFeeds.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('dataFeeds.updateFrequency')}:</span>{' '}
              {t('dataFeeds.frequencyDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('dataFeeds.deviationThreshold')}:
              </span>{' '}
              {t('dataFeeds.thresholdDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('dataFeeds.reliability')}:</span>{' '}
              {t('dataFeeds.reliabilityDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('dataFeeds.decentralization')}:</span>{' '}
              {t('dataFeeds.decentralizationDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
