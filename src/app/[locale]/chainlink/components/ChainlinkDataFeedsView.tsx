'use client';

import { useState, useEffect } from 'react';

import { Activity, CheckCircle2, Clock, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type DataFeed, type ChainlinkDataTableProps } from '../types';
import { getChainlinkService } from '../services/chainlinkService';

import { ChainlinkDataTable } from './ChainlinkDataTable';

export function ChainlinkDataFeedsView() {
  const t = useTranslations('chainlink');
  const [dataFeeds, setDataFeeds] = useState<DataFeed[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const service = getChainlinkService();
        const feeds = await service.getDataFeeds();
        setDataFeeds(feeds);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load data feeds'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const categories = [
    { id: 'all', label: t('dataFeedsFilter.all'), count: dataFeeds.length },
    {
      id: 'crypto',
      label: t('dataFeedsFilter.crypto'),
      count: dataFeeds.filter((f) => f.category === 'crypto').length,
    },
    {
      id: 'forex',
      label: t('dataFeedsFilter.forex'),
      count: dataFeeds.filter((f) => f.category === 'forex').length,
    },
    {
      id: 'commodities',
      label: t('dataFeedsFilter.commodities'),
      count: dataFeeds.filter((f) => f.category === 'commodities').length,
    },
    {
      id: 'defi',
      label: t('dataFeedsFilter.defi'),
      count: dataFeeds.filter((f) => f.category === 'defi').length,
    },
  ];

  const filteredFeeds =
    selectedCategory === 'all'
      ? dataFeeds
      : dataFeeds.filter((feed) => feed.category === selectedCategory);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">{t('common.loading')}</span>
      </div>
    );
  }

  if (error && dataFeeds.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dataFeeds.dataUnavailable')}</h3>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (dataFeeds.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Activity className="w-10 h-10 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dataFeeds.noFeedsFound')}</h3>
        <p className="text-sm text-gray-500">{t('dataFeeds.noFeedsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dataFeeds.total')}</p>
            <p className="text-xl font-semibold text-gray-900">{dataFeeds.length}</p>
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
              {dataFeeds.filter((f) => f.status === 'active').length}
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
              {(dataFeeds.reduce((acc, f) => acc + f.totalRequests, 0) / 1e6).toFixed(1)}M
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
                dataFeeds.reduce((acc, f) => acc + f.reliability, 0) / dataFeeds.length
              ).toFixed(2)}
              %
            </p>
          </div>
        </div>
      </div>

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
          {t('dataFeeds.title')}
        </h3>
        <ChainlinkDataTable<DataFeed> data={filteredFeeds} columns={columns} />
      </div>

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
