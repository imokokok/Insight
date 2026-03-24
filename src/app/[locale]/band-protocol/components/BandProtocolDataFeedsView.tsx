'use client';

import { useTranslations } from 'next-intl';

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

export function BandProtocolDataFeedsView() {
  const t = useTranslations();

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

  const stats = [
    { label: t('bandProtocol.dataFeeds.totalFeeds'), value: '180+' },
    { label: t('bandProtocol.dataFeeds.activeFeeds'), value: '175' },
    { label: t('bandProtocol.dataFeeds.avgReliability'), value: '99.95%' },
    { label: t('bandProtocol.dataFeeds.avgUpdateFreq'), value: '60s' },
  ];

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('bandProtocol.dataFeeds.availableFeeds')}
          </h3>
        </div>
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
              {dataFeeds.map((feed) => (
                <tr key={feed.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{feed.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(
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
                    {feed.status === 'active' ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                        {t('bandProtocol.dataFeeds.active')}
                      </span>
                    ) : feed.status === 'paused' ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                        {t('bandProtocol.dataFeeds.paused')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                        {t('bandProtocol.dataFeeds.deprecated')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('bandProtocol.dataFeeds.categoryDistribution')}
          </h3>
          <div className="space-y-2">
            {[
              { category: 'crypto', count: 120, percentage: 67 },
              { category: 'forex', count: 35, percentage: 19 },
              { category: 'commodities', count: 15, percentage: 8 },
              { category: 'defi', count: 8, percentage: 4 },
              { category: 'equities', count: 2, percentage: 2 },
            ].map((item) => (
              <div key={item.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 capitalize">{item.category}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('bandProtocol.dataFeeds.updateFrequency')}
          </h3>
          <div className="space-y-3">
            {[
              { freq: '10s', count: 25, label: 'High Frequency' },
              { freq: '30s', count: 45, label: 'Standard' },
              { freq: '60s', count: 60, label: 'Regular' },
              { freq: '300s', count: 35, label: 'Low Frequency' },
              { freq: '600s+', count: 15, label: 'Batch Updates' },
            ].map((item) => (
              <div key={item.freq} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.freq}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
                <span className="text-sm font-medium text-purple-600">{item.count} feeds</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('bandProtocol.dataFeeds.dataQuality')}
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span className="text-sm font-medium text-gray-900">
                  {t('bandProtocol.dataFeeds.multiSource')}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t('bandProtocol.dataFeeds.multiSourceDesc')}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">⚡</span>
                <span className="text-sm font-medium text-gray-900">
                  {t('bandProtocol.dataFeeds.fastFinality')}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t('bandProtocol.dataFeeds.finalityDesc')}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-purple-600">🛡️</span>
                <span className="text-sm font-medium text-gray-900">
                  {t('bandProtocol.dataFeeds.tendermint')}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t('bandProtocol.dataFeeds.tendermintDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
