'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { Activity, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface DataFeed {
  id: string;
  name: string;
  category: 'crypto' | 'forex' | 'commodities' | 'defi' | 'equities';
  updateFrequency: string;
  deviationThreshold: string;
  status: 'active' | 'paused' | 'deprecated';
  totalRequests: number;
  reliability: number;
}

const dataFeeds: DataFeed[] = [
  {
    id: '1',
    name: 'BTC/USD',
    category: 'crypto',
    updateFrequency: '30s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 1250000,
    reliability: 99.98,
  },
  {
    id: '2',
    name: 'ETH/USD',
    category: 'crypto',
    updateFrequency: '30s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 980000,
    reliability: 99.97,
  },
  {
    id: '3',
    name: 'ATOM/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '1.0%',
    status: 'active',
    totalRequests: 650000,
    reliability: 99.95,
  },
  {
    id: '4',
    name: 'OSMO/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '1.0%',
    status: 'active',
    totalRequests: 420000,
    reliability: 99.94,
  },
  {
    id: '5',
    name: 'USDC/USD',
    category: 'crypto',
    updateFrequency: '300s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 890000,
    reliability: 99.99,
  },
  {
    id: '6',
    name: 'EUR/USD',
    category: 'forex',
    updateFrequency: '300s',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 320000,
    reliability: 99.96,
  },
  {
    id: '7',
    name: 'GBP/USD',
    category: 'forex',
    updateFrequency: '300s',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 180000,
    reliability: 99.95,
  },
  {
    id: '8',
    name: 'Gold/USD',
    category: 'commodities',
    updateFrequency: '600s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 150000,
    reliability: 99.93,
  },
];

const categories = [
  { id: 'all', label: 'All', count: dataFeeds.length },
  { id: 'crypto', label: 'Crypto', count: dataFeeds.filter(f => f.category === 'crypto').length },
  { id: 'forex', label: 'Forex', count: dataFeeds.filter(f => f.category === 'forex').length },
  { id: 'commodities', label: 'Commodities', count: dataFeeds.filter(f => f.category === 'commodities').length },
  { id: 'defi', label: 'DeFi', count: dataFeeds.filter(f => f.category === 'defi').length },
];

export function BandProtocolDataFeedsView() {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredFeeds = selectedCategory === 'all'
    ? dataFeeds
    : dataFeeds.filter(feed => feed.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      crypto: 'bg-blue-100 text-blue-700',
      forex: 'bg-emerald-100 text-emerald-700',
      commodities: 'bg-amber-100 text-amber-700',
      defi: 'bg-purple-100 text-purple-700',
      equities: 'bg-pink-100 text-pink-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bandProtocol.dataFeeds.total')}</p>
            <p className="text-xl font-semibold text-gray-900">{dataFeeds.length}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bandProtocol.dataFeeds.active')}</p>
            <p className="text-xl font-semibold text-emerald-600">
              {dataFeeds.filter(f => f.status === 'active').length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bandProtocol.dataFeeds.totalRequests')}</p>
            <p className="text-xl font-semibold text-gray-900">
              {(dataFeeds.reduce((acc, f) => acc + f.totalRequests, 0) / 1e6).toFixed(1)}M
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bandProtocol.dataFeeds.avgReliability')}</p>
            <p className="text-xl font-semibold text-gray-900">
              {(dataFeeds.reduce((acc, f) => acc + f.reliability, 0) / dataFeeds.length).toFixed(2)}%
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
          {t('bandProtocol.dataFeeds.title')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.dataFeeds.feed')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.dataFeeds.category')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.dataFeeds.updateFreq')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.dataFeeds.deviation')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.dataFeeds.totalRequests')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.dataFeeds.reliability')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.dataFeeds.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFeeds.map((feed) => (
                <tr key={feed.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{feed.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(
                        feed.category
                      )}`}
                    >
                      {feed.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">{feed.updateFrequency}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">{feed.deviationThreshold}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {feed.totalRequests.toLocaleString()}
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
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                      feed.status === 'active' ? 'text-emerald-600' :
                      feed.status === 'paused' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        feed.status === 'active' ? 'bg-emerald-500' :
                        feed.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      {feed.status.charAt(0).toUpperCase() + feed.status.slice(1)}
                    </span>
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
          {t('bandProtocol.dataFeeds.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('bandProtocol.dataFeeds.updateFrequency')}:</span>
              {' '}{t('bandProtocol.dataFeeds.frequencyDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('bandProtocol.dataFeeds.deviationThreshold')}:</span>
              {' '}{t('bandProtocol.dataFeeds.thresholdDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('bandProtocol.dataFeeds.reliability')}:</span>
              {' '}{t('bandProtocol.dataFeeds.reliabilityDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('bandProtocol.dataFeeds.decentralization')}:</span>
              {' '}{t('bandProtocol.dataFeeds.decentralizationDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
