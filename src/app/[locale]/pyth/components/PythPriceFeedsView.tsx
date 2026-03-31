'use client';

import { useState, useMemo } from 'react';

import {
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  Eye,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import { usePythPriceFeeds } from '@/hooks/oracles/pyth';
import { useTranslations } from '@/i18n';

import { type PriceFeed } from '../types';

import { PriceFeedDetailModal } from './PriceFeedDetailModal';

export function PythPriceFeedsView({ isLoading: externalLoading }: { isLoading?: boolean }) {
  const t = useTranslations();
  const tPyth = useTranslations('pyth');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeed, setSelectedFeed] = useState<PriceFeed | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { priceFeeds, error, isLoading: dataLoading, refetch } = usePythPriceFeeds();
  const isLoading = externalLoading || dataLoading;

  const categories = useMemo(
    () => [
      { id: 'all', label: tPyth('categories.all'), count: priceFeeds.length },
      {
        id: 'crypto',
        label: tPyth('categories.crypto'),
        count: priceFeeds.filter((f) => f.category === 'crypto').length,
      },
      {
        id: 'forex',
        label: tPyth('categories.forex'),
        count: priceFeeds.filter((f) => f.category === 'forex').length,
      },
      {
        id: 'commodities',
        label: tPyth('categories.commodities'),
        count: priceFeeds.filter((f) => f.category === 'commodities').length,
      },
      {
        id: 'equities',
        label: tPyth('categories.equities'),
        count: priceFeeds.filter((f) => f.category === 'equities').length,
      },
    ],
    [priceFeeds, tPyth]
  );

  const handleFeedClick = (feed: PriceFeed) => {
    setSelectedFeed(feed);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFeed(null);
  };

  const filteredFeeds = useMemo(
    () =>
      selectedCategory === 'all'
        ? priceFeeds
        : priceFeeds.filter((feed) => feed.category === selectedCategory),
    [priceFeeds, selectedCategory]
  );

  const totalRequests = priceFeeds.reduce((acc, f) => acc + f.totalRequests, 0);
  const avgReliability =
    priceFeeds.length > 0
      ? (priceFeeds.reduce((acc, f) => acc + f.reliability, 0) / priceFeeds.length).toFixed(2)
      : '0.00';

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">{t('pyth.priceFeeds.error')}</p>
              <p className="text-xs text-red-600">{error.message}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.total')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {isLoading ? '-' : priceFeeds.length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.active')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">
              {isLoading ? '-' : priceFeeds.filter((f) => f.status === 'active').length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.totalRequests')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {isLoading ? '-' : `${(totalRequests / 1e6).toFixed(1)}M`}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('pyth.priceFeeds.avgReliability')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {isLoading ? '-' : `${avgReliability}%`}
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

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('pyth.priceFeeds.title')}
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500">{t('common.loading')}</p>
            </div>
          ) : filteredFeeds.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">{t('pyth.priceFeeds.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.priceFeeds.name')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.priceFeeds.category')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.priceFeeds.frequency')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.priceFeeds.threshold')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.priceFeeds.status')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.priceFeeds.reliability')}
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
                      {feed.reliability.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('pyth.priceFeeds.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('pyth.priceFeeds.updateFrequency')}:
              </span>{' '}
              {t('pyth.priceFeeds.frequencyDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('pyth.priceFeeds.deviationThreshold')}:
              </span>{' '}
              {t('pyth.priceFeeds.thresholdDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('pyth.priceFeeds.reliability')}:</span>{' '}
              {t('pyth.priceFeeds.reliabilityDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('pyth.priceFeeds.firstParty')}:</span>{' '}
              {t('pyth.priceFeeds.firstPartyDesc')}
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
