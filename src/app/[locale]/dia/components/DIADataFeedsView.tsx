'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { useDIACustomFeeds, useDIADataTransparency } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { Database } from 'lucide-react';
import { Shield } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { Clock } from 'lucide-react';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'fiat', label: 'Fiat' },
  { id: 'commodity', label: 'Commodity' },
  { id: 'nft', label: 'NFT' },
  { id: 'custom', label: 'Custom' },
];

export function DIADataFeedsView() {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { customFeeds, isLoading: feedsLoading } = useDIACustomFeeds();
  const { dataTransparency, isLoading: transparencyLoading } = useDIADataTransparency();

  const activeFeeds = customFeeds.filter(feed => feed.status === 'active');
  const avgConfidence = customFeeds.length > 0
    ? customFeeds.reduce((acc, feed) => acc + feed.confidence, 0) / customFeeds.length
    : 0;

  const filteredFeeds = selectedCategory === 'all'
    ? customFeeds
    : customFeeds.filter(feed => feed.assetType === selectedCategory);

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case 'crypto':
        return t('dia.assetTypes.crypto');
      case 'fiat':
        return t('dia.assetTypes.fiat');
      case 'commodity':
        return t('dia.assetTypes.commodity');
      case 'nft':
        return t('dia.assetTypes.nft');
      case 'custom':
        return t('dia.assetTypes.custom');
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500';
      case 'paused':
        return 'bg-amber-500';
      case 'deprecated':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-600';
      case 'paused':
        return 'text-amber-600';
      case 'deprecated':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dia.dataFeeds.total')}</p>
            <p className="text-xl font-semibold text-gray-900">
              {feedsLoading ? '-' : customFeeds.length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dia.dataFeeds.active')}</p>
            <p className="text-xl font-semibold text-emerald-600">
              {feedsLoading ? '-' : activeFeeds.length}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dia.dataFeeds.avgConfidence')}</p>
            <p className="text-xl font-semibold text-gray-900">
              {feedsLoading ? '-' : `${(avgConfidence * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dia.dataFeeds.dataSources')}</p>
            <p className="text-xl font-semibold text-gray-900">
              {transparencyLoading ? '-' : dataTransparency.length}
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
              {category.id === 'all' 
                ? customFeeds.length 
                : customFeeds.filter(f => f.assetType === category.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* 数据馈送表格 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('dia.dataFeeds.title')}
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataFeeds.name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataFeeds.type')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataFeeds.chain')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataFeeds.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataFeeds.confidence')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataFeeds.updateTime')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {feedsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : filteredFeeds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  filteredFeeds.map((feed) => (
                    <tr key={feed.feedId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{feed.name}</p>
                          <p className="text-xs text-gray-500">{feed.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                          {getAssetTypeLabel(feed.assetType)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {feed.chains.slice(0, 3).map((chain) => (
                            <span
                              key={chain}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                            >
                              {chain}
                            </span>
                          ))}
                          {feed.chains.length > 3 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              +{feed.chains.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${getStatusTextColor(feed.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(feed.status)}`} />
                          {feed.status.charAt(0).toUpperCase() + feed.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${feed.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {(feed.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDistanceToNow(feed.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 数据源透明度 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('dia.dataTransparency.title')}
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataTransparency.source')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataTransparency.type')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataTransparency.credibility')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataTransparency.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataTransparency.verification')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dia.dataTransparency.dataPoints')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transparencyLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t('common.loading')}
                  </td>
                  </tr>
                ) : dataTransparency.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  dataTransparency.map((source) => (
                    <tr key={source.sourceId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{source.name}</p>
                        <p className="text-xs text-gray-500">{source.sourceId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {source.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${source.credibilityScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {source.credibilityScore}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${getStatusTextColor(source.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(source.status)}`} />
                          {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {source.verificationMethod}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {source.dataPoints.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('dia.dataFeeds.about') || 'About Data Feeds'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('dia.dataFeeds.confidence') || 'Confidence Score'}:</span>
              {' '}{t('dia.dataFeeds.confidenceDesc') || 'Measures the reliability of data sources based on historical accuracy and verification methods.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('dia.dataFeeds.multiChain') || 'Multi-Chain Support'}:</span>
              {' '}{t('dia.dataFeeds.multiChainDesc') || 'DIA data feeds are available across multiple blockchain networks for maximum interoperability.'}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('dia.dataFeeds.transparency') || 'Data Transparency'}:</span>
              {' '}{t('dia.dataFeeds.transparencyDesc') || 'All data sources are publicly verified with credibility scores and transparent verification methods.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('dia.dataFeeds.customFeeds') || 'Custom Feeds'}:</span>
              {' '}{t('dia.dataFeeds.customFeedsDesc') || 'DIA supports custom data feeds for specific assets, NFT collections, and specialized use cases.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
