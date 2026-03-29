'use client';

import { useState, useMemo } from 'react';

import { Activity, CheckCircle2, Clock, TrendingUp, Eye } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type PriceFeed } from '../types';
import { PriceFeedDetailModal } from './PriceFeedDetailModal';

const mockPriceFeeds: PriceFeed[] = [
  {
    id: '1',
    name: 'BTC/USD',
    category: 'crypto',
    updateFrequency: '400ms',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 12500000,
    reliability: 99.99,
  },
  {
    id: '2',
    name: 'ETH/USD',
    category: 'crypto',
    updateFrequency: '400ms',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 15200000,
    reliability: 99.99,
  },
  {
    id: '3',
    name: 'SOL/USD',
    category: 'crypto',
    updateFrequency: '400ms',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 8900000,
    reliability: 99.98,
  },
  {
    id: '4',
    name: 'EUR/USD',
    category: 'forex',
    updateFrequency: '1s',
    deviationThreshold: '0.05%',
    status: 'active',
    totalRequests: 5600000,
    reliability: 99.97,
  },
  {
    id: '5',
    name: 'GBP/USD',
    category: 'forex',
    updateFrequency: '1s',
    deviationThreshold: '0.05%',
    status: 'active',
    totalRequests: 3200000,
    reliability: 99.96,
  },
  {
    id: '6',
    name: 'XAU/USD',
    category: 'commodities',
    updateFrequency: '2s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 2100000,
    reliability: 99.95,
  },
  {
    id: '7',
    name: 'AAPL/USD',
    category: 'equities',
    updateFrequency: '3s',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 7800000,
    reliability: 99.98,
  },
  {
    id: '8',
    name: 'TSLA/USD',
    category: 'equities',
    updateFrequency: '3s',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 9200000,
    reliability: 99.98,
  },
  {
    id: '9',
    name: 'NVDA/USD',
    category: 'equities',
    updateFrequency: '3s',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 8500000,
    reliability: 99.97,
  },
  {
    id: '10',
    name: 'JPY/USD',
    category: 'forex',
    updateFrequency: '1s',
    deviationThreshold: '0.05%',
    status: 'active',
    totalRequests: 4100000,
    reliability: 99.96,
  },
];

export function PythPriceFeedsView({ isLoading }: { isLoading?: boolean }) {
  const t = useTranslations();
  const tPyth = useTranslations('pyth');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeed, setSelectedFeed] = useState<PriceFeed | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categories = [
    { id: 'all', label: tPyth('categories.all'), count: mockPriceFeeds.length },
    {
      id: 'crypto',
      label: tPyth('categories.crypto'),
      count: mockPriceFeeds.filter((f) => f.category === 'crypto').length,
    },
    {
      id: 'forex',
      label: tPyth('categories.forex'),
      count: mockPriceFeeds.filter((f) => f.category === 'forex').length,
    },
    {
      id: 'commodities',
      label: tPyth('categories.commodities'),
      count: mockPriceFeeds.filter((f) => f.category === 'commodities').length,
    },
    {
      id: 'equities',
      label: tPyth('categories.equities'),
      count: mockPriceFeeds.filter((f) => f.category === 'equities').length,
    },
  ];

  const handleFeedClick = (feed: PriceFeed) => {
    setSelectedFeed(feed);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFeed(null);
  };

  const filteredFeeds =
    selectedCategory === 'all'
      ? mockPriceFeeds
      : mockPriceFeeds.filter((feed) => feed.category === selectedCategory);

  const totalRequests = mockPriceFeeds.reduce((acc, f) => acc + f.totalRequests, 0);
  const avgReliability = (
    mockPriceFeeds.reduce((acc, f) => acc + f.reliability, 0) / mockPriceFeeds.length
  ).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.total') || 'Total Feeds'}
            </p>
            <p className="text-xl font-semibold text-gray-900">{mockPriceFeeds.length}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.active') || 'Active'}
            </p>
            <p className="text-xl font-semibold text-emerald-600">
              {mockPriceFeeds.filter((f) => f.status === 'active').length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.totalRequests') || 'Total Requests'}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {(totalRequests / 1e6).toFixed(1)}M
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.avgReliability') || 'Avg Reliability'}
            </p>
            <p className="text-xl font-semibold text-gray-900">{avgReliability}%</p>
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
          {t('pyth.priceFeeds.title') || 'Price Feeds'}
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.priceFeeds.name') || 'Name'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.priceFeeds.category') || 'Category'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.priceFeeds.frequency') || 'Update Frequency'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.priceFeeds.threshold') || 'Deviation Threshold'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.priceFeeds.status') || 'Status'}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.priceFeeds.reliability') || 'Reliability'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFeeds.map((feed) => (
                <tr
                  key={feed.id}
                  onClick={() => handleFeedClick(feed)}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{feed.name}</span>
                      <Eye className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                      {feed.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{feed.updateFrequency}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{feed.deviationThreshold}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                        feed.status === 'active'
                          ? 'text-emerald-600'
                          : feed.status === 'paused'
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          feed.status === 'active'
                            ? 'bg-emerald-500'
                            : feed.status === 'paused'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                      />
                      {feed.status === 'active'
                        ? tPyth('status.active')
                        : feed.status === 'paused'
                          ? tPyth('status.paused')
                          : tPyth('status.offline')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                    {feed.reliability}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('pyth.priceFeeds.about') || 'About Price Feeds'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('pyth.priceFeeds.updateFrequency') || 'Update Frequency'}:
              </span>{' '}
              {t('pyth.priceFeeds.frequencyDesc') ||
                'Pyth price feeds update based on sub-second intervals, providing near real-time price data from first-party sources.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('pyth.priceFeeds.deviationThreshold') || 'Deviation Threshold'}:
              </span>{' '}
              {t('pyth.priceFeeds.thresholdDesc') ||
                'Minimum price change required to trigger a new update on-chain.'}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('pyth.priceFeeds.reliability') || 'Reliability'}:
              </span>{' '}
              {t('pyth.priceFeeds.reliabilityDesc') ||
                'Percentage of successful updates over the last 30 days, maintained by publisher consensus.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('pyth.priceFeeds.firstParty') || 'First-Party Data'}:
              </span>{' '}
              {t('pyth.priceFeeds.firstPartyDesc') ||
                'Data comes directly from leading trading firms and exchanges, not aggregated from third parties.'}
            </p>
          </div>
        </div>
      </div>

      {selectedFeed && (
        <PriceFeedDetailModal
          priceFeed={selectedFeed}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
