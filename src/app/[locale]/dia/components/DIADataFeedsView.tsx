'use client';

import { useTranslations } from 'next-intl';
import { useDIACustomFeeds, useDIADataTransparency } from '@/hooks/useDIAData';
import { formatDistanceToNow } from 'date-fns';

export function DIADataFeedsView() {
  const t = useTranslations();
  const { customFeeds, isLoading: feedsLoading } = useDIACustomFeeds();
  const { dataTransparency, isLoading: transparencyLoading } = useDIADataTransparency();

  const activeFeeds = customFeeds.filter(feed => feed.status === 'active');
  const avgConfidence = customFeeds.length > 0
    ? customFeeds.reduce((acc, feed) => acc + feed.confidence, 0) / customFeeds.length
    : 0;

  const stats = [
    {
      label: t('dia.dataFeeds.total'),
      value: customFeeds.length,
      color: 'text-gray-900',
    },
    {
      label: t('dia.dataFeeds.active'),
      value: activeFeeds.length,
      color: 'text-emerald-600',
    },
    {
      label: t('dia.dataFeeds.avgConfidence'),
      value: `${(avgConfidence * 100).toFixed(1)}%`,
      color: 'text-indigo-600',
    },
    {
      label: t('dia.dataFeeds.dataSources'),
      value: dataTransparency.length,
      color: 'text-gray-900',
    },
  ];

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
    <div className="space-y-6">
      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
              {feedsLoading || transparencyLoading ? '-' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* 数据馈送表格 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dia.dataFeeds.title')}
          </h3>
        </div>
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
              ) : customFeeds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                customFeeds.map((feed) => (
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

      {/* 数据源透明度 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dia.dataTransparency.title')}
          </h3>
        </div>
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
  );
}
