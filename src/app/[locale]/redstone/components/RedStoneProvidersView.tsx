'use client';

import { useState, useMemo } from 'react';

import { Database, Clock, CheckCircle2, Star, ArrowUpDown, TrendingUp, Filter } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type RedStoneProvidersViewProps, type FilterOption } from '../types';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function RedStoneProvidersView({
  providers,
  metrics,
  isLoading,
}: RedStoneProvidersViewProps) {
  const t = useTranslations();
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'reputation',
    direction: 'desc',
  });

  const providerCount = providers?.length || 4;
  const avgReputation = metrics?.avgProviderReputation
    ? (metrics.avgProviderReputation * 100).toFixed(1)
    : '93.5';

  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    let filtered = [...providers];

    if (filterBy === 'highReputation') {
      filtered = filtered.filter((p) => p.reputation >= 0.9);
    } else if (filterBy === 'mostData') {
      filtered = filtered.filter((p) => p.dataPoints >= 500000);
    }

    return filtered;
  }, [providers, filterBy]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key !== key) {
        return { key, direction: 'desc' };
      }
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const tableData = useMemo(() => {
    const data = [...filteredProviders];
    if (sortConfig.key === 'reputation') {
      data.sort((a, b) =>
        sortConfig.direction === 'asc' ? a.reputation - b.reputation : b.reputation - a.reputation
      );
    } else if (sortConfig.key === 'dataPoints') {
      data.sort((a, b) =>
        sortConfig.direction === 'asc' ? a.dataPoints - b.dataPoints : b.dataPoints - a.dataPoints
      );
    } else if (sortConfig.key === 'lastUpdate') {
      data.sort((a, b) =>
        sortConfig.direction === 'asc' ? a.lastUpdate - b.lastUpdate : b.lastUpdate - a.lastUpdate
      );
    }
    return data;
  }, [filteredProviders, sortConfig]);

  const filterOptions = [
    { id: 'all', label: t('redstone.providers.all'), count: providers?.length || 4 },
    {
      id: 'highReputation',
      label: t('redstone.providers.highReputation'),
      count: providers?.filter((p) => p.reputation >= 0.9).length || 0,
    },
    {
      id: 'mostData',
      label: t('redstone.providers.mostData'),
      count: providers?.filter((p) => p.dataPoints >= 500000).length || 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Row - Inline Layout */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('redstone.providers.dataSources')}
            </p>
            <p className="text-xl font-semibold text-gray-900">{isLoading ? '-' : providerCount}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('redstone.providers.updateFrequency')}
            </p>
            <p className="text-xl font-semibold text-gray-900">~60s</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('redstone.providers.dataQuality')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">99.8%</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('redstone.providers.avgReputation')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {isLoading ? '-' : `${avgReputation}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-4">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilterBy(option.id as FilterOption)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filterBy === option.id
                ? 'text-gray-900 bg-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.id === 'all' && <Filter className="w-3.5 h-3.5" />}
            {option.id === 'highReputation' && <Star className="w-3.5 h-3.5" />}
            {option.id === 'mostData' && <TrendingUp className="w-3.5 h-3.5" />}
            {option.label}
            <span
              className={`text-xs ${filterBy === option.id ? 'text-gray-600' : 'text-gray-400'}`}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Providers Table */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('redstone.providers.title')}
        </h3>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  {t('redstone.providers.rank')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('redstone.providers.provider')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('reputation')}
                >
                  <div className="flex items-center gap-1">
                    {t('redstone.providers.reputation')}
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortConfig.key === 'reputation' && (
                      <span className="text-gray-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('dataPoints')}
                >
                  <div className="flex items-center gap-1">
                    {t('redstone.providers.dataPoints')}
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortConfig.key === 'dataPoints' && (
                      <span className="text-gray-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('lastUpdate')}
                >
                  <div className="flex items-center gap-1">
                    {t('redstone.providers.lastUpdate')}
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortConfig.key === 'lastUpdate' && (
                      <span className="text-gray-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {t('redstone.providers.loading')}
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {t('redstone.providers.noData')}
                  </td>
                </tr>
              ) : (
                tableData.map((provider, index) => (
                  <tr
                    key={provider.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-400 font-medium">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                        <p className="text-xs text-gray-500">ID: {provider.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < Math.floor(provider.reputation * 5)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {(provider.reputation * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {provider.dataPoints.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(provider.lastUpdate).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
