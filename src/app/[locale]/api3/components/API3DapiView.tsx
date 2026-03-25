'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { ChainlinkDataTable } from '../../chainlink/components/ChainlinkDataTable';
import { DapiFeed, API3DapiViewProps } from '../types';
import { Activity } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { Clock } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

const mockDapiFeeds: DapiFeed[] = [
  { id: '1', name: 'ETH/USD', category: 'crypto', updateFrequency: '10s', deviationThreshold: '0.5%', status: 'active', totalRequests: 8500000, reliability: 99.98 },
  { id: '2', name: 'BTC/USD', category: 'crypto', updateFrequency: '10s', deviationThreshold: '0.5%', status: 'active', totalRequests: 9200000, reliability: 99.97 },
  { id: '3', name: 'API3/USD', category: 'crypto', updateFrequency: '30s', deviationThreshold: '1%', status: 'active', totalRequests: 4500000, reliability: 99.95 },
  { id: '4', name: 'EUR/USD', category: 'forex', updateFrequency: '60s', deviationThreshold: '0.1%', status: 'active', totalRequests: 3200000, reliability: 99.96 },
  { id: '5', name: 'GBP/USD', category: 'forex', updateFrequency: '60s', deviationThreshold: '0.1%', status: 'active', totalRequests: 2100000, reliability: 99.94 },
  { id: '6', name: 'XAU/USD', category: 'commodities', updateFrequency: '300s', deviationThreshold: '0.2%', status: 'active', totalRequests: 1800000, reliability: 99.93 },
  { id: '7', name: 'AAPL/USD', category: 'stocks', updateFrequency: '600s', deviationThreshold: '0.5%', status: 'active', totalRequests: 1200000, reliability: 99.92 },
  { id: '8', name: 'TSLA/USD', category: 'stocks', updateFrequency: '600s', deviationThreshold: '0.5%', status: 'paused', totalRequests: 980000, reliability: 99.90 },
];

const categories = [
  { id: 'all', label: 'All', count: mockDapiFeeds.length },
  { id: 'crypto', label: 'Crypto', count: mockDapiFeeds.filter(f => f.category === 'crypto').length },
  { id: 'forex', label: 'Forex', count: mockDapiFeeds.filter(f => f.category === 'forex').length },
  { id: 'commodities', label: 'Commodities', count: mockDapiFeeds.filter(f => f.category === 'commodities').length },
  { id: 'stocks', label: 'Stocks', count: mockDapiFeeds.filter(f => f.category === 'stocks').length },
];

export function API3DapiView(_props: API3DapiViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredFeeds = selectedCategory === 'all'
    ? mockDapiFeeds
    : mockDapiFeeds.filter(feed => feed.category === selectedCategory);

  const columns = [
    { key: 'name', header: t('api3.dapi.name') || 'Name', sortable: true },
    {
      key: 'category',
      header: t('api3.dapi.category') || 'Category',
      sortable: true,
      render: (item: DapiFeed) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {item.category}
        </span>
      ),
    },
    { key: 'updateFrequency', header: t('api3.dapi.frequency') || 'Update Frequency', sortable: true },
    { key: 'deviationThreshold', header: t('api3.dapi.threshold') || 'Deviation Threshold', sortable: true },
    {
      key: 'status',
      header: t('api3.dapi.status') || 'Status',
      sortable: true,
      render: (item: DapiFeed) => (
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
      header: t('api3.dapi.requests') || 'Requests',
      sortable: true,
      render: (item: DapiFeed) => `${(item.totalRequests / 1e6).toFixed(1)}M`,
    },
    {
      key: 'reliability',
      header: t('api3.dapi.reliability') || 'Reliability',
      sortable: true,
      render: (item: DapiFeed) => `${item.reliability}%`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.total') || 'Total dAPIs'}</p>
            <p className="text-xl font-semibold text-gray-900">{mockDapiFeeds.length}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.active') || 'Active'}</p>
            <p className="text-xl font-semibold text-emerald-600">
              {mockDapiFeeds.filter(f => f.status === 'active').length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.totalRequests') || 'Total Requests'}</p>
            <p className="text-xl font-semibold text-gray-900">
              {(mockDapiFeeds.reduce((acc, f) => acc + f.totalRequests, 0) / 1e6).toFixed(1)}M
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.avgReliability') || 'Avg Reliability'}</p>
            <p className="text-xl font-semibold text-gray-900">
              {(mockDapiFeeds.reduce((acc, f) => acc + f.reliability, 0) / mockDapiFeeds.length).toFixed(2)}%
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
            <span className={`text-xs ${
              selectedCategory === category.id ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('api3.dapi.dataFeeds') || 'Data Feeds'}
        </h3>
        <ChainlinkDataTable 
          data={filteredFeeds as unknown as Record<string, unknown>[]} 
          columns={columns as unknown as Array<{key: string; header: string; width?: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode}>} 
        />
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('api3.dapi.about') || 'About Data Feeds'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('api3.dapi.updateFrequency') || 'Update Frequency'}:</span>
              {' '}{t('api3.dapi.frequencyDesc') || 'dAPIs are updated based on deviation thresholds and heartbeat intervals to ensure price accuracy.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('api3.dapi.deviationThreshold') || 'Deviation Threshold'}:</span>
              {' '}{t('api3.dapi.thresholdDesc') || 'Minimum price change required to trigger a new on-chain update.'}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('api3.dapi.reliability') || 'Reliability'}:</span>
              {' '}{t('api3.dapi.reliabilityDesc') || 'Percentage of successful updates over the last 30 days, excluding planned maintenance.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('api3.dapi.decentralization') || 'Decentralization'}:</span>
              {' '}{t('api3.dapi.decentralizationDesc') || 'Each dAPI is secured by multiple independent first-party oracles.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
