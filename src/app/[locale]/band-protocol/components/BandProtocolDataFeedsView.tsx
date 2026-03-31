'use client';

import { useState, useMemo, useCallback } from 'react';

import {
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import type { DataSourceCategory } from '@/lib/oracles/bandProtocol';

import { type BandProtocolDataFeedsViewProps } from '../types';

const ITEMS_PER_PAGE = 20;

const getCategoryConfig = (
  t: (key: string) => string
): Record<DataSourceCategory, { label: string; color: string }> => ({
  crypto: { label: t('band.bandProtocol.categories.crypto'), color: 'bg-blue-100 text-blue-700' },
  stablecoin: {
    label: t('band.bandProtocol.categories.stablecoin'),
    color: 'bg-emerald-100 text-emerald-700',
  },
  forex: { label: t('band.bandProtocol.categories.forex'), color: 'bg-cyan-100 text-cyan-700' },
  commodities: {
    label: t('band.bandProtocol.categories.commodities'),
    color: 'bg-amber-100 text-amber-700',
  },
  equities: {
    label: t('band.bandProtocol.categories.equities'),
    color: 'bg-pink-100 text-pink-700',
  },
  sports: {
    label: t('band.bandProtocol.categories.sports'),
    color: 'bg-purple-100 text-purple-700',
  },
  random: {
    label: t('band.bandProtocol.categories.random'),
    color: 'bg-indigo-100 text-indigo-700',
  },
});

function formatTimeAgo(
  timestamp: number,
  t: (key: string, params?: Record<string, string | number | Date>) => string
): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return t('band.bandProtocol.time.secondsAgo', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('band.bandProtocol.time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('band.bandProtocol.time.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('band.bandProtocol.time.daysAgo', { count: days });
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function BandProtocolDataFeedsView({
  dataSources,
  total,
  isLoading,
  error: propError,
  onRefresh,
}: BandProtocolDataFeedsViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<DataSourceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(() => {
    const categoryCounts: Record<string, number> = { all: total };
    dataSources.forEach((ds) => {
      categoryCounts[ds.category] = (categoryCounts[ds.category] || 0) + 1;
    });
    const categoryConfig = getCategoryConfig(t);
    return [
      { id: 'all' as const, label: t('band.bandProtocol.dataFeeds.allCategories'), count: total },
      ...Object.entries(categoryConfig).map(([id, config]) => ({
        id: id as DataSourceCategory,
        label: config.label,
        count: categoryCounts[id] || 0,
      })),
    ];
  }, [dataSources, total, t]);

  const filteredFeeds = useMemo(() => {
    let result = dataSources;

    if (selectedCategory !== 'all') {
      result = result.filter((feed) => feed.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (feed) =>
          feed.name.toLowerCase().includes(query) ||
          feed.symbol.toLowerCase().includes(query) ||
          feed.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [dataSources, selectedCategory, searchQuery]);

  const paginatedFeeds = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredFeeds.slice(start, end);
  }, [filteredFeeds, currentPage]);

  const stats = useMemo(() => {
    const activeCount = dataSources.filter((f) => f.status === 'active').length;
    const totalRequests = dataSources.reduce((acc, f) => acc + f.totalRequests, 0);
    const avgReliability =
      dataSources.length > 0
        ? dataSources.reduce((acc, f) => acc + f.reliability, 0) / dataSources.length
        : 0;

    return {
      total: dataSources.length,
      active: activeCount,
      totalRequests,
      avgReliability,
    };
  }, [dataSources]);

  const totalPages = Math.ceil(filteredFeeds.length / ITEMS_PER_PAGE);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((category: DataSourceCategory | 'all') => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const displayError = propError;

  if (displayError) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('band.bandProtocol.dataFeeds.loadError')}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {displayError.message || t('band.bandProtocol.dataFeeds.failedToLoad')}
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('band.bandProtocol.dataFeeds.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.dataFeeds.total')}
            </p>
            <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.dataFeeds.active')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">{stats.active}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.dataFeeds.totalRequests')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {formatNumber(stats.totalRequests)}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.dataFeeds.avgReliability')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {stats.avgReliability.toFixed(2)}%
            </p>
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('band.bandProtocol.dataFeeds.refresh')}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('band.bandProtocol.dataFeeds.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
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

      {searchQuery.trim() && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md">
          <Search className="w-4 h-4 text-blue-500" />
          <span>
            {t('band.bandProtocol.dataFeeds.searchResults', { count: filteredFeeds.length })}
          </span>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('band.bandProtocol.dataFeeds.title')}
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.feed')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.category')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.price')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.change24h')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.updateFreq')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.deviation')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.totalRequests')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.reliability')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.status')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.dataFeeds.lastUpdated')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedFeeds.map((feed) => {
                  const categoryConfig = getCategoryConfig(t);
                  return (
                    <tr key={feed.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{feed.name}</span>
                          <p className="text-xs text-gray-500">{feed.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            categoryConfig[feed.category]?.color || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {categoryConfig[feed.category]?.label || feed.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {feed.price !== undefined ? (
                          <span className="text-sm font-medium text-gray-900">
                            $
                            {feed.price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {t('band.bandProtocol.common.na')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {feed.change24h !== undefined && feed.price !== undefined ? (
                          <span
                            className={`text-sm font-medium ${
                              feed.change24h >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {feed.change24h >= 0 ? '+' : ''}
                            {((feed.change24h / feed.price) * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-900">{feed.updateFrequency}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-900">{feed.deviationThreshold}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-900">
                          {formatNumber(feed.totalRequests)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-medium ${
                            feed.reliability >= 99.95
                              ? 'text-emerald-600'
                              : feed.reliability >= 99.9
                                ? 'text-blue-600'
                                : 'text-amber-600'
                          }`}
                        >
                          {feed.reliability.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                            feed.status === 'active' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              feed.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {feed.status.charAt(0).toUpperCase() + feed.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(feed.lastUpdated, t)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-500">
            {t('band.bandProtocol.dataFeeds.showing')} {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredFeeds.length)}{' '}
            {t('band.bandProtocol.dataFeeds.of')} {filteredFeeds.length}{' '}
            {t('band.bandProtocol.dataFeeds.feeds')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('band.bandProtocol.dataFeeds.previous')}
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'text-white bg-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('band.bandProtocol.dataFeeds.next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('band.bandProtocol.dataFeeds.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('band.bandProtocol.dataFeeds.updateFrequency')}:
              </span>{' '}
              {t('band.bandProtocol.dataFeeds.frequencyDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('band.bandProtocol.dataFeeds.deviationThreshold')}:
              </span>{' '}
              {t('band.bandProtocol.dataFeeds.thresholdDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('band.bandProtocol.dataFeeds.reliability')}:
              </span>{' '}
              {t('band.bandProtocol.dataFeeds.reliabilityDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('band.bandProtocol.dataFeeds.decentralization')}:
              </span>{' '}
              {t('band.bandProtocol.dataFeeds.decentralizationDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
