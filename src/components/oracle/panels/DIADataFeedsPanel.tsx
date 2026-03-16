'use client';

import { useState } from 'react';
import { CustomFeed, DataSourceTransparency } from '@/lib/oracles/dia';
import { useI18n } from '@/lib/i18n/provider';
import { Blockchain } from '@/types/oracle/enums';

interface DIADataFeedsPanelProps {
  feeds: CustomFeed[];
  dataSources: DataSourceTransparency[];
}

type AssetType = 'all' | 'crypto' | 'fiat' | 'nft' | 'commodity';

export function DIADataFeedsPanel({ feeds, dataSources }: DIADataFeedsPanelProps) {
  const { t } = useI18n();
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('all');
  const [selectedChain, setSelectedChain] = useState<Blockchain | 'all'>('all');
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);

  const totalFeeds = feeds.length;
  const activeFeeds = feeds.filter((f) => f.status === 'active').length;
  const cryptoCount = feeds.filter((f) => f.assetType === 'crypto').length;
  const fiatCount = feeds.filter((f) => f.assetType === 'fiat').length;
  const nftCount = feeds.filter((f) => f.assetType === 'nft').length;
  const commodityCount = feeds.filter((f) => f.assetType === 'commodity').length;

  const allChains = Array.from(new Set(feeds.flatMap((f) => f.chains)));

  const filteredFeeds = feeds.filter((feed) => {
    const matchesAssetType = selectedAssetType === 'all' || feed.assetType === selectedAssetType;
    const matchesChain = selectedChain === 'all' || feed.chains.includes(selectedChain);
    return matchesAssetType && matchesChain;
  });

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case 'crypto':
        return t('dia.dataFeeds.assetType.crypto');
      case 'fiat':
        return t('dia.dataFeeds.assetType.fiat');
      case 'nft':
        return t('dia.dataFeeds.assetType.nft');
      case 'commodity':
        return t('dia.dataFeeds.assetType.commodity');
      default:
        return type;
    }
  };

  const getAssetTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'crypto':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'fiat':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'nft':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'commodity':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'deprecated':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('dia.dataFeeds.status.active');
      case 'paused':
        return t('dia.dataFeeds.status.paused');
      case 'deprecated':
        return t('dia.dataFeeds.status.deprecated');
      default:
        return status;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.98) return 'text-green-600';
    if (confidence >= 0.95) return 'text-blue-600';
    if (confidence >= 0.9) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.98) return 'bg-green-50';
    if (confidence >= 0.95) return 'bg-blue-50';
    if (confidence >= 0.9) return 'bg-yellow-50';
    return 'bg-orange-50';
  };

  const formatUpdateFrequency = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getDataSourceName = (sourceId: string) => {
    const source = dataSources.find((s) => s.sourceId === sourceId);
    return source ? source.name : sourceId;
  };

  const toggleExpand = (feedId: string) => {
    setExpandedFeed(expandedFeed === feedId ? null : feedId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">{t('dia.dataFeeds.totalFeeds')}</p>
          <p className="text-2xl font-bold text-indigo-600">{totalFeeds}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">{t('dia.dataFeeds.activeFeeds')}</p>
          <p className="text-2xl font-bold text-green-600">{activeFeeds}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">{t('dia.dataFeeds.crypto')}</p>
          <p className="text-2xl font-bold text-blue-600">{cryptoCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">{t('dia.dataFeeds.fiat')}</p>
          <p className="text-2xl font-bold text-green-600">{fiatCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">{t('dia.dataFeeds.nft')}</p>
          <p className="text-2xl font-bold text-purple-600">{nftCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">{t('dia.dataFeeds.commodity')}</p>
          <p className="text-2xl font-bold text-amber-600">{commodityCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Asset Type Filters */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t('dia.dataFeeds.filterByAssetType')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedAssetType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAssetType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('dia.dataFeeds.all')}
            </button>
            <button
              onClick={() => setSelectedAssetType('crypto')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAssetType === 'crypto'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('dia.dataFeeds.assetType.crypto')}
            </button>
            <button
              onClick={() => setSelectedAssetType('fiat')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAssetType === 'fiat'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('dia.dataFeeds.assetType.fiat')}
            </button>
            <button
              onClick={() => setSelectedAssetType('nft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAssetType === 'nft'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('dia.dataFeeds.assetType.nft')}
            </button>
            <button
              onClick={() => setSelectedAssetType('commodity')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAssetType === 'commodity'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('dia.dataFeeds.assetType.commodity')}
            </button>
          </div>
        </div>

        {/* Chain Filters */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t('dia.dataFeeds.filterByChain')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedChain('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChain === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('dia.dataFeeds.allChains')}
            </button>
            {allChains.map((chain) => (
              <button
                key={chain}
                onClick={() => setSelectedChain(chain)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChain === chain
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {chain}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feeds List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('dia.dataFeeds.title')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('dia.dataFeeds.showingCount', { count: filteredFeeds.length, total: feeds.length })}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredFeeds.map((feed) => (
            <div key={feed.feedId} className="p-6 hover:bg-gray-50 transition-colors">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(feed.feedId)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <span
                      className={`w-3 h-3 rounded-full inline-block ${getStatusColor(feed.status)}`}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{feed.name}</h4>
                    <p className="text-sm text-gray-500">{feed.feedId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getAssetTypeBadgeColor(
                      feed.assetType
                    )}`}
                  >
                    {getAssetTypeLabel(feed.assetType)}
                  </span>

                  <div className="hidden md:flex items-center gap-2">
                    {feed.chains.slice(0, 3).map((chain) => (
                      <span
                        key={chain}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                      >
                        {chain}
                      </span>
                    ))}
                    {feed.chains.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                        +{feed.chains.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="text-gray-500">{t('dia.dataFeeds.updateFrequency')}:</span>{' '}
                    {formatUpdateFrequency(feed.updateFrequency)}
                  </div>

                  <div className={`px-3 py-1 rounded-lg ${getConfidenceBgColor(feed.confidence)}`}>
                    <span className={`font-semibold ${getConfidenceColor(feed.confidence)}`}>
                      {(feed.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <span className="text-sm text-gray-700">{getStatusLabel(feed.status)}</span>

                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedFeed === feed.feedId ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedFeed === feed.feedId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        {t('dia.dataFeeds.description')}
                      </h5>
                      <p className="text-sm text-gray-600">{feed.description}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        {t('dia.dataFeeds.createdAt')}
                      </h5>
                      <p className="text-sm text-gray-600">{formatDate(feed.createdAt)}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        {t('dia.dataFeeds.dataSources')}
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {feed.dataSources.map((source) => (
                          <span
                            key={source}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-lg"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        {t('dia.dataFeeds.supportedChains')}
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {feed.chains.map((chain) => (
                          <span
                            key={chain}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg"
                          >
                            {chain}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFeeds.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">{t('dia.dataFeeds.noFeeds')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
